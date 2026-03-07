'use server';

import { prisma } from '@/lib/prisma';
import { requireRole, requireAuth } from '@/lib/auth-utils';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const createAuditLog = async (
    entityType: string,
    entityId: string,
    action: string,
    performedBy: string,
    previousState?: Record<string, unknown>,
    newState?: Record<string, unknown>
) => {
    await prisma.auditLog.create({
        data: {
            entity_type: entityType,
            entity_id: entityId,
            action,
            performed_by: performedBy,
            previous_state: previousState ? JSON.parse(JSON.stringify(previousState)) : undefined,
            new_state: newState ? JSON.parse(JSON.stringify(newState)) : undefined,
        },
    });
};

const createNotification = async (
    userId: string,
    title: string,
    message: string,
    entityType: string,
    entityId: string
) => {
    await prisma.notification.create({
        data: {
            user_id: userId,
            title,
            message,
            entity_type: entityType,
            entity_id: entityId,
        },
    });
};

async function getNextExpenseNo(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `OEXP-${year}-`;
    const last = await prisma.otherExpense.findFirst({
        where: { expense_no: { startsWith: prefix } },
        orderBy: { expense_no: 'desc' },
    });
    const seq = last ? parseInt(last.expense_no.split('-')[2]) + 1 : 1;
    return `${prefix}${seq.toString().padStart(4, '0')}`;
}

const CreateExpenseSchema = z.object({
    description: z.string().min(1, 'Description is required'),
    amount: z.number().positive('Amount must be positive'),
    buyer_id: z.string().uuid().optional().nullable(),
    order_id: z.string().uuid().optional().nullable(),
    invoice_path: z.string().optional().nullable(),
    payment_details: z.string().min(1, 'Payment details are required'),
});

export async function createOtherExpense(formData: z.infer<typeof CreateExpenseSchema>) {
    const session = await requireAuth();
    const data = CreateExpenseSchema.parse(formData);

    const expenseNo = await getNextExpenseNo();

    const expense = await prisma.otherExpense.create({
        data: {
            expense_no: expenseNo,
            user_id: session.user.id,
            description: data.description,
            amount: data.amount,
            buyer_id: data.buyer_id || null,
            order_id: data.order_id || null,
            invoice_path: data.invoice_path || null,
            payment_details: data.payment_details,
            status: 'PENDING',
        },
    });

    await createAuditLog(
        'OtherExpense',
        expense.id,
        'CREATED',
        session.user.id,
        undefined,
        { expense_no: expenseNo, amount: data.amount }
    );

    // Notify accountants
    const accountants = await prisma.user.findMany({
        where: { role: 'ACCOUNTANT', is_active: true },
    });
    for (const acc of accountants) {
        await createNotification(
            acc.id,
            'New Expense Request',
            `A new other expense request (${expenseNo}) was submitted by ${session.user.name}.`,
            'OtherExpense',
            expense.id
        );
    }

    revalidatePath('/dashboard');
    return { success: true, id: expense.id, expense_no: expenseNo };
}

export async function payOtherExpense(expenseId: string, paymentProofPath: string, notes?: string) {
    const session = await requireRole('ACCOUNTANT');

    const expense = await prisma.otherExpense.findUnique({
        where: { id: expenseId },
    });

    if (!expense) throw new Error('Expense not found');
    if (expense.status !== 'PENDING') {
        throw new Error('Only pending expenses can be paid');
    }

    await prisma.otherExpense.update({
        where: { id: expenseId },
        data: {
            status: 'PAID',
            payment_proof_path: paymentProofPath,
            accountant_notes: notes || null,
            accountant_id: session.user.id,
        },
    });

    await createAuditLog(
        'OtherExpense',
        expenseId,
        'PAID',
        session.user.id,
        { status: 'PENDING' },
        { status: 'PAID', payment_proof_path: paymentProofPath, accountant_notes: notes }
    );

    // Notify requester
    await createNotification(
        expense.user_id,
        'Expense Paid',
        `Your expense request ${expense.expense_no} has been paid. Click to view the payment proof.`,
        'OtherExpense',
        expenseId
    );

    revalidatePath('/dashboard');
    return { success: true };
}

export async function rejectOtherExpense(expenseId: string, reason: string) {
    const session = await requireRole('ACCOUNTANT');

    if (!reason || reason.trim() === '') {
        throw new Error('Rejection reason is required');
    }

    const expense = await prisma.otherExpense.findUnique({
        where: { id: expenseId },
    });

    if (!expense) throw new Error('Expense not found');
    if (expense.status !== 'PENDING') {
        throw new Error('Only pending expenses can be rejected');
    }

    await prisma.otherExpense.update({
        where: { id: expenseId },
        data: {
            status: 'REJECTED',
            accountant_notes: reason,
            accountant_id: session.user.id,
        },
    });

    await createAuditLog(
        'OtherExpense',
        expenseId,
        'REJECTED',
        session.user.id,
        { status: 'PENDING' },
        { status: 'REJECTED', accountant_notes: reason }
    );

    // Notify requester
    await createNotification(
        expense.user_id,
        'Expense Rejected',
        `Your expense request ${expense.expense_no} was rejected. Reason: ${reason}`,
        'OtherExpense',
        expenseId
    );

    revalidatePath('/dashboard');
    return { success: true };
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { buildWorkflowUpdate, triggerNotification } from '@/lib/workflow';


/**
 * POST /api/expenses/[id]/reopen
 * Accountant-only: reopen a rejected/paid expense for correction.
 * Requires mandatory reason. Creates audit log.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ACCOUNTANT') {
        return NextResponse.json({ error: 'Unauthorized — Accountant only' }, { status: 403 });
    }

    const { reason } = await req.json();
    if (!reason?.trim()) {
        return NextResponse.json({ error: 'A reason is required to reopen an expense.' }, { status: 400 });
    }

    const expense = await prisma.otherExpense.findUnique({
        where: { id: params.id },
        include: { requester: true },
    });

    if (!expense) {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const allowedStatuses = ['REJECTED', 'PAID'];
    if (!allowedStatuses.includes(expense.status)) {
        return NextResponse.json(
            { error: `Cannot reopen expense in status: ${expense.status}` },
            { status: 422 }
        );
    }

    const workflow = buildWorkflowUpdate({
        nextActionRole: 'ACCOUNTANT',
        nextActionLabel: 'Review and pay expense',
        blockerCode: 'WAITING_ACCOUNTANT_APPROVAL',
        blockerNote: reason,
        isExitingStage: true,
        enteredStageAt: new Date(),
    });

    await Promise.all([
        prisma.otherExpense.update({
            where: { id: params.id },
            data: {
                status: 'PENDING',
                reopen_reason: reason.trim(),
                ...workflow,
            },
        }),
        prisma.auditLog.create({
            data: {
                entity_type: 'OtherExpense',
                entity_id: params.id,
                action: 'REOPENED',
                performed_by: session.user.id,
                previous_state: { status: expense.status },
                new_state: { status: 'PENDING', reopen_reason: reason },
            },
        }),
    ]);

    await triggerNotification(
        'expense.reopened',
        {
            entityId: params.id,
            entityType: 'OtherExpense',
            ref: expense.expense_no,
            actor: session.user.name ?? 'Accountant',
            note: reason,
        },
        session.user.id
    );

    return NextResponse.json({ success: true });
}

'use server';

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
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

async function getNextPurchaseNo(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PUR-${year}-`;
    const last = await prisma.purchase.findFirst({
        where: { purchase_no: { startsWith: prefix } },
        orderBy: { purchase_no: 'desc' },
    });
    const seq = last ? parseInt(last.purchase_no.split('-')[2]) + 1 : 1;
    return `${prefix}${seq.toString().padStart(4, '0')}`;
}

const PurchaseLineSchema = z.object({
    material_id: z.string().uuid(),
    quantity: z.number().positive(),
    rate: z.number().positive(),
});

const CreatePurchaseSchema = z.object({
    request_id: z.string().uuid(),
    vendor_id: z.string().uuid(),
    invoice_no: z.string().min(1),
    invoice_date: z.string(),
    invoice_amount: z.number().positive(),
    invoice_type_submitted: z.enum(['PROVISIONAL', 'TAX']),
    invoice_file_key: z.string().optional(),
    lines: z.array(PurchaseLineSchema).min(1),
});

export async function createPurchase(formData: z.infer<typeof CreatePurchaseSchema>) {
    const session = await requireRole('RUNNER');
    const data = CreatePurchaseSchema.parse(formData);

    // Verify request exists and is PENDING_PURCHASE
    const request = await prisma.materialRequest.findUnique({
        where: { id: data.request_id },
    });
    if (!request) throw new Error('Material request not found');
    if (request.status !== 'PENDING_PURCHASE') {
        throw new Error('Request is not in PENDING_PURCHASE status');
    }

    const purchaseNo = await getNextPurchaseNo();

    // Create purchase with invoice path
    const invoicePathField =
        data.invoice_type_submitted === 'PROVISIONAL'
            ? { provisional_invoice_path: data.invoice_file_key || null }
            : { tax_invoice_path: data.invoice_file_key || null };

    const purchase = await prisma.purchase.create({
        data: {
            purchase_no: purchaseNo,
            request_id: data.request_id,
            runner_id: session.user.id,
            vendor_id: data.vendor_id,
            invoice_no: data.invoice_no,
            invoice_date: new Date(data.invoice_date),
            invoice_amount: data.invoice_amount,
            invoice_type_submitted: data.invoice_type_submitted,
            ...invoicePathField,
            status: 'INVOICE_SUBMITTED',
            lines: {
                create: data.lines.map((line) => ({
                    material_id: line.material_id,
                    quantity: line.quantity,
                    rate: line.rate,
                    amount: line.quantity * line.rate,
                })),
            },
        },
    });

    // Update request status
    await prisma.materialRequest.update({
        where: { id: data.request_id },
        data: { status: 'INVOICE_SUBMITTED' },
    });

    await createAuditLog(
        'Purchase',
        purchase.id,
        'CREATED',
        session.user.id,
        undefined,
        { purchase_no: purchaseNo, status: 'INVOICE_SUBMITTED', invoice_type: data.invoice_type_submitted }
    );

    // Notify accountants
    const accountants = await prisma.user.findMany({
        where: { role: 'ACCOUNTANT', is_active: true },
    });
    for (const acc of accountants) {
        await createNotification(
            acc.id,
            'Invoice Submitted for Review',
            `Purchase ${purchaseNo} requires financial verification`,
            'Purchase',
            purchase.id
        );
    }

    revalidatePath('/dashboard');
    return { success: true, id: purchase.id, purchase_no: purchaseNo };
}

export async function approvePurchase(purchaseId: string, notes?: string) {
    const session = await requireRole('ACCOUNTANT');

    const purchase = await prisma.purchase.findUnique({
        where: { id: purchaseId },
        include: { request: true },
    });

    if (!purchase) throw new Error('Purchase not found');
    if (purchase.status !== 'INVOICE_SUBMITTED') {
        throw new Error('Purchase is not in INVOICE_SUBMITTED status');
    }

    await prisma.purchase.update({
        where: { id: purchaseId },
        data: {
            status: 'APPROVED',
            accountant_notes: notes || null,
        },
    });

    await prisma.materialRequest.update({
        where: { id: purchase.request_id },
        data: { status: 'APPROVED' },
    });

    await createAuditLog(
        'Purchase',
        purchaseId,
        'APPROVED',
        session.user.id,
        { status: 'INVOICE_SUBMITTED' },
        { status: 'APPROVED', accountant_notes: notes }
    );

    // Notify runner
    await createNotification(
        purchase.runner_id,
        'Purchase Approved',
        `Purchase ${purchase.purchase_no} has been approved`,
        'Purchase',
        purchaseId
    );

    revalidatePath('/dashboard');
    return { success: true };
}

export async function rejectPurchase(purchaseId: string, reason: string) {
    const session = await requireRole('ACCOUNTANT');

    if (!reason) throw new Error('Rejection reason is required');

    const purchase = await prisma.purchase.findUnique({
        where: { id: purchaseId },
        include: { request: true },
    });

    if (!purchase) throw new Error('Purchase not found');
    if (purchase.status !== 'INVOICE_SUBMITTED') {
        throw new Error('Purchase is not in INVOICE_SUBMITTED status');
    }

    await prisma.purchase.update({
        where: { id: purchaseId },
        data: {
            status: 'REJECTED',
            accountant_notes: reason,
        },
    });

    await prisma.materialRequest.update({
        where: { id: purchase.request_id },
        data: { status: 'REJECTED' },
    });

    await createAuditLog(
        'Purchase',
        purchaseId,
        'REJECTED',
        session.user.id,
        { status: 'INVOICE_SUBMITTED' },
        { status: 'REJECTED', reason }
    );

    // Notify runner and manager
    await createNotification(
        purchase.runner_id,
        'Purchase Rejected',
        `Purchase ${purchase.purchase_no} rejected: ${reason}`,
        'Purchase',
        purchaseId
    );

    await createNotification(
        purchase.request.manager_id,
        'Purchase Rejected',
        `Purchase ${purchase.purchase_no} rejected: ${reason}`,
        'Purchase',
        purchaseId
    );

    revalidatePath('/dashboard');
    return { success: true };
}

export async function recordPayment(formData: {
    purchase_id: string;
    payment_date: string;
    payment_method: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
    amount_paid: number;
    reference_id?: string;
    payment_proof_key: string;
    notes?: string;
}) {
    const session = await requireRole('ACCOUNTANT');

    const purchase = await prisma.purchase.findUnique({
        where: { id: formData.purchase_id },
        include: { payments: true },
    });

    if (!purchase) throw new Error('Purchase not found');
    if (!['APPROVED', 'PARTIALLY_PAID'].includes(purchase.status)) {
        throw new Error('Purchase is not in a payable status');
    }

    const payment = await prisma.payment.create({
        data: {
            purchase_id: formData.purchase_id,
            accountant_id: session.user.id,
            payment_date: new Date(formData.payment_date),
            payment_method: formData.payment_method,
            amount_paid: formData.amount_paid,
            reference_id: formData.reference_id || null,
            payment_proof_path: formData.payment_proof_key,
            notes: formData.notes || null,
        },
    });

    // Calculate total paid
    const totalPaid = purchase.payments.reduce(
        (sum, p) => sum + Number(p.amount_paid),
        0
    ) + formData.amount_paid;

    const invoiceAmount = Number(purchase.invoice_amount);

    let newStatus: string;
    if (totalPaid >= invoiceAmount) {
        if (purchase.invoice_type_submitted === 'PROVISIONAL') {
            newStatus = 'PAID_PENDING_TAX_INVOICE';
        } else {
            newStatus = 'PAID';
        }
    } else {
        newStatus = 'PARTIALLY_PAID';
    }

    await prisma.purchase.update({
        where: { id: formData.purchase_id },
        data: { status: newStatus as 'PAID' | 'PARTIALLY_PAID' | 'PAID_PENDING_TAX_INVOICE' },
    });

    await prisma.materialRequest.update({
        where: { id: purchase.request_id },
        data: { status: newStatus as 'PAID' | 'PARTIALLY_PAID' | 'PAID_PENDING_TAX_INVOICE' },
    });

    // Create vendor confirmation record
    if (newStatus === 'PAID' || newStatus === 'PAID_PENDING_TAX_INVOICE') {
        const existingConf = await prisma.vendorConfirmation.findUnique({
            where: { purchase_id: formData.purchase_id },
        });
        if (!existingConf) {
            await prisma.vendorConfirmation.create({
                data: {
                    purchase_id: formData.purchase_id,
                    runner_id: purchase.runner_id,
                    status: 'NOT_CONFIRMED',
                },
            });
        }
    }

    await createAuditLog(
        'Payment',
        payment.id,
        'PAYMENT_RECORDED',
        session.user.id,
        { status: purchase.status },
        { status: newStatus, amount_paid: formData.amount_paid, total_paid: totalPaid }
    );

    // Notify runner
    await createNotification(
        purchase.runner_id,
        'Payment Recorded',
        `Payment of INR ${formData.amount_paid} recorded for ${purchase.purchase_no}. Show proof to vendor.`,
        'Purchase',
        formData.purchase_id
    );

    revalidatePath('/dashboard');
    return { success: true };
}

export async function updateVendorConfirmation(
    purchaseId: string,
    data: {
        shown_to_vendor: boolean;
        vendor_confirmed?: boolean;
        runner_remark?: string;
    }
) {
    const session = await requireRole('RUNNER');

    const confirmation = await prisma.vendorConfirmation.findUnique({
        where: { purchase_id: purchaseId },
    });

    if (!confirmation) throw new Error('Vendor confirmation record not found');
    if (confirmation.runner_id !== session.user.id) {
        throw new Error('Only the assigned runner can update confirmation');
    }

    const updateData: Record<string, unknown> = {};
    let newStatus = confirmation.status;

    if (data.shown_to_vendor) {
        updateData.shown_to_vendor_at = new Date();
        newStatus = 'SHOWN_TO_VENDOR';
    }

    if (data.vendor_confirmed) {
        updateData.vendor_confirmed_at = new Date();
        newStatus = 'VENDOR_CONFIRMED';
    }

    if (data.runner_remark) {
        updateData.runner_remark = data.runner_remark;
    }

    updateData.status = newStatus;

    await prisma.vendorConfirmation.update({
        where: { purchase_id: purchaseId },
        data: updateData as { status: 'SHOWN_TO_VENDOR' | 'VENDOR_CONFIRMED'; shown_to_vendor_at?: Date; vendor_confirmed_at?: Date; runner_remark?: string },
    });

    // If vendor confirmed and it was a TAX invoice, auto-complete
    if (data.vendor_confirmed) {
        const purchase = await prisma.purchase.findUnique({
            where: { id: purchaseId },
        });
        if (purchase && purchase.invoice_type_submitted === 'TAX') {
            await prisma.purchase.update({
                where: { id: purchaseId },
                data: { status: 'COMPLETED' },
            });
            await prisma.materialRequest.update({
                where: { id: purchase.request_id },
                data: { status: 'COMPLETED' },
            });
        }
    }

    await createAuditLog(
        'VendorConfirmation',
        confirmation.id,
        'CONFIRMATION_UPDATED',
        session.user.id,
        { status: confirmation.status },
        { status: newStatus }
    );

    revalidatePath('/dashboard');
    return { success: true };
}

export async function uploadTaxInvoice(purchaseId: string, taxInvoiceKey: string) {
    const session = await requireRole('RUNNER');

    const purchase = await prisma.purchase.findUnique({
        where: { id: purchaseId },
    });

    if (!purchase) throw new Error('Purchase not found');
    if (purchase.runner_id !== session.user.id) {
        throw new Error('Only the assigned runner can upload tax invoice');
    }
    if (purchase.invoice_type_submitted !== 'PROVISIONAL') {
        throw new Error('Tax invoice upload only required for provisional invoices');
    }
    if (!['PAID_PENDING_TAX_INVOICE', 'PAID'].includes(purchase.status)) {
        throw new Error('Purchase must be paid before uploading tax invoice');
    }

    await prisma.purchase.update({
        where: { id: purchaseId },
        data: {
            tax_invoice_path: taxInvoiceKey,
            status: 'COMPLETED',
        },
    });

    await prisma.materialRequest.update({
        where: { id: purchase.request_id },
        data: { status: 'COMPLETED' },
    });

    await createAuditLog(
        'Purchase',
        purchaseId,
        'TAX_INVOICE_UPLOADED',
        session.user.id,
        { status: purchase.status },
        { status: 'COMPLETED', tax_invoice_path: taxInvoiceKey }
    );

    // Notify accountants
    const accountants = await prisma.user.findMany({
        where: { role: 'ACCOUNTANT', is_active: true },
    });
    for (const acc of accountants) {
        await createNotification(
            acc.id,
            'Tax Invoice Received',
            `Final GST tax invoice uploaded for ${purchase.purchase_no}`,
            'Purchase',
            purchaseId
        );
    }

    revalidatePath('/dashboard');
    return { success: true };
}

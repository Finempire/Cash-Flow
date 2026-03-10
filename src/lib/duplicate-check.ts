/**
 * Duplicate detection library for V2.
 * Returns structured warnings (not hard blocks) for potential duplicates.
 */

import { prisma } from '@/lib/prisma';

export type DuplicateWarning = {
    type: string;
    message: string;
    existingId?: string;
    existingRef?: string;
};

// ─── Invoice Duplicate Check ──────────────────────────────────────────────────

/**
 * Check if a purchase with the same vendor + invoice_no already exists.
 * Returns a warning if found.
 */
export async function checkDuplicateInvoice(
    vendorId: string,
    invoiceNo: string,
    excludePurchaseId?: string
): Promise<DuplicateWarning | null> {
    const existing = await prisma.purchase.findFirst({
        where: {
            vendor_id: vendorId,
            invoice_no: invoiceNo,
            ...(excludePurchaseId && { id: { not: excludePurchaseId } }),
        },
        select: { id: true, purchase_no: true },
    });

    if (!existing) return null;

    return {
        type: 'DUPLICATE_INVOICE',
        message: `A purchase with this invoice number already exists for this vendor (${existing.purchase_no}). Please verify before submitting.`,
        existingId: existing.id,
        existingRef: existing.purchase_no,
    };
}

// ─── Expense Duplicate Check ──────────────────────────────────────────────────

/**
 * Check for a duplicate expense submission:
 * same category + amount + date + order.
 */
export async function checkDuplicateExpense(opts: {
    category?: string;
    amount: number;
    orderId?: string;
    dateFrom: Date;
    dateTo: Date;
    excludeExpenseId?: string;
}): Promise<DuplicateWarning | null> {
    if (!opts.category && !opts.orderId) return null;

    const existing = await prisma.otherExpense.findFirst({
        where: {
            ...(opts.category && { category: opts.category }),
            amount: opts.amount,
            ...(opts.orderId && { order_id: opts.orderId }),
            created_at: { gte: opts.dateFrom, lte: opts.dateTo },
            ...(opts.excludeExpenseId && { id: { not: opts.excludeExpenseId } }),
        },
        select: { id: true, expense_no: true },
    });

    if (!existing) return null;

    return {
        type: 'DUPLICATE_EXPENSE',
        message: `A similar expense (${existing.expense_no}) was submitted recently with the same category, amount, and order. Please verify.`,
        existingId: existing.id,
        existingRef: existing.expense_no,
    };
}

// ─── Style Code Duplicate Check ───────────────────────────────────────────────

export async function checkDuplicateStyleCode(
    styleCode: string,
    excludeStyleId?: string
): Promise<DuplicateWarning | null> {
    const existing = await prisma.style.findFirst({
        where: {
            style_code: styleCode,
            ...(excludeStyleId && { id: { not: excludeStyleId } }),
        },
        select: { id: true, style_code: true, style_name: true },
    });

    if (!existing) return null;

    return {
        type: 'DUPLICATE_STYLE_CODE',
        message: `Style code "${styleCode}" already exists (${existing.style_name}). Please use a unique style code.`,
        existingId: existing.id,
        existingRef: existing.style_code,
    };
}

// ─── Buyer/Vendor Name Duplicate Check ───────────────────────────────────────

export async function checkDuplicateName(
    name: string,
    type: 'buyer' | 'vendor',
    excludeId?: string
): Promise<DuplicateWarning | null> {
    const normalizedName = name.trim().toLowerCase();

    if (type === 'buyer') {
        const existing = await prisma.buyer.findFirst({
            where: {
                name: { equals: normalizedName, mode: 'insensitive' },
                ...(excludeId && { id: { not: excludeId } }),
            },
            select: { id: true, name: true },
        });
        if (!existing) return null;
        return {
            type: 'DUPLICATE_BUYER',
            message: `A buyer named "${existing.name}" already exists. Please verify.`,
            existingId: existing.id,
            existingRef: existing.name,
        };
    }

    const existing = await prisma.vendor.findFirst({
        where: {
            name: { equals: normalizedName, mode: 'insensitive' },
            ...(excludeId && { id: { not: excludeId } }),
        },
        select: { id: true, name: true },
    });
    if (!existing) return null;
    return {
        type: 'DUPLICATE_VENDOR',
        message: `A vendor named "${existing.name}" already exists. Please verify before creating a new entry.`,
        existingId: existing.id,
        existingRef: existing.name,
    };
}

// ─── Run All Checks ──────────────────────────────────────────────────────────

/** Run multiple duplicate checks in parallel and return all warnings. */
export async function runDuplicateChecks(
    checks: Promise<DuplicateWarning | null>[]
): Promise<DuplicateWarning[]> {
    const results = await Promise.all(checks);
    return results.filter((r): r is DuplicateWarning => r !== null);
}

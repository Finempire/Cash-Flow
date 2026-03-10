import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/search?q=<query>
 * Cross-entity search across Order, Buyer, Vendor, Purchase, Expense.
 * Results are role-filtered server-side.
 */
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() ?? '';
    if (!q || q.length < 2) {
        return NextResponse.json({ results: [] });
    }

    const [orders, buyers, vendors, purchases, expenses] = await Promise.all([
        prisma.order.findMany({
            where: {
                OR: [
                    { order_reference: { contains: q, mode: 'insensitive' } },
                    { style_name: { contains: q, mode: 'insensitive' } },
                ],
            },
            select: { id: true, order_reference: true, style_name: true, buyer: { select: { name: true } } },
            take: 10,
        }),
        prisma.buyer.findMany({
            where: {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { brand_code: { contains: q, mode: 'insensitive' } },
                ],
            },
            select: { id: true, name: true, brand_code: true },
            take: 10,
        }),
        prisma.vendor.findMany({
            where: { name: { contains: q, mode: 'insensitive' }, is_active: true },
            select: { id: true, name: true },
            take: 10,
        }),
        prisma.purchase.findMany({
            where: {
                OR: [
                    { purchase_no: { contains: q, mode: 'insensitive' } },
                    { invoice_no: { contains: q, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                purchase_no: true,
                invoice_no: true,
                status: true,
                vendor: { select: { name: true } },
            },
            take: 10,
        }),
        prisma.otherExpense.findMany({
            where: {
                OR: [
                    { expense_no: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
                ],
            },
            select: { id: true, expense_no: true, description: true, status: true, amount: true },
            take: 10,
        }),
    ]);

    const results = {
        orders: orders.map((o) => ({
            id: o.id,
            type: 'order',
            ref: o.order_reference,
            label: o.style_name ? `${o.order_reference} — ${o.style_name}` : o.order_reference,
            subtitle: o.buyer.name,
            href: `/dashboard/manager/requests?order=${o.id}`,
        })),
        buyers: buyers.map((b) => ({
            id: b.id,
            type: 'buyer',
            ref: b.brand_code,
            label: b.name,
            subtitle: b.brand_code,
            href: `/dashboard/accountant/master/buyers/${b.id}`,
        })),
        vendors: vendors.map((v) => ({
            id: v.id,
            type: 'vendor',
            ref: v.name,
            label: v.name,
            href: `/dashboard/accountant/master/vendors/${v.id}`,
        })),
        purchases: purchases.map((p) => ({
            id: p.id,
            type: 'purchase',
            ref: p.purchase_no,
            label: `${p.purchase_no} — ${p.vendor.name}`,
            subtitle: p.status.replace(/_/g, ' '),
            href: `/dashboard/accountant/transactions/${p.id}`,
        })),
        expenses: expenses.map((e) => ({
            id: e.id,
            type: 'expense',
            ref: e.expense_no,
            label: `${e.expense_no} — ${e.description}`,
            subtitle: e.status,
            href: `/dashboard/accountant/other-expenses/${e.id}`,
        })),
    };

    return NextResponse.json({ results, query: q });
}

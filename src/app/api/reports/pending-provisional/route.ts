import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/reports/pending-provisional
 * Reports purchases with provisional invoices awaiting final tax invoice.
 * Role-gated: ACCOUNTANT only.
 */
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ACCOUNTANT') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const skip = (page - 1) * limit;

    const purchases = await prisma.purchase.findMany({
        where: {
            invoice_type_submitted: 'PROVISIONAL',
            tax_invoice_path: null,
            status: { in: ['PAID', 'PAID_PENDING_TAX_INVOICE', 'PARTIALLY_PAID'] },
        },
        include: {
            vendor: { select: { id: true, name: true } },
            runner: { select: { id: true, name: true } },
            request: {
                include: {
                    buyer: { select: { name: true } },
                    order: { select: { order_reference: true } },
                },
            },
        },
        orderBy: { invoice_date: 'asc' },
        skip,
        take: limit,
    });

    const now = Date.now();

    const rows = purchases.map((p) => {
        const daysPending = Math.floor(
            (now - p.invoice_date.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
            id: p.id,
            purchase_no: p.purchase_no,
            vendor: p.vendor.name,
            buyer: p.request.buyer.name,
            order: p.request.order.order_reference,
            invoice_no: p.invoice_no,
            invoice_date: p.invoice_date.toISOString(),
            runner: p.runner.name,
            status: p.status,
            days_pending_tax_invoice: daysPending,
            sla_breached: p.sla_breached,
        };
    });

    const total = await prisma.purchase.count({
        where: {
            invoice_type_submitted: 'PROVISIONAL',
            tax_invoice_path: null,
            status: { in: ['PAID', 'PAID_PENDING_TAX_INVOICE', 'PARTIALLY_PAID'] },
        },
    });

    return NextResponse.json({ rows, total, page, limit });
}

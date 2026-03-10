import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/reports/audit-exception
 * Returns anomalous records: reopened, rejected, overdue, SLA-breached.
 * Role-gated: ACCOUNTANT only.
 */
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ACCOUNTANT') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') ?? 'all';
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const skip = (page - 1) * limit;

    const includeVendorRunner = {
        vendor: { select: { name: true } },
        runner: { select: { name: true } },
    };

    const includeRequester = {
        requester: { select: { name: true } },
    };

    // ── Reopened Purchases
    const reopenedPurchases = (type === 'all' || type === 'reopened')
        ? await prisma.purchase.findMany({
            where: { reopen_reason: { not: null } },
            include: includeVendorRunner,
            orderBy: { updated_at: 'desc' },
            skip, take: limit,
        })
        : [];

    // ── Rejected Purchases
    const rejectedPurchases = (type === 'all' || type === 'rejected')
        ? await prisma.purchase.findMany({
            where: { status: 'REJECTED' },
            include: includeVendorRunner,
            orderBy: { updated_at: 'desc' },
            skip, take: limit,
        })
        : [];

    // ── Overdue Purchases
    const overduePurchases = (type === 'all' || type === 'overdue')
        ? await prisma.purchase.findMany({
            where: { overdue_flag: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
            include: includeVendorRunner,
            orderBy: { created_at: 'asc' },
            skip, take: limit,
        })
        : [];

    // ── SLA Breached Purchases
    const slaBreachedPurchases = (type === 'all' || type === 'sla')
        ? await prisma.purchase.findMany({
            where: { sla_breached: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
            include: includeVendorRunner,
            orderBy: { created_at: 'asc' },
            skip, take: limit,
        })
        : [];

    // ── Reopened Expenses
    const reopenedExpenses = (type === 'all' || type === 'reopened')
        ? await prisma.otherExpense.findMany({
            where: { reopen_reason: { not: null } },
            include: includeRequester,
            orderBy: { updated_at: 'desc' },
            skip, take: limit,
        })
        : [];

    return NextResponse.json({
        reopenedPurchases: reopenedPurchases.map((p) => ({
            id: p.id,
            type: 'Purchase',
            ref: p.purchase_no,
            vendor: p.vendor.name,
            runner: p.runner.name,
            status: p.status,
            reopen_reason: p.reopen_reason,
            updated_at: p.updated_at.toISOString(),
        })),
        rejectedPurchases: rejectedPurchases.map((p) => ({
            id: p.id,
            type: 'Purchase',
            ref: p.purchase_no,
            vendor: p.vendor.name,
            runner: p.runner.name,
            status: p.status,
            notes: p.accountant_notes,
            updated_at: p.updated_at.toISOString(),
        })),
        overduePurchases: overduePurchases.map((p) => ({
            id: p.id,
            type: 'Purchase',
            ref: p.purchase_no,
            vendor: p.vendor.name,
            status: p.status,
            pending_since: p.pending_since_at?.toISOString(),
            overdue_reason: p.overdue_reason,
        })),
        slaBreachedPurchases: slaBreachedPurchases.map((p) => ({
            id: p.id,
            type: 'Purchase',
            ref: p.purchase_no,
            vendor: p.vendor.name,
            status: p.status,
            sla_due_at: p.sla_due_at?.toISOString(),
        })),
        reopenedExpenses: reopenedExpenses.map((e) => ({
            id: e.id,
            type: 'OtherExpense',
            ref: e.expense_no,
            requester: e.requester.name,
            status: e.status,
            reopen_reason: e.reopen_reason,
            updated_at: e.updated_at.toISOString(),
        })),
    });
}

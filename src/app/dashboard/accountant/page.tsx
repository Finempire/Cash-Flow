import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { formatCurrency } from '@/lib/utils';
import KPICard from '@/components/ui/KPICard';
import Link from 'next/link';
import ActionInbox, { ActionInboxItem } from '@/components/ui/ActionInbox';
import ExceptionFlag from '@/components/ui/ExceptionFlag';

export default async function AccountantDashboard() {
    await requireRole('ACCOUNTANT');

    // 1. Fetch data for KPIs
    const pendingReview = await prisma.purchase.count({
        where: { status: 'INVOICE_SUBMITTED' },
    });
    const pendingPayment = await prisma.purchase.count({
        where: { status: 'APPROVED' },
    });
    const pendingTaxInvoicesCount = await prisma.purchase.count({
        where: {
            invoice_type_submitted: 'PROVISIONAL',
            tax_invoice_path: null,
            status: { in: ['PAID', 'PAID_PENDING_TAX_INVOICE'] },
        },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todayPayments = await prisma.payment.aggregate({
        where: { payment_date: { gte: todayStart, lte: todayEnd } },
        _sum: { amount_paid: true },
        _count: true,
    });

    // 2. Fetch data for ActionInbox
    
    // My Pending: Purchases waiting for accountant review or payment
    const myPendingPurchases = await prisma.purchase.findMany({
        where: { status: { in: ['INVOICE_SUBMITTED', 'APPROVED'] } },
        include: { vendor: true, runner: true },
        orderBy: { pending_since_at: 'asc' }, // oldest first
        take: 50,
    });

    const myPending: ActionInboxItem[] = myPendingPurchases.map((p) => {
        const isPayment = p.status === 'APPROVED';
        return {
            id: p.id,
            ref: p.purchase_no || 'PUR-UNKNOWN',
            label: isPayment ? `Awaiting Payment — ${formatCurrency(p.invoice_amount)} to ${p.vendor?.name}` : `Verify Invoice — ${formatCurrency(p.invoice_amount)} from ${p.vendor?.name}`,
            entityType: 'PURCHASE',
            href: isPayment ? '/dashboard/accountant/payments' : `/dashboard/accountant/purchases-review`,
            pendingSince: p.pending_since_at ? new Date(p.pending_since_at).toLocaleDateString() : undefined,
            agingDays: p.pending_since_at ? Math.floor((Date.now() - p.pending_since_at.getTime()) / (1000 * 60 * 60 * 24)) : 0,
        };
    });

    // Waiting on Others: Purchases pending runner action or manager action
    const waitingOnOthersData = await prisma.purchase.findMany({
        where: { status: { notIn: ['INVOICE_SUBMITTED', 'APPROVED', 'COMPLETED'] } },
        include: { runner: true, request: true },
        orderBy: { updated_at: 'desc' },
        take: 30,
    });

    const waitingOnOthers: ActionInboxItem[] = waitingOnOthersData.map(p => ({
         id: p.id,
         ref: p.purchase_no || 'PUR',
         label: `Waiting on ${p.next_action_role || 'Runner'} (${p.status})`,
         entityType: 'PURCHASE',
         href: `/dashboard/accountant/transactions/${p.id}`,
    }));

    // Blocked: Items with blocker_code
    const blockedData = await prisma.purchase.findMany({
        where: { blocker_code: { not: null } },
        include: { vendor: true },
        take: 20,
    });

    const blocked: ActionInboxItem[] = blockedData.map(p => ({
        id: p.id,
        ref: p.purchase_no || 'PUR',
        label: p.blocker_note || `Blocked: ${p.blocker_code}`,
        entityType: 'PURCHASE',
        href: `/dashboard/accountant/transactions/${p.id}`,
        blockerLabel: p.blocker_code || 'BLOCKED',
    }));

    // Overdue: Items where overdue_flag is true or aging > 3 days
    const overdueData = await prisma.purchase.findMany({
        where: { overdue_flag: true },
        include: { vendor: true },
        take: 20,
    });

    const overdue: ActionInboxItem[] = overdueData.map(p => ({
        id: p.id,
        ref: p.purchase_no || 'PUR',
        label: p.overdue_reason || 'Action overdue',
        entityType: 'PURCHASE',
        href: `/dashboard/accountant/transactions/${p.id}`,
        agingDays: p.pending_since_at ? Math.floor((Date.now() - p.pending_since_at.getTime()) / (1000 * 60 * 60 * 24)) : 0,
    }));

    // Recently Updated
    const recentPurchases = await prisma.purchase.findMany({
        orderBy: { updated_at: 'desc' },
        include: { vendor: true },
        take: 15,
    });

    const recentlyUpdated: ActionInboxItem[] = recentPurchases.map(p => ({
        id: p.id,
        ref: p.purchase_no || 'PUR',
        label: `Status: ${p.status} - ${p.vendor?.name || 'Unknown Vendor'}`,
        entityType: 'PURCHASE',
        href: `/dashboard/accountant/transactions/${p.id}`,
        pendingSince: new Date(p.updated_at).toLocaleString(),
    }));

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-bold text-gray-900">
                Accountant Dashboard (V2)
            </h1>

            {/* KPI Summary Block */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard
                    title="Action Required"
                    value={myPending.length}
                    subtitle="Reviews & Payments"
                />
                <KPICard
                    title="Pending Tax Invoices"
                    value={pendingTaxInvoicesCount}
                    subtitle="From runners"
                />
                <KPICard
                    title="Blocked Issues"
                    value={blocked.length}
                    subtitle="Requires attention"
                />
                <KPICard
                    title="Today Disbursed"
                    value={formatCurrency(Number(todayPayments._sum.amount_paid || 0))}
                    subtitle={`${todayPayments._count} transaction(s)`}
                />
            </div>

            {/* Exceptions & Alerts */}
            {pendingTaxInvoicesCount > 0 && (
                <div className="card p-4 border-l-4 border-l-orange-500 bg-orange-50/50">
                    <div className="flex items-start gap-4">
                        <ExceptionFlag flags={['PENDING_TAX_INVOICE']} />
                        <div>
                            <p className="text-sm font-medium text-orange-900">
                                {pendingTaxInvoicesCount} purchase(s) require final GST tax invoices.
                            </p>
                            <p className="text-xs text-orange-700 mt-1">Runners must upload final invoices to close these transactions.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Action Inbox */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ActionInbox
                        className="h-full"
                        myPending={myPending}
                        waitingOnOthers={waitingOnOthers}
                        blocked={blocked}
                        overdue={overdue}
                        recentlyUpdated={recentlyUpdated}
                    />
                </div>

                {/* Quick Actions / Shortcuts */}
                <div className="space-y-4">
                    <div className="card">
                        <div className="card-header pb-3 border-b border-gray-100">
                            <h2 className="text-sm font-semibold text-gray-800">Quick Actions</h2>
                        </div>
                        <div className="p-2 flex flex-col gap-1">
                            <Link href="/dashboard/accountant/purchases-review" className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded font-medium">
                                Review Purchases ({pendingReview})
                            </Link>
                            <Link href="/dashboard/accountant/payments" className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded font-medium">
                                Process Payments ({pendingPayment})
                            </Link>
                            <Link href="/dashboard/accountant/master/vendors" className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded font-medium">
                                Manage Vendors
                            </Link>
                            <hr className="my-2 border-gray-100" />
                            <Link href="/dashboard/accountant/reports" className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded font-medium flex justify-between">
                                Go to Reports <span>→</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

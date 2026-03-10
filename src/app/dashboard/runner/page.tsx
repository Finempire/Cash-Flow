import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { formatCurrency } from '@/lib/utils';
import KPICard from '@/components/ui/KPICard';
import Link from 'next/link';
import ActionInbox, { ActionInboxItem } from '@/components/ui/ActionInbox';
import ExceptionFlag from '@/components/ui/ExceptionFlag';

export default async function RunnerDashboard() {
    const session = await requireRole('RUNNER');
    const runnerId = session.user.id;

    // --- KPIs ---
    const pendingRequestsCount = await prisma.materialRequest.count({
        where: { status: 'PENDING_PURCHASE' },
    });

    const pendingConfirmationsCount = await prisma.vendorConfirmation.count({
        where: { runner_id: runnerId, status: 'NOT_CONFIRMED' },
    });

    const pendingTaxInvoicesCount = await prisma.purchase.count({
        where: {
            runner_id: runnerId,
            invoice_type_submitted: 'PROVISIONAL',
            tax_invoice_path: null,
            status: { in: ['PAID', 'PAID_PENDING_TAX_INVOICE'] },
        },
    });

    const totalPurchases = await prisma.purchase.count({
        where: { runner_id: runnerId },
    });

    // --- ActionInbox Data ---
    
    // My Pending:
    const pendingRequests = await prisma.materialRequest.findMany({
        where: { status: 'PENDING_PURCHASE' },
        include: { buyer: true },
        take: 15,
    });

    const pendingTaxInvoices = await prisma.purchase.findMany({
        where: {
            runner_id: runnerId,
            invoice_type_submitted: 'PROVISIONAL',
            tax_invoice_path: null,
            status: { in: ['PAID', 'PAID_PENDING_TAX_INVOICE'] },
        },
        include: { vendor: true },
        take: 15,
    });

    const pendingConfirmations = await prisma.vendorConfirmation.findMany({
        where: { runner_id: runnerId, status: 'NOT_CONFIRMED' },
        include: { purchase: { include: { vendor: true } } },
        take: 15,
    });

    const myPending: ActionInboxItem[] = [
        ...pendingTaxInvoices.map(p => ({
            id: p.id,
            ref: p.purchase_no,
            label: `Upload Final Tax Invoice — ${p.vendor.name}`,
            entityType: 'PURCHASE',
            href: `/dashboard/runner/purchases/${p.id}`,
            pendingSince: p.updated_at.toLocaleDateString(),
        })),
        ...pendingConfirmations.map(c => ({
            id: c.id,
            ref: c.purchase.purchase_no,
            label: `Get Vendor Confirmation — ${c.purchase.vendor.name}`,
            entityType: 'CONFIRMATION',
            href: `/dashboard/runner/purchases/${c.purchase_id}`,
        })),
        ...pendingRequests.map(r => ({
            id: r.id,
            ref: r.request_no,
            label: `Pick up requested items for ${r.buyer.name}`,
            entityType: 'REQUEST',
            href: `/dashboard/runner/purchases/new?requestId=${r.id}`,
            pendingSince: r.created_at.toLocaleDateString(),
        })),
    ];

    // Waiting on Others: Purchases submitted to Accountant
    const waitingPurchases = await prisma.purchase.findMany({
        where: { runner_id: runnerId, status: { in: ['INVOICE_SUBMITTED', 'APPROVED', 'PARTIALLY_PAID'] } },
        include: { vendor: true, request: { include: { buyer: true } } },
        orderBy: { updated_at: 'desc' },
        take: 20,
    });

    const waitingOnOthers: ActionInboxItem[] = waitingPurchases.map(p => ({
        id: p.id,
        ref: p.purchase_no,
        label: `Waiting on ${p.next_action_role || 'Accountant'} (${p.status})`,
        entityType: 'PURCHASE',
        href: `/dashboard/runner/purchases/${p.id}`,
        pendingSince: p.pending_since_at ? new Date(p.pending_since_at).toLocaleDateString() : undefined,
    }));

    // Blocked
    const blockedPurchases = await prisma.purchase.findMany({
        where: { runner_id: runnerId, blocker_code: { not: null } },
        include: { vendor: true },
        take: 20,
    });

    const blocked: ActionInboxItem[] = blockedPurchases.map(p => ({
        id: p.id,
        ref: p.purchase_no,
        label: p.blocker_note || `Blocked: ${p.blocker_code}`,
        entityType: 'PURCHASE',
        href: `/dashboard/runner/purchases/${p.id}`,
        blockerLabel: p.blocker_code || 'BLOCKED',
    }));

    // Overdue
    const overduePurchases = await prisma.purchase.findMany({
        where: { runner_id: runnerId, overdue_flag: true },
        include: { vendor: true },
        take: 20,
    });

    const overdue: ActionInboxItem[] = overduePurchases.map(p => ({
        id: p.id,
        ref: p.purchase_no,
        label: p.overdue_reason || 'SLA breached',
        entityType: 'PURCHASE',
        href: `/dashboard/runner/purchases/${p.id}`,
        agingDays: p.pending_since_at ? Math.floor((Date.now() - p.pending_since_at.getTime()) / (1000 * 60 * 60 * 24)) : 0,
    }));

    // Recent
    const recentPurchases = await prisma.purchase.findMany({
        where: { runner_id: runnerId },
        orderBy: { updated_at: 'desc' },
        include: { vendor: true },
        take: 15,
    });

    const recentlyUpdated: ActionInboxItem[] = recentPurchases.map(p => ({
        id: p.id,
        ref: p.purchase_no,
        label: `Status: ${p.status} — ${p.vendor.name}`,
        entityType: 'PURCHASE',
        href: `/dashboard/runner/purchases/${p.id}`,
        pendingSince: new Date(p.updated_at).toLocaleString(),
    }));

    // Mobile Top Task (First urgent pending item)
    const urgentTask = myPending.length > 0 ? myPending[0] : null;

    return (
        <div className="space-y-6 pb-20"> {/* pb-20 for sticky bottom nav space */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900">
                    Runner Dashboard (V2)
                </h1>
            </div>

            {/* Mobile-first Urgent Task Card */}
            {urgentTask && (
                <div className="card bg-blue-50 border-blue-200 lg:hidden shadow-sm">
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
                            <h2 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Up Next</h2>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm mb-1">{urgentTask.label}</p>
                        <p className="text-xs text-gray-600 mb-4">{urgentTask.ref} ({urgentTask.entityType})</p>
                        <Link href={urgentTask.href} className="btn-primary w-full text-center py-2.5">
                            Action Now
                        </Link>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard title="My Active Tasks" value={pendingTaxInvoicesCount + pendingConfirmationsCount} subtitle="Tax invs & confirms" />
                <KPICard title="Pending Requests" value={pendingRequestsCount} subtitle="Available to pick up" />
                <KPICard title="Total Purchases" value={totalPurchases} subtitle="Lifetime" />
                <KPICard title="Blocked" value={blocked.length} subtitle="Requires my attention" />
            </div>

            {(pendingConfirmationsCount > 0 || pendingTaxInvoicesCount > 0) && (
                <div className="card p-4 border-l-4 border-l-amber-500 bg-amber-50/50">
                    <div className="flex items-start gap-4">
                        <ExceptionFlag flags={['PENDING_TAX_INVOICE']} />
                        <div>
                            <p className="text-sm font-medium text-amber-900">
                                Action Required: {pendingConfirmationsCount} vendor confirmation(s) and{' '}
                                {pendingTaxInvoicesCount} final tax invoice upload(s) pending.
                            </p>
                        </div>
                    </div>
                </div>
            )}

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

                <div className="space-y-4">
                    <div className="card">
                        <div className="card-header pb-3 border-b border-gray-100">
                            <h2 className="text-sm font-semibold text-gray-800">Quick Actions</h2>
                        </div>
                        <div className="p-2 flex flex-col gap-1">
                            <Link href="/dashboard/runner/pending" className="px-3 py-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded font-medium text-center flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Pick up New Requests ({pendingRequestsCount})
                            </Link>
                            <Link href="/dashboard/runner/my-purchases" className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded font-medium mt-2">
                                View My Purchases
                            </Link>
                            <Link href="/dashboard/runner/notifications" className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded font-medium">
                                Notification Center
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

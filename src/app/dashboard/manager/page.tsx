import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { formatCurrency } from '@/lib/utils';
import KPICard from '@/components/ui/KPICard';
import Link from 'next/link';
import ActionInbox, { ActionInboxItem } from '@/components/ui/ActionInbox';
import ExceptionFlag from '@/components/ui/ExceptionFlag';

export default async function ManagerDashboard() {
    const session = await requireRole('STORE_MANAGER');
    const managerId = session.user.id;

    // --- KPIs ---
    const totalRequests = await prisma.materialRequest.count({
        where: { manager_id: managerId },
    });

    const pendingPurchaseCount = await prisma.materialRequest.count({
        where: { manager_id: managerId, status: 'PENDING_PURCHASE' },
    });

    const rejectedPurchasesCount = await prisma.purchase.count({
        where: { request: { manager_id: managerId }, status: 'REJECTED' },
    });

    const blockedCount = await prisma.materialRequest.count({
        where: { manager_id: managerId, blocker_code: { not: null } },
    });

    // --- ActionInbox Data ---
    
    // My Pending: Rejected purchases they need to fix or drafts
    const rejectedPurchases = await prisma.purchase.findMany({
        where: { request: { manager_id: managerId }, status: 'REJECTED' },
        include: { request: true, vendor: true },
        take: 20,
    });
    
    const storeAcceptanceWaiting = await prisma.materialRequest.findMany({
        where: { manager_id: managerId, blocker_code: 'WAITING_STORE_ACCEPTANCE' },
        take: 20,
    });

    const myPending: ActionInboxItem[] = [
        ...rejectedPurchases.map(p => ({
            id: p.id,
            ref: p.purchase_no,
            label: `Rejected Purchase — ${p.reopen_reason || p.accountant_notes || 'Requires correction'}`,
            entityType: 'PURCHASE',
            href: `/dashboard/manager/requests/${p.request_id}`,
        })),
        ...storeAcceptanceWaiting.map(r => ({
            id: r.id,
            ref: r.request_no,
            label: `Requires Store Acceptance — ${r.blocker_note || 'Awaiting action'}`,
            entityType: 'REQUEST',
            href: `/dashboard/manager/requests/${r.id}`,
        }))
    ];

    // Waiting on Others: Requests pending runner pickup or accountant approval
    const waitingRequests = await prisma.materialRequest.findMany({
        where: { 
            manager_id: managerId, 
            status: { in: ['PENDING_PURCHASE', 'INVOICE_SUBMITTED', 'APPROVED', 'PAID', 'PARTIALLY_PAID', 'PAID_PENDING_TAX_INVOICE'] } 
        },
        include: { buyer: true },
        orderBy: { updated_at: 'desc' },
        take: 30,
    });

    const waitingOnOthers: ActionInboxItem[] = waitingRequests.map(r => ({
        id: r.id,
        ref: r.request_no,
        label: `Waiting on ${r.next_action_role || 'Others'} — ${r.buyer.name}`,
        entityType: 'REQUEST',
        href: `/dashboard/manager/requests/${r.id}`,
        pendingSince: r.pending_since_at ? new Date(r.pending_since_at).toLocaleDateString() : undefined,
    }));

    // Blocked items
    const blockedRequests = await prisma.materialRequest.findMany({
        where: { manager_id: managerId, blocker_code: { not: null } },
        include: { buyer: true },
        take: 20,
    });

    const blocked: ActionInboxItem[] = blockedRequests.map(r => ({
        id: r.id,
        ref: r.request_no,
        label: r.blocker_note || `Blocked: ${r.blocker_code}`,
        entityType: 'REQUEST',
        href: `/dashboard/manager/requests/${r.id}`,
        blockerLabel: r.blocker_code || 'BLOCKED',
    }));

    // Overdue items
    const overdueRequests = await prisma.materialRequest.findMany({
        where: { manager_id: managerId, overdue_flag: true },
        include: { buyer: true },
        take: 20,
    });

    const overdue: ActionInboxItem[] = overdueRequests.map(r => ({
        id: r.id,
        ref: r.request_no,
        label: r.overdue_reason || 'SLA breached',
        entityType: 'REQUEST',
        href: `/dashboard/manager/requests/${r.id}`,
        agingDays: r.pending_since_at ? Math.floor((Date.now() - r.pending_since_at.getTime()) / (1000 * 60 * 60 * 24)) : 0,
    }));

    // Recent items
    const recentRequestsData = await prisma.materialRequest.findMany({
        where: { manager_id: managerId },
        orderBy: { updated_at: 'desc' },
        include: { buyer: true },
        take: 15,
    });

    const recentlyUpdated: ActionInboxItem[] = recentRequestsData.map(r => ({
        id: r.id,
        ref: r.request_no,
        label: `Status: ${r.status} — ${r.buyer.name}`,
        entityType: 'REQUEST',
        href: `/dashboard/manager/requests/${r.id}`,
        pendingSince: new Date(r.updated_at).toLocaleString(),
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900">
                    Store Manager Dashboard (V2)
                </h1>
                <Link href="/dashboard/manager/requests/new" className="btn-primary flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    New Request
                </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard title="Total Requests" value={totalRequests} subtitle="All time" />
                <KPICard title="Pending Purchase" value={pendingPurchaseCount} subtitle="Waiting for runners" />
                <KPICard title="Rejected" value={rejectedPurchasesCount} subtitle="Requires correction" />
                <KPICard title="Blocked" value={blockedCount} subtitle="Completion blockers" />
            </div>

            {rejectedPurchasesCount > 0 && (
                <div className="card p-4 border-l-4 border-l-red-500 bg-red-50/50">
                    <div className="flex items-start gap-4">
                        <ExceptionFlag flags={['REOPENED_ITEM']} />
                        <div>
                            <p className="text-sm font-medium text-red-900">
                                {rejectedPurchasesCount} purchase(s) were rejected by the accountant.
                            </p>
                            <p className="text-xs text-red-700 mt-1">Please review the notes and correct them.</p>
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
                            <Link href="/dashboard/manager/requests" className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded font-medium">
                                View All Requests
                            </Link>
                            <Link href="/dashboard/manager/master/materials" className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded font-medium">
                                Manage Material Catalog
                            </Link>
                            <Link href="/dashboard/manager/master/buyers" className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded font-medium">
                                Manage Buyers
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

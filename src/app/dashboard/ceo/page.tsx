import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { formatCurrency } from '@/lib/utils';
import KPICard from '@/components/ui/KPICard';
import ActionInbox, { ActionInboxItem } from '@/components/ui/ActionInbox';
import ExceptionFlag from '@/components/ui/ExceptionFlag';

export default async function CEODashboard() {
    await requireRole('CEO');

    // --- KPIs ---
    const totalRequests = await prisma.materialRequest.count();
    const totalPurchases = await prisma.purchase.count();
    
    const totalPayments = await prisma.payment.aggregate({
        _sum: { amount_paid: true },
        _count: true,
    });

    const pendingTaxInvoicesCount = await prisma.purchase.count({
        where: {
            invoice_type_submitted: 'PROVISIONAL',
            tax_invoice_path: null,
            status: { in: ['PAID', 'PAID_PENDING_TAX_INVOICE'] },
        },
    });

    const blockedRequestsCount = await prisma.materialRequest.count({
        where: { blocker_code: { not: null } },
    });
    
    const blockedPurchasesCount = await prisma.purchase.count({
        where: { blocker_code: { not: null } },
    });

    // --- Organization-wide ActionInbox Data ---
    
    const blockedRequests = await prisma.materialRequest.findMany({
        where: { blocker_code: { not: null } },
        include: { buyer: true },
        take: 15,
    });

    const blockedPurchases = await prisma.purchase.findMany({
        where: { blocker_code: { not: null } },
        include: { vendor: true },
        take: 15,
    });

    const blocked: ActionInboxItem[] = [
        ...blockedRequests.map(r => ({
            id: r.id,
            ref: r.request_no,
            label: `Blocked Request (${r.buyer.name}): ${r.blocker_note || r.blocker_code}`,
            entityType: 'REQUEST',
            href: `/dashboard/manager/requests/${r.id}`, // CEO can view manager link
            blockerLabel: r.blocker_code || 'BLOCKED',
        })),
        ...blockedPurchases.map(p => ({
            id: p.id,
            ref: p.purchase_no,
            label: `Blocked Purchase (${p.vendor.name}): ${p.blocker_note || p.blocker_code}`,
            entityType: 'PURCHASE',
            href: `/dashboard/runner/purchases/${p.id}`,
            blockerLabel: p.blocker_code || 'BLOCKED',
        })),
    ];

    const overdueRequests = await prisma.materialRequest.findMany({
        where: { overdue_flag: true },
        include: { buyer: true },
        take: 15,
    });

    const overduePurchases = await prisma.purchase.findMany({
        where: { overdue_flag: true },
        include: { vendor: true },
        take: 15,
    });

    const overdue: ActionInboxItem[] = [
        ...overdueRequests.map(r => ({
            id: r.id,
            ref: r.request_no,
            label: `Overdue Request: ${r.overdue_reason || 'SLA breached'}`,
            entityType: 'REQUEST',
            href: `/dashboard/manager/requests/${r.id}`,
            agingDays: r.pending_since_at ? Math.floor((Date.now() - r.pending_since_at.getTime()) / (1000 * 60 * 60 * 24)) : 0,
        })),
        ...overduePurchases.map(p => ({
            id: p.id,
            ref: p.purchase_no,
            label: `Overdue Purchase (${p.vendor.name})`,
            entityType: 'PURCHASE',
            href: `/dashboard/runner/purchases/${p.id}`,
            agingDays: p.pending_since_at ? Math.floor((Date.now() - p.pending_since_at.getTime()) / (1000 * 60 * 60 * 24)) : 0,
        })),
    ];

    const recentlyUpdatedPurchases = await prisma.purchase.findMany({
        orderBy: { updated_at: 'desc' },
        include: { vendor: true },
        take: 15,
    });

    const recentlyUpdated: ActionInboxItem[] = recentlyUpdatedPurchases.map(p => ({
        id: p.id,
        ref: p.purchase_no,
        label: `Status: ${p.status} — ${p.vendor.name}`,
        entityType: 'PURCHASE',
        href: `/dashboard/runner/purchases/${p.id}`,
        pendingSince: new Date(p.updated_at).toLocaleString(),
    }));

    // Top vendors & buyers for the right column
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentPurchases = await prisma.purchase.findMany({
        where: { created_at: { gte: sixMonthsAgo } },
        include: { request: { include: { buyer: true } }, vendor: true },
    });

    const vendorMap = new Map<string, { name: string; amount: number; count: number }>();
    const buyerMap = new Map<string, { name: string; amount: number; count: number }>();

    for (const p of recentPurchases) {
        if (p.vendor_id) {
            const v = vendorMap.get(p.vendor_id) || { name: p.vendor.name, amount: 0, count: 0 };
            v.amount += Number(p.invoice_amount || 0);
            v.count++;
            vendorMap.set(p.vendor_id, v);
        }
        if (p.request?.buyer_id) {
            const b = buyerMap.get(p.request.buyer_id) || { name: p.request.buyer.name, amount: 0, count: 0 };
            b.amount += Number(p.invoice_amount || 0);
            b.count++;
            buyerMap.set(p.request.buyer_id, b);
        }
    }

    const topVendors = Array.from(vendorMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 5);
    const topBuyers = Array.from(buyerMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 5);

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-bold text-gray-900">
                Executive Overview (V2)
            </h1>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <KPICard title="Total Requests" value={totalRequests} subtitle="All time" />
                <KPICard title="Total Purchases" value={totalPurchases} subtitle="All time" />
                <KPICard title="Total Disbursed" value={formatCurrency(Number(totalPayments._sum.amount_paid || 0))} subtitle={`${totalPayments._count} payments`} />
                <KPICard title="Blocked Ops" value={blockedRequestsCount + blockedPurchasesCount} subtitle="Requires unblocking" />
                <KPICard title="Compliance Gap" value={pendingTaxInvoicesCount} subtitle="Pending tax invoices" />
            </div>

            {(blockedRequestsCount > 0 || blockedPurchasesCount > 0) && (
                <div className="card p-4 border-l-4 border-l-red-500 bg-red-50/50">
                    <div className="flex items-start gap-4">
                        <ExceptionFlag flags={['BLOCKED_BY_APPROVAL']} />
                        <div>
                            <p className="text-sm font-medium text-red-900">
                                Organization Warning: {blockedRequestsCount + blockedPurchasesCount} operations are currently blocked.
                            </p>
                            <p className="text-xs text-red-700 mt-1">Review the Blocked queue below for details.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ActionInbox
                        className="h-full"
                        myPending={[]}
                        waitingOnOthers={[]}
                        blocked={blocked}
                        overdue={overdue}
                        recentlyUpdated={recentlyUpdated}
                    />
                </div>

                <div className="space-y-4">
                    <div className="card">
                        <div className="card-header pb-3 border-b border-gray-100">
                            <h2 className="text-sm font-semibold text-gray-800">Top Vendors (6 Months)</h2>
                        </div>
                        <div className="p-0">
                            <table className="w-full text-xs">
                                <tbody>
                                    {topVendors.map((v, i) => (
                                        <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                            <td className="px-3 py-2.5 text-gray-700 truncate max-w-[120px]" title={v.name}>{v.name}</td>
                                            <td className="px-3 py-2.5 text-right tabular-nums font-medium">{formatCurrency(v.amount)}</td>
                                        </tr>
                                    ))}
                                    {topVendors.length === 0 && (
                                        <tr><td colSpan={2} className="px-3 py-4 text-center text-gray-400">No data</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header pb-3 border-b border-gray-100">
                            <h2 className="text-sm font-semibold text-gray-800">Top Buyers (6 Months)</h2>
                        </div>
                        <div className="p-0">
                            <table className="w-full text-xs">
                                <tbody>
                                    {topBuyers.map((b, i) => (
                                        <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                            <td className="px-3 py-2.5 text-gray-700 truncate max-w-[120px]" title={b.name}>{b.name}</td>
                                            <td className="px-3 py-2.5 text-right tabular-nums font-medium">{formatCurrency(b.amount)}</td>
                                        </tr>
                                    ))}
                                    {topBuyers.length === 0 && (
                                        <tr><td colSpan={2} className="px-3 py-4 text-center text-gray-400">No data</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

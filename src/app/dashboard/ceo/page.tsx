import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { formatCurrency } from '@/lib/utils';
import KPICard from '@/components/ui/KPICard';

export default async function CEODashboard() {
    await requireRole('CEO');

    const totalRequests = await prisma.materialRequest.count();
    const totalPurchases = await prisma.purchase.count();
    const completedPurchases = await prisma.purchase.count({
        where: { status: 'COMPLETED' },
    });

    const totalPayments = await prisma.payment.aggregate({
        _sum: { amount_paid: true },
        _count: true,
    });

    const pendingTaxInvoices = await prisma.purchase.count({
        where: {
            invoice_type_submitted: 'PROVISIONAL',
            tax_invoice_path: null,
            status: { in: ['PAID', 'PAID_PENDING_TAX_INVOICE'] },
        },
    });

    // Monthly trend data
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentPurchases = await prisma.purchase.findMany({
        where: { created_at: { gte: sixMonthsAgo } },
        include: {
            request: { include: { buyer: true } },
            vendor: true,
            payments: true,
        },
        orderBy: { created_at: 'desc' },
    });

    // Top vendors
    const vendorMap = new Map<string, { name: string; amount: number; count: number }>();
    for (const p of recentPurchases) {
        const key = p.vendor_id;
        const existing = vendorMap.get(key) || { name: p.vendor.name, amount: 0, count: 0 };
        existing.amount += Number(p.invoice_amount);
        existing.count++;
        vendorMap.set(key, existing);
    }
    const topVendors = Array.from(vendorMap.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

    // Top buyers
    const buyerMap = new Map<string, { name: string; amount: number; count: number }>();
    for (const p of recentPurchases) {
        const key = p.request.buyer_id;
        const existing = buyerMap.get(key) || { name: p.request.buyer.name, amount: 0, count: 0 };
        existing.amount += Number(p.invoice_amount);
        existing.count++;
        buyerMap.set(key, existing);
    }
    const topBuyers = Array.from(buyerMap.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

    return (
        <div className="space-y-4">
            <h1 className="text-lg font-semibold text-gray-900">
                Executive Overview
            </h1>

            <div className="grid grid-cols-5 gap-3">
                <KPICard title="Total Requests" value={totalRequests} />
                <KPICard title="Total Purchases" value={totalPurchases} />
                <KPICard title="Completed" value={completedPurchases} />
                <KPICard
                    title="Total Disbursed"
                    value={formatCurrency(Number(totalPayments._sum.amount_paid || 0))}
                    subtitle={`${totalPayments._count} payments`}
                />
                <KPICard
                    title="Pending Tax Invoices"
                    value={pendingTaxInvoices}
                    subtitle="Compliance gap"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="card">
                    <div className="card-header">
                        <h2 className="text-xs font-semibold text-gray-700">
                            Top Vendors (by Amount)
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Vendor</th>
                                    <th className="text-right px-3 py-2 font-medium text-gray-600">Invoices</th>
                                    <th className="text-right px-3 py-2 font-medium text-gray-600">Total Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topVendors.map((v, i) => (
                                    <tr key={i} className="border-b border-gray-100 even:bg-gray-50">
                                        <td className="px-3 py-2 text-gray-700">{v.name}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{v.count}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(v.amount)}</td>
                                    </tr>
                                ))}
                                {topVendors.length === 0 && (
                                    <tr><td colSpan={3} className="px-3 py-4 text-center text-gray-400">No data</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h2 className="text-xs font-semibold text-gray-700">
                            Top Buyers (by Procurement Cost)
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Buyer</th>
                                    <th className="text-right px-3 py-2 font-medium text-gray-600">Orders</th>
                                    <th className="text-right px-3 py-2 font-medium text-gray-600">Total Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topBuyers.map((b, i) => (
                                    <tr key={i} className="border-b border-gray-100 even:bg-gray-50">
                                        <td className="px-3 py-2 text-gray-700">{b.name}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{b.count}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(b.amount)}</td>
                                    </tr>
                                ))}
                                {topBuyers.length === 0 && (
                                    <tr><td colSpan={3} className="px-3 py-4 text-center text-gray-400">No data</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

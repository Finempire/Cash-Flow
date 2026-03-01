import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { formatCurrency } from '@/lib/utils';
import KPICard from '@/components/ui/KPICard';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';

export default async function AccountantDashboard() {
    await requireRole('ACCOUNTANT');

    const pendingReview = await prisma.purchase.count({
        where: { status: 'INVOICE_SUBMITTED' },
    });

    const pendingPayment = await prisma.purchase.count({
        where: { status: 'APPROVED' },
    });

    const pendingTaxInvoices = await prisma.purchase.count({
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

    const totalCompleted = await prisma.purchase.count({
        where: { status: 'COMPLETED' },
    });

    const recentPurchases = await prisma.purchase.findMany({
        where: { status: { in: ['INVOICE_SUBMITTED', 'APPROVED'] } },
        include: {
            request: { include: { buyer: true, order: true } },
            runner: true,
            vendor: true,
        },
        orderBy: { created_at: 'desc' },
        take: 10,
    });

    return (
        <div className="space-y-4">
            <h1 className="text-lg font-semibold text-gray-900">
                Accountant Dashboard
            </h1>

            <div className="grid grid-cols-5 gap-3">
                <KPICard
                    title="Pending Review"
                    value={pendingReview}
                    subtitle="Invoice verification"
                />
                <KPICard
                    title="Awaiting Payment"
                    value={pendingPayment}
                    subtitle="Approved purchases"
                />
                <KPICard
                    title="Pending Tax Invoices"
                    value={pendingTaxInvoices}
                    subtitle="From runners"
                />
                <KPICard
                    title="Today Disbursed"
                    value={formatCurrency(Number(todayPayments._sum.amount_paid || 0))}
                    subtitle={`${todayPayments._count} transaction(s)`}
                />
                <KPICard title="Completed" value={totalCompleted} />
            </div>

            {pendingTaxInvoices > 0 && (
                <div className="card p-3 border-red-200 bg-red-50">
                    <p className="text-xs font-medium text-red-800">
                        Alert: {pendingTaxInvoices} purchase(s) awaiting final GST tax
                        invoice from runners
                    </p>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="card">
                    <div className="card-header flex items-center justify-between">
                        <h2 className="text-xs font-semibold text-gray-700">
                            Pending Review Queue
                        </h2>
                        <Link
                            href="/dashboard/accountant/purchases-review"
                            className="text-2xs text-blue-600 hover:underline"
                        >
                            View All
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Purchase</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Vendor</th>
                                    <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentPurchases
                                    .filter((p) => p.status === 'INVOICE_SUBMITTED')
                                    .slice(0, 5)
                                    .map((p) => (
                                        <tr key={p.id} className="border-b border-gray-100 even:bg-gray-50">
                                            <td className="px-3 py-2">
                                                <Link
                                                    href={`/dashboard/accountant/transactions/${p.id}`}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {p.purchase_no}
                                                </Link>
                                            </td>
                                            <td className="px-3 py-2 text-gray-700">{p.vendor.name}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(p.invoice_amount)}</td>
                                            <td className="px-3 py-2"><StatusBadge status={p.status} /></td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header flex items-center justify-between">
                        <h2 className="text-xs font-semibold text-gray-700">
                            Payment Queue
                        </h2>
                        <Link
                            href="/dashboard/accountant/payments"
                            className="text-2xs text-blue-600 hover:underline"
                        >
                            View All
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Purchase</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Runner</th>
                                    <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentPurchases
                                    .filter((p) => p.status === 'APPROVED')
                                    .slice(0, 5)
                                    .map((p) => (
                                        <tr key={p.id} className="border-b border-gray-100 even:bg-gray-50">
                                            <td className="px-3 py-2">
                                                <Link
                                                    href={`/dashboard/accountant/transactions/${p.id}`}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {p.purchase_no}
                                                </Link>
                                            </td>
                                            <td className="px-3 py-2 text-gray-700">{p.runner.name}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(p.invoice_amount)}</td>
                                            <td className="px-3 py-2"><StatusBadge status={p.status} /></td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

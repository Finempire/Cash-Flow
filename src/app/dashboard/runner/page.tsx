import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { formatCurrency } from '@/lib/utils';
import KPICard from '@/components/ui/KPICard';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';

export default async function RunnerDashboard() {
    const session = await requireRole('RUNNER');

    const pendingRequests = await prisma.materialRequest.count({
        where: { status: 'PENDING_PURCHASE' },
    });

    const myPurchases = await prisma.purchase.findMany({
        where: { runner_id: session.user.id },
        include: {
            request: { include: { buyer: true, order: true } },
            vendor: true,
            vendorConfirmation: true,
        },
        orderBy: { created_at: 'desc' },
        take: 10,
    });

    const totalPurchases = await prisma.purchase.count({
        where: { runner_id: session.user.id },
    });

    const pendingConfirmations = await prisma.vendorConfirmation.count({
        where: { runner_id: session.user.id, status: 'NOT_CONFIRMED' },
    });

    const pendingTaxInvoices = await prisma.purchase.count({
        where: {
            runner_id: session.user.id,
            invoice_type_submitted: 'PROVISIONAL',
            tax_invoice_path: null,
            status: { in: ['PAID', 'PAID_PENDING_TAX_INVOICE'] },
        },
    });

    const totalHandled = myPurchases.reduce(
        (sum, p) => sum + Number(p.invoice_amount),
        0
    );

    const unreadNotifications = await prisma.notification.count({
        where: { user_id: session.user.id, is_read: false },
    });

    return (
        <div className="space-y-4">
            <h1 className="text-lg font-semibold text-gray-900">
                Runner Dashboard
            </h1>

            <div className="grid grid-cols-5 gap-3">
                <KPICard
                    title="Pending Requests"
                    value={pendingRequests}
                    subtitle="Awaiting purchase"
                />
                <KPICard title="My Purchases" value={totalPurchases} />
                <KPICard
                    title="Pending Confirmations"
                    value={pendingConfirmations}
                    subtitle="Show to vendor"
                />
                <KPICard
                    title="Pending Tax Invoices"
                    value={pendingTaxInvoices}
                    subtitle="Upload required"
                />
                <KPICard
                    title="Amount Handled"
                    value={formatCurrency(totalHandled)}
                />
            </div>

            {(pendingConfirmations > 0 || pendingTaxInvoices > 0) && (
                <div className="card p-3 border-amber-200 bg-amber-50">
                    <p className="text-xs font-medium text-amber-800">
                        Action Required: {pendingConfirmations} vendor confirmation(s) and{' '}
                        {pendingTaxInvoices} tax invoice upload(s) pending
                    </p>
                </div>
            )}

            <div className="card">
                <div className="card-header flex items-center justify-between">
                    <h2 className="text-xs font-semibold text-gray-700">
                        Recent Purchases
                    </h2>
                    <div className="flex gap-2">
                        <Link href="/dashboard/runner/pending" className="btn-primary text-2xs">
                            Pending Requests
                        </Link>
                        <Link href="/dashboard/runner/notifications" className="btn-secondary text-2xs">
                            Notifications {unreadNotifications > 0 && `(${unreadNotifications})`}
                        </Link>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Purchase No</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Vendor</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Buyer</th>
                                <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Invoice Type</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {myPurchases.map((p) => (
                                <tr key={p.id} className="border-b border-gray-100 even:bg-gray-50 hover:bg-blue-50/50">
                                    <td className="px-3 py-2">
                                        <Link
                                            href={`/dashboard/runner/purchases/${p.id}`}
                                            className="text-blue-600 hover:underline font-medium"
                                        >
                                            {p.purchase_no}
                                        </Link>
                                    </td>
                                    <td className="px-3 py-2 text-gray-700">{p.vendor.name}</td>
                                    <td className="px-3 py-2 text-gray-700">{p.request.buyer.name}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(p.invoice_amount)}</td>
                                    <td className="px-3 py-2">
                                        <span className={p.invoice_type_submitted === 'TAX' ? 'badge-green' : 'badge-amber'}>
                                            {p.invoice_type_submitted}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2"><StatusBadge status={p.status} /></td>
                                    <td className="px-3 py-2 text-gray-500 tabular-nums">
                                        {new Date(p.created_at).toLocaleDateString('en-IN')}
                                    </td>
                                </tr>
                            ))}
                            {myPurchases.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                                        No purchases found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

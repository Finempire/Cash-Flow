import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';

export default async function MyPurchases() {
    const session = await requireRole('RUNNER');

    const purchases = await prisma.purchase.findMany({
        where: { runner_id: session.user.id },
        include: {
            request: { include: { buyer: true, order: true } },
            vendor: true,
            vendorConfirmation: true,
        },
        orderBy: { created_at: 'desc' },
    });

    return (
        <div className="space-y-4">
            <h1 className="text-lg font-semibold text-gray-900">My Purchases</h1>
            <div className="card">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Purchase No</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Vendor</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Buyer</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Order</th>
                                <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Invoice Type</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Confirmation</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchases.map((p) => (
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
                                    <td className="px-3 py-2 text-gray-700">{p.request.order.order_reference}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(p.invoice_amount)}</td>
                                    <td className="px-3 py-2">
                                        <span className={p.invoice_type_submitted === 'TAX' ? 'badge-green' : 'badge-amber'}>
                                            {p.invoice_type_submitted}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2"><StatusBadge status={p.status} /></td>
                                    <td className="px-3 py-2">
                                        {p.vendorConfirmation ? (
                                            <span className={
                                                p.vendorConfirmation.status === 'VENDOR_CONFIRMED' ? 'badge-green' :
                                                    p.vendorConfirmation.status === 'SHOWN_TO_VENDOR' ? 'badge-blue' :
                                                        'badge-gray'
                                            }>
                                                {p.vendorConfirmation.status.replace(/_/g, ' ')}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-3 py-2 text-gray-500 tabular-nums">
                                        {new Date(p.created_at).toLocaleDateString('en-IN')}
                                    </td>
                                </tr>
                            ))}
                            {purchases.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-3 py-8 text-center text-gray-400">
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

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';

export default async function AllTransactions() {
    await requireRole('ACCOUNTANT');

    const purchases = await prisma.purchase.findMany({
        include: {
            request: { include: { buyer: true, order: true, manager: true } },
            runner: true,
            vendor: true,
            payments: true,
        },
        orderBy: { created_at: 'desc' },
    });

    return (
        <div className="space-y-4">
            <h1 className="text-lg font-semibold text-gray-900">All Transactions</h1>
            <div className="card">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Purchase No</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Request</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Buyer</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Order</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Runner</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Vendor</th>
                                <th className="text-right px-3 py-2 font-medium text-gray-600">Invoice Amt</th>
                                <th className="text-right px-3 py-2 font-medium text-gray-600">Paid</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Invoice</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchases.map((p) => {
                                const totalPaid = p.payments.reduce((s, py) => s + Number(py.amount_paid), 0);
                                return (
                                    <tr key={p.id} className="border-b border-gray-100 even:bg-gray-50 hover:bg-blue-50/50">
                                        <td className="px-3 py-2">
                                            <Link href={`/dashboard/accountant/transactions/${p.id}`} className="text-blue-600 hover:underline font-medium">
                                                {p.purchase_no}
                                            </Link>
                                        </td>
                                        <td className="px-3 py-2 text-gray-500">{p.request.request_no}</td>
                                        <td className="px-3 py-2 text-gray-700">{p.request.buyer.name}</td>
                                        <td className="px-3 py-2 text-gray-700">{p.request.order.order_reference}</td>
                                        <td className="px-3 py-2 text-gray-500">{p.runner.name}</td>
                                        <td className="px-3 py-2 text-gray-700">{p.vendor.name}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(p.invoice_amount)}</td>
                                        <td className="px-3 py-2 text-right tabular-nums text-green-600">{formatCurrency(totalPaid)}</td>
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
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

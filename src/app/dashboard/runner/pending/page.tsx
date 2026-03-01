import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default async function RunnerPending() {
    await requireRole('RUNNER');

    const requests = await prisma.materialRequest.findMany({
        where: { status: 'PENDING_PURCHASE' },
        include: {
            buyer: true,
            order: true,
            manager: true,
            lines: { include: { material: true } },
        },
        orderBy: { created_at: 'desc' },
    });

    return (
        <div className="space-y-4">
            <h1 className="text-lg font-semibold text-gray-900">
                Pending Purchase Requests
            </h1>

            <div className="card">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Request No</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Buyer</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Order</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Manager</th>
                                <th className="text-center px-3 py-2 font-medium text-gray-600">Items</th>
                                <th className="text-right px-3 py-2 font-medium text-gray-600">Expected Amt</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Expected Date</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((r) => (
                                <tr key={r.id} className="border-b border-gray-100 even:bg-gray-50 hover:bg-blue-50/50">
                                    <td className="px-3 py-2 font-medium">{r.request_no}</td>
                                    <td className="px-3 py-2 text-gray-700">{r.buyer.name}</td>
                                    <td className="px-3 py-2 text-gray-700">{r.order.order_reference}</td>
                                    <td className="px-3 py-2 text-gray-500">{r.manager.name}</td>
                                    <td className="px-3 py-2 text-center">{r.lines.length}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                        {formatCurrency(r.lines.reduce((s, l) => s + Number(l.expected_amount), 0))}
                                    </td>
                                    <td className="px-3 py-2 text-gray-500 tabular-nums">
                                        {r.expected_date ? new Date(r.expected_date).toLocaleDateString('en-IN') : '-'}
                                    </td>
                                    <td className="px-3 py-2">
                                        <Link
                                            href={`/dashboard/runner/purchases/new?request_id=${r.id}`}
                                            className="btn-primary text-2xs"
                                        >
                                            Create Purchase
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {requests.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                                        No pending requests
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

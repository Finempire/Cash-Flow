import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { formatCurrency } from '@/lib/utils';
import KPICard from '@/components/ui/KPICard';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';

export default async function ManagerDashboard() {
    const session = await requireRole('STORE_MANAGER');

    const requests = await prisma.materialRequest.findMany({
        where: { manager_id: session.user.id },
        include: {
            buyer: true,
            order: true,
            lines: true,
        },
        orderBy: { created_at: 'desc' },
        take: 10,
    });

    const totalRequests = await prisma.materialRequest.count({
        where: { manager_id: session.user.id },
    });

    const pendingCount = await prisma.materialRequest.count({
        where: { manager_id: session.user.id, status: 'PENDING_PURCHASE' },
    });

    const approvedCount = await prisma.materialRequest.count({
        where: { manager_id: session.user.id, status: 'APPROVED' },
    });

    const completedCount = await prisma.materialRequest.count({
        where: { manager_id: session.user.id, status: 'COMPLETED' },
    });

    const totalAmount = requests.reduce(
        (sum, r) =>
            sum + r.lines.reduce((s, l) => s + Number(l.expected_amount), 0),
        0
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-gray-900">
                    Store Manager Dashboard
                </h1>
                <Link href="/dashboard/manager/requests" className="btn-primary">
                    View All Requests
                </Link>
            </div>

            <div className="grid grid-cols-5 gap-3">
                <KPICard title="Total Requests" value={totalRequests} />
                <KPICard title="Pending Purchase" value={pendingCount} />
                <KPICard title="Approved" value={approvedCount} />
                <KPICard title="Completed" value={completedCount} />
                <KPICard
                    title="Total Value"
                    value={formatCurrency(totalAmount)}
                    subtitle="Expected amount"
                />
            </div>

            <div className="card">
                <div className="card-header flex items-center justify-between">
                    <h2 className="text-xs font-semibold text-gray-700">
                        Recent Material Requests
                    </h2>
                    <Link
                        href="/dashboard/manager/requests/new"
                        className="btn-primary text-2xs"
                    >
                        New Request
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-3 py-2 font-medium text-gray-600">
                                    Request No
                                </th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">
                                    Buyer
                                </th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">
                                    Order
                                </th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">
                                    Items
                                </th>
                                <th className="text-right px-3 py-2 font-medium text-gray-600">
                                    Amount
                                </th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">
                                    Status
                                </th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">
                                    Date
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((r) => (
                                <tr
                                    key={r.id}
                                    className="border-b border-gray-100 even:bg-gray-50 hover:bg-blue-50/50"
                                >
                                    <td className="px-3 py-2">
                                        <Link
                                            href={`/dashboard/manager/requests/${r.id}`}
                                            className="text-blue-600 hover:underline font-medium"
                                        >
                                            {r.request_no}
                                        </Link>
                                    </td>
                                    <td className="px-3 py-2 text-gray-700">{r.buyer.name}</td>
                                    <td className="px-3 py-2 text-gray-700">
                                        {r.order.order_reference}
                                    </td>
                                    <td className="px-3 py-2 text-gray-700">
                                        {r.lines.length}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums text-gray-900">
                                        {formatCurrency(
                                            r.lines.reduce(
                                                (s, l) => s + Number(l.expected_amount),
                                                0
                                            )
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        <StatusBadge status={r.status} />
                                    </td>
                                    <td className="px-3 py-2 text-gray-500 tabular-nums">
                                        {new Date(r.created_at).toLocaleDateString('en-IN')}
                                    </td>
                                </tr>
                            ))}
                            {requests.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-3 py-8 text-center text-gray-400"
                                    >
                                        No material requests found
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

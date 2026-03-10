import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
    await requireRole('ACCOUNTANT');

    const orders = await prisma.order.findMany({
        where: { is_active: true },
        include: {
            buyer: true,
            _count: {
                select: { styles: true, materialRequests: true }
            }
        },
        orderBy: { created_at: 'desc' },
    });

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Orders</h1>
                    <p className="text-sm text-gray-600">Manage purchase orders and connected styles.</p>
                </div>
                <Link
                    href="/dashboard/accountant/master/orders/new"
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={16} /> New Order
                </Link>
            </div>

            <div className="card text-sm p-0 overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 font-medium">
                        <tr>
                            <th className="px-4 py-3">Order / Invoice No.</th>
                            <th className="px-4 py-3">Buyer</th>
                            <th className="px-4 py-3">Invoice Date</th>
                            <th className="px-4 py-3">Shipping Date</th>
                            <th className="px-4 py-3">Styles / Items</th>
                            <th className="px-4 py-3">Remarks</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {orders.map((o) => (
                            <tr key={o.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">{o.order_reference}</td>
                                <td className="px-4 py-3">{o.buyer.name}</td>
                                <td className="px-4 py-3">
                                    {o.start_date ? new Date(o.start_date).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-4 py-3">
                                    {o.shipping_date ? new Date(o.shipping_date).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-4 py-3 tabular-nums font-medium text-gray-700">
                                    {o._count?.styles || 0}
                                </td>
                                <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={o.remarks || ''}>
                                    {o.remarks || '-'}
                                </td>
                            </tr>
                        ))}
                        {orders.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                    No orders found. Create a new order to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

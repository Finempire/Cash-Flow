import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { formatCurrency, formatDate } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CancelRequestButton from './CancelRequestButton';

export default async function RequestDetail({
    params,
}: {
    params: { id: string };
}) {
    await requireRole('STORE_MANAGER', 'ACCOUNTANT');

    const request = await prisma.materialRequest.findUnique({
        where: { id: params.id },
        include: {
            buyer: true,
            order: true,
            manager: true,
            lines: { include: { material: true } },
            purchases: {
                include: {
                    runner: true,
                    vendor: true,
                    payments: true,
                },
            },
        },
    });

    if (!request) notFound();

    const totalExpected = request.lines.reduce(
        (s, l) => s + Number(l.expected_amount),
        0
    );

    return (
        <div className="space-y-4 max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <Link
                        href="/dashboard/manager/requests"
                        className="text-2xs text-blue-600 hover:underline"
                    >
                        Back to Requests
                    </Link>
                    <h1 className="text-lg font-semibold text-gray-900 mt-1">
                        {request.request_no}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={request.status} />
                    {request.status === 'PENDING_PURCHASE' && (
                        <CancelRequestButton requestId={request.id} />
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="card">
                    <div className="card-header">
                        <h2 className="text-xs font-semibold text-gray-700">
                            Request Information
                        </h2>
                    </div>
                    <div className="card-body space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Buyer</span>
                            <span className="font-medium">{request.buyer.name}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Order</span>
                            <span className="font-medium">{request.order.order_reference}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Created By</span>
                            <span>{request.manager.name}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Store Location</span>
                            <span>{request.store_location || '-'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Expected Date</span>
                            <span className="tabular-nums">{formatDate(request.expected_date)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Created</span>
                            <span className="tabular-nums">{formatDate(request.created_at)}</span>
                        </div>
                        {request.remarks && (
                            <div className="pt-1 border-t">
                                <span className="text-2xs text-gray-500">Remarks</span>
                                <p className="text-xs text-gray-700 mt-0.5">{request.remarks}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h2 className="text-xs font-semibold text-gray-700">Summary</h2>
                    </div>
                    <div className="card-body space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Total Items</span>
                            <span className="font-medium">{request.lines.length}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Expected Amount</span>
                            <span className="font-medium tabular-nums">{formatCurrency(totalExpected)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Purchases</span>
                            <span className="font-medium">{request.purchases.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h2 className="text-xs font-semibold text-gray-700">Material Lines</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-3 py-2 font-medium text-gray-600">SKU</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Material</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Unit</th>
                                <th className="text-right px-3 py-2 font-medium text-gray-600">Qty</th>
                                <th className="text-right px-3 py-2 font-medium text-gray-600">Rate</th>
                                <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {request.lines.map((line) => (
                                <tr key={line.id} className="border-b border-gray-100 even:bg-gray-50">
                                    <td className="px-3 py-2 font-medium">{line.material.sku_code}</td>
                                    <td className="px-3 py-2 text-gray-700">{line.material.description}</td>
                                    <td className="px-3 py-2 text-gray-500">{line.material.unit_of_measure}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{Number(line.quantity)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(line.expected_rate)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums font-medium">{formatCurrency(line.expected_amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50">
                                <td colSpan={5} className="px-3 py-2 text-right font-medium">Total</td>
                                <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatCurrency(totalExpected)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {request.purchases.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <h2 className="text-xs font-semibold text-gray-700">Associated Purchases</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Purchase No</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Runner</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Vendor</th>
                                    <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {request.purchases.map((p) => (
                                    <tr key={p.id} className="border-b border-gray-100 even:bg-gray-50">
                                        <td className="px-3 py-2 font-medium">{p.purchase_no}</td>
                                        <td className="px-3 py-2 text-gray-700">{p.runner.name}</td>
                                        <td className="px-3 py-2 text-gray-700">{p.vendor.name}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(p.invoice_amount)}</td>
                                        <td className="px-3 py-2"><StatusBadge status={p.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

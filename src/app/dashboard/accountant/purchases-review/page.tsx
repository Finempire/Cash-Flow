import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import PurchaseReviewActions from './PurchaseReviewActions';

export default async function PurchasesReview() {
    await requireRole('ACCOUNTANT');

    const purchases = await prisma.purchase.findMany({
        where: { status: 'INVOICE_SUBMITTED' },
        include: {
            request: { include: { buyer: true, order: true, lines: true } },
            runner: true,
            vendor: true,
            lines: { include: { material: true } },
        },
        orderBy: { created_at: 'asc' },
    });

    return (
        <div className="space-y-4">
            <h1 className="text-lg font-semibold text-gray-900">Purchase Review Queue</h1>
            {purchases.length === 0 ? (
                <div className="card p-8 text-center text-xs text-gray-400">
                    No purchases pending review
                </div>
            ) : (
                purchases.map((p) => {
                    const expectedTotal = p.request.lines.reduce((s, l) => s + Number(l.expected_amount), 0);
                    const actualTotal = Number(p.invoice_amount);
                    const variance = actualTotal - expectedTotal;
                    const variancePct = expectedTotal > 0 ? ((variance / expectedTotal) * 100).toFixed(1) : '0';

                    return (
                        <div key={p.id} className="card">
                            <div className="card-header flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Link href={`/dashboard/accountant/transactions/${p.id}`} className="text-sm font-semibold text-blue-600 hover:underline">
                                        {p.purchase_no}
                                    </Link>
                                    <StatusBadge status={p.status} />
                                    <span className={`badge ${p.invoice_type_submitted === 'TAX' ? 'badge-green' : 'badge-amber'}`}>
                                        {p.invoice_type_submitted}
                                    </span>
                                </div>
                                <span className="text-2xs text-gray-500">
                                    {new Date(p.created_at).toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div className="card-body">
                                <div className="grid grid-cols-4 gap-3 text-xs mb-3">
                                    <div>
                                        <span className="text-gray-500">Runner:</span>{' '}
                                        <span className="font-medium">{p.runner.name}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Vendor:</span>{' '}
                                        <span className="font-medium">{p.vendor.name}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Invoice:</span>{' '}
                                        <span className="font-medium">{p.invoice_no}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Buyer/Order:</span>{' '}
                                        <span className="font-medium">{p.request.buyer.name} / {p.request.order.order_reference}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-xs mb-3 p-2 bg-gray-50 rounded">
                                    <div>
                                        <span className="text-gray-500">Expected:</span>{' '}
                                        <span className="tabular-nums">{formatCurrency(expectedTotal)}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Invoice:</span>{' '}
                                        <span className="tabular-nums font-semibold">{formatCurrency(actualTotal)}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Variance:</span>{' '}
                                        <span className={`tabular-nums font-medium ${variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : ''}`}>
                                            {formatCurrency(Math.abs(variance))} ({variancePct}%)
                                            {variance > 0 ? ' over' : variance < 0 ? ' under' : ''}
                                        </span>
                                    </div>
                                </div>

                                <PurchaseReviewActions purchaseId={p.id} purchaseNo={p.purchase_no} />
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}

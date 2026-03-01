import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import RecordPaymentForm from './RecordPaymentForm';

export default async function PaymentsQueue() {
    await requireRole('ACCOUNTANT');

    const purchases = await prisma.purchase.findMany({
        where: { status: { in: ['APPROVED', 'PARTIALLY_PAID'] } },
        include: {
            request: { include: { buyer: true, order: true } },
            runner: true,
            vendor: true,
            payments: true,
        },
        orderBy: { created_at: 'asc' },
    });

    return (
        <div className="space-y-4">
            <h1 className="text-lg font-semibold text-gray-900">Payment Queue</h1>
            {purchases.length === 0 ? (
                <div className="card p-8 text-center text-xs text-gray-400">
                    No purchases awaiting payment
                </div>
            ) : (
                purchases.map((p) => {
                    const totalPaid = p.payments.reduce((s, py) => s + Number(py.amount_paid), 0);
                    const remaining = Number(p.invoice_amount) - totalPaid;

                    return (
                        <div key={p.id} className="card">
                            <div className="card-header flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Link href={`/dashboard/accountant/transactions/${p.id}`} className="text-sm font-semibold text-blue-600 hover:underline">
                                        {p.purchase_no}
                                    </Link>
                                    <StatusBadge status={p.status} />
                                </div>
                                <span className="text-2xs text-gray-500">{p.runner.name}</span>
                            </div>
                            <div className="card-body">
                                <div className="grid grid-cols-4 gap-3 text-xs mb-3">
                                    <div>
                                        <span className="text-gray-500">Vendor:</span> <span className="font-medium">{p.vendor.name}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Invoice Amount:</span>{' '}
                                        <span className="font-semibold tabular-nums">{formatCurrency(p.invoice_amount)}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Paid:</span>{' '}
                                        <span className="tabular-nums text-green-600">{formatCurrency(totalPaid)}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Remaining:</span>{' '}
                                        <span className="tabular-nums font-semibold text-red-600">{formatCurrency(remaining)}</span>
                                    </div>
                                </div>

                                <RecordPaymentForm
                                    purchaseId={p.id}
                                    purchaseNo={p.purchase_no}
                                    remainingAmount={remaining}
                                />
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function TransactionDetail({
    params,
}: {
    params: { id: string };
}) {
    await requireRole('ACCOUNTANT');

    const purchase = await prisma.purchase.findUnique({
        where: { id: params.id },
        include: {
            request: { include: { buyer: true, order: true, manager: true, lines: { include: { material: true } } } },
            runner: true,
            vendor: true,
            lines: { include: { material: true } },
            payments: { include: { accountant: true } },
            vendorConfirmation: true,
        },
    });

    if (!purchase) notFound();

    const auditLogs = await prisma.auditLog.findMany({
        where: { entity_id: purchase.id },
        include: { performer: true },
        orderBy: { created_at: 'desc' },
    });

    const expectedTotal = purchase.request.lines.reduce((s, l) => s + Number(l.expected_amount), 0);
    const totalPaid = purchase.payments.reduce((s, p) => s + Number(p.amount_paid), 0);

    return (
        <div className="space-y-4 max-w-5xl">
            <div className="flex items-center justify-between">
                <div>
                    <Link href="/dashboard/accountant/all-transactions" className="text-2xs text-blue-600 hover:underline">Back to Transactions</Link>
                    <h1 className="text-lg font-semibold text-gray-900 mt-1">{purchase.purchase_no}</h1>
                </div>
                <StatusBadge status={purchase.status} />
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="card">
                    <div className="card-header"><h2 className="text-xs font-semibold text-gray-700">Purchase Info</h2></div>
                    <div className="card-body space-y-1.5">
                        {[
                            ['Vendor', purchase.vendor.name],
                            ['Runner', purchase.runner.name],
                            ['Invoice No', purchase.invoice_no],
                            ['Invoice Date', formatDateTime(purchase.invoice_date)],
                            ['Invoice Amount', formatCurrency(purchase.invoice_amount)],
                            ['Invoice Type', purchase.invoice_type_submitted],
                        ].map(([label, value]) => (
                            <div key={label} className="flex justify-between text-xs">
                                <span className="text-gray-500">{label}</span>
                                <span className="font-medium">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header"><h2 className="text-xs font-semibold text-gray-700">Request Info</h2></div>
                    <div className="card-body space-y-1.5">
                        {[
                            ['Request No', purchase.request.request_no],
                            ['Buyer', purchase.request.buyer.name],
                            ['Order', purchase.request.order.order_reference],
                            ['Manager', purchase.request.manager.name],
                            ['Expected Total', formatCurrency(expectedTotal)],
                        ].map(([label, value]) => (
                            <div key={label} className="flex justify-between text-xs">
                                <span className="text-gray-500">{label}</span>
                                <span className="font-medium">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header"><h2 className="text-xs font-semibold text-gray-700">Financial Summary</h2></div>
                    <div className="card-body space-y-1.5">
                        {[
                            ['Invoice Amount', formatCurrency(purchase.invoice_amount)],
                            ['Total Paid', formatCurrency(totalPaid)],
                            ['Remaining', formatCurrency(Number(purchase.invoice_amount) - totalPaid)],
                            ['Variance', formatCurrency(Math.abs(Number(purchase.invoice_amount) - expectedTotal))],
                        ].map(([label, value]) => (
                            <div key={label} className="flex justify-between text-xs">
                                <span className="text-gray-500">{label}</span>
                                <span className="font-medium tabular-nums">{value}</span>
                            </div>
                        ))}
                        {purchase.accountant_notes && (
                            <div className="pt-1.5 border-t">
                                <span className="text-2xs text-gray-500">Notes</span>
                                <p className="text-xs text-gray-700">{purchase.accountant_notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Documents */}
            <div className="card">
                <div className="card-header"><h2 className="text-xs font-semibold text-gray-700">Documents</h2></div>
                <div className="card-body space-y-2">
                    <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                        <span className="text-xs">{purchase.invoice_type_submitted === 'PROVISIONAL' ? 'Provisional Invoice' : 'Tax Invoice'}</span>
                        {(purchase.provisional_invoice_path || purchase.tax_invoice_path) ?
                            <span className="badge-green">Uploaded</span> : <span className="badge-gray">Missing</span>}
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                        <span className="text-xs">Payment Receipt</span>
                        {purchase.payments.length > 0 ?
                            <span className="badge-green">{purchase.payments.length} receipt(s)</span> : <span className="badge-gray">Pending</span>}
                    </div>
                    {purchase.invoice_type_submitted === 'PROVISIONAL' && (
                        <div className="flex items-center justify-between py-1.5">
                            <span className="text-xs">Final GST Tax Invoice</span>
                            {purchase.tax_invoice_path ? <span className="badge-green">Received</span> : <span className="badge-red">Pending Upload</span>}
                        </div>
                    )}
                </div>
            </div>

            {/* Purchase Lines */}
            <div className="card">
                <div className="card-header"><h2 className="text-xs font-semibold text-gray-700">Purchase Lines</h2></div>
                <table className="w-full text-xs">
                    <thead><tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Material</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Qty</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Rate</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
                    </tr></thead>
                    <tbody>
                        {purchase.lines.map((l) => (
                            <tr key={l.id} className="border-b border-gray-100 even:bg-gray-50">
                                <td className="px-3 py-2">{l.material.sku_code} - {l.material.description}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{Number(l.quantity)}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(l.rate)}</td>
                                <td className="px-3 py-2 text-right tabular-nums font-medium">{formatCurrency(l.amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Payments */}
            {purchase.payments.length > 0 && (
                <div className="card">
                    <div className="card-header"><h2 className="text-xs font-semibold text-gray-700">Payment History</h2></div>
                    <table className="w-full text-xs">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">Method</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">Reference</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">Recorded By</th>
                        </tr></thead>
                        <tbody>
                            {purchase.payments.map((p) => (
                                <tr key={p.id} className="border-b border-gray-100 even:bg-gray-50">
                                    <td className="px-3 py-2 tabular-nums">{formatDateTime(p.payment_date)}</td>
                                    <td className="px-3 py-2">{p.payment_method}</td>
                                    <td className="px-3 py-2 text-right tabular-nums font-medium">{formatCurrency(p.amount_paid)}</td>
                                    <td className="px-3 py-2 text-gray-500">{p.reference_id || '-'}</td>
                                    <td className="px-3 py-2 text-gray-500">{p.accountant.name}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Vendor Confirmation */}
            {purchase.vendorConfirmation && (
                <div className="card">
                    <div className="card-header"><h2 className="text-xs font-semibold text-gray-700">Vendor Confirmation</h2></div>
                    <div className="card-body space-y-1.5">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Status</span>
                            <span className={
                                purchase.vendorConfirmation.status === 'VENDOR_CONFIRMED' ? 'badge-green' :
                                    purchase.vendorConfirmation.status === 'SHOWN_TO_VENDOR' ? 'badge-blue' : 'badge-gray'
                            }>{purchase.vendorConfirmation.status.replace(/_/g, ' ')}</span>
                        </div>
                        {purchase.vendorConfirmation.shown_to_vendor_at && (
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Shown At</span>
                                <span className="tabular-nums">{formatDateTime(purchase.vendorConfirmation.shown_to_vendor_at)}</span>
                            </div>
                        )}
                        {purchase.vendorConfirmation.runner_remark && (
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Remark</span>
                                <span>{purchase.vendorConfirmation.runner_remark}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Audit Log */}
            {auditLogs.length > 0 && (
                <div className="card">
                    <div className="card-header"><h2 className="text-xs font-semibold text-gray-700">Audit Trail</h2></div>
                    <div className="divide-y divide-gray-100">
                        {auditLogs.map((log) => (
                            <div key={log.id} className="px-3 py-2 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-medium text-gray-800">{log.action}</span>
                                    <span className="text-2xs text-gray-500 ml-2">by {log.performer.name}</span>
                                </div>
                                <span className="text-2xs text-gray-400 tabular-nums">{formatDateTime(log.created_at)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

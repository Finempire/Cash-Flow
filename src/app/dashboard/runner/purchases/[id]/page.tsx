import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PurchaseActions from './PurchaseActions';

export default async function RunnerPurchaseDetail({
    params,
}: {
    params: { id: string };
}) {
    const session = await requireRole('RUNNER');

    const purchase = await prisma.purchase.findUnique({
        where: { id: params.id },
        include: {
            request: {
                include: { buyer: true, order: true, lines: { include: { material: true } } },
            },
            runner: true,
            vendor: true,
            lines: { include: { material: true } },
            payments: { include: { accountant: true } },
            vendorConfirmation: true,
        },
    });

    if (!purchase) notFound();

    return (
        <div className="space-y-4 max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <Link href="/dashboard/runner/my-purchases" className="text-2xs text-blue-600 hover:underline">
                        Back to My Purchases
                    </Link>
                    <h1 className="text-lg font-semibold text-gray-900 mt-1">{purchase.purchase_no}</h1>
                </div>
                <StatusBadge status={purchase.status} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="card">
                    <div className="card-header">
                        <h2 className="text-xs font-semibold text-gray-700">Purchase Details</h2>
                    </div>
                    <div className="card-body space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Vendor</span>
                            <span className="font-medium">{purchase.vendor.name}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Invoice No</span>
                            <span className="font-medium">{purchase.invoice_no}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Invoice Date</span>
                            <span className="tabular-nums">{formatDateTime(purchase.invoice_date)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Invoice Amount</span>
                            <span className="font-semibold tabular-nums">{formatCurrency(purchase.invoice_amount)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Invoice Type</span>
                            <span className={purchase.invoice_type_submitted === 'TAX' ? 'badge-green' : 'badge-amber'}>
                                {purchase.invoice_type_submitted}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h2 className="text-xs font-semibold text-gray-700">Request Information</h2>
                    </div>
                    <div className="card-body space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Request</span>
                            <span className="font-medium">{purchase.request.request_no}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Buyer</span>
                            <span>{purchase.request.buyer.name}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Order</span>
                            <span>{purchase.request.order.order_reference}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Documents Section */}
            <div className="card">
                <div className="card-header">
                    <h2 className="text-xs font-semibold text-gray-700">Documents</h2>
                </div>
                <div className="card-body space-y-2">
                    <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                        <div>
                            <p className="text-xs font-medium text-gray-800">
                                {purchase.invoice_type_submitted === 'PROVISIONAL' ? 'Provisional Invoice / Slip' : 'Tax Invoice'}
                            </p>
                            <p className="text-2xs text-gray-500">Uploaded at purchase creation</p>
                        </div>
                        {(purchase.provisional_invoice_path || purchase.tax_invoice_path) ? (
                            <span className="badge-green">Uploaded</span>
                        ) : (
                            <span className="badge-gray">Not uploaded</span>
                        )}
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                        <div>
                            <p className="text-xs font-medium text-gray-800">Payment Receipt</p>
                            <p className="text-2xs text-gray-500">Uploaded by accountant</p>
                        </div>
                        {purchase.payments.length > 0 ? (
                            <span className="badge-green">Available ({purchase.payments.length})</span>
                        ) : (
                            <span className="badge-gray">Awaiting payment</span>
                        )}
                    </div>

                    {purchase.invoice_type_submitted === 'PROVISIONAL' && (
                        <div className="flex items-center justify-between py-1.5">
                            <div>
                                <p className="text-xs font-medium text-gray-800">Final GST Tax Invoice</p>
                                <p className="text-2xs text-gray-500">Required for compliance</p>
                            </div>
                            {purchase.tax_invoice_path ? (
                                <span className="badge-green">Received</span>
                            ) : (
                                <span className="badge-amber">Pending Upload</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Payments */}
            {purchase.payments.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <h2 className="text-xs font-semibold text-gray-700">Payment Records</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Method</th>
                                    <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Reference</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Recorded By</th>
                                </tr>
                            </thead>
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
                </div>
            )}

            {/* Vendor Confirmation & Tax Invoice Actions */}
            <PurchaseActions
                purchaseId={purchase.id}
                status={purchase.status}
                invoiceType={purchase.invoice_type_submitted}
                vendorConfirmation={purchase.vendorConfirmation ? {
                    status: purchase.vendorConfirmation.status,
                    shown_to_vendor_at: purchase.vendorConfirmation.shown_to_vendor_at?.toISOString() || null,
                    vendor_confirmed_at: purchase.vendorConfirmation.vendor_confirmed_at?.toISOString() || null,
                    runner_remark: purchase.vendorConfirmation.runner_remark,
                } : null}
                hasTaxInvoice={!!purchase.tax_invoice_path}
                isAssignedRunner={purchase.runner_id === session.user.id}
            />
        </div>
    );
}

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PurchaseActions from './PurchaseActions';
import { generateSignedUrl } from '@/lib/fileStorage';
import { Eye, Download, FileText } from 'lucide-react';

function DocumentRow({
    label,
    filePath,
    status,
}: {
    label: string;
    filePath: string | null;
    status: 'uploaded' | 'pending' | 'awaiting';
}) {
    const viewUrl = filePath ? generateSignedUrl(filePath) : null;
    const downloadUrl = filePath ? `${generateSignedUrl(filePath)}&download=1` : null;

    return (
        <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
                <FileText size={14} className="text-gray-400 shrink-0" />
                <div>
                    <p className="text-xs font-medium text-gray-800">{label}</p>
                    {filePath && (
                        <p className="text-2xs text-gray-400 truncate max-w-[160px]">
                            {filePath.split('/').pop()}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {status === 'uploaded' && filePath ? (
                    <>
                        <span className="badge-green">Uploaded</span>
                        <a
                            href={viewUrl!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary text-2xs p-1.5 flex items-center gap-1"
                            title="View"
                        >
                            <Eye size={12} />
                            <span className="hidden sm:inline">View</span>
                        </a>
                        <a
                            href={downloadUrl!}
                            download
                            className="btn-secondary text-2xs p-1.5 flex items-center gap-1"
                            title="Download"
                        >
                            <Download size={12} />
                            <span className="hidden sm:inline">Download</span>
                        </a>
                    </>
                ) : status === 'pending' ? (
                    <span className="badge-amber">Pending Upload</span>
                ) : (
                    <span className="badge-gray">Awaiting Payment</span>
                )}
            </div>
        </div>
    );
}

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

    const primaryDoc =
        purchase.invoice_type_submitted === 'PROVISIONAL'
            ? purchase.provisional_invoice_path
            : purchase.tax_invoice_path;

    return (
        <div className="space-y-4 max-w-4xl pb-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div>
                    <Link
                        href="/dashboard/runner/my-purchases"
                        className="text-2xs text-blue-600 hover:underline"
                    >
                        ← Back to My Purchases
                    </Link>
                    <h1 className="text-lg font-semibold text-gray-900 mt-1">
                        {purchase.purchase_no}
                    </h1>
                </div>
                <StatusBadge status={purchase.status} />
            </div>

            {/* Purchase + Request Details — stacked on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="card">
                    <div className="card-header">
                        <h2 className="text-xs font-semibold text-gray-700">Purchase Details</h2>
                    </div>
                    <div className="card-body space-y-2">
                        {[
                            ['Vendor', purchase.vendor.name],
                            ['Invoice No', purchase.invoice_no],
                            ['Invoice Date', formatDateTime(purchase.invoice_date)],
                            ['Invoice Amount', formatCurrency(purchase.invoice_amount)],
                        ].map(([label, value]) => (
                            <div key={label} className="flex justify-between text-xs">
                                <span className="text-gray-500">{label}</span>
                                <span className="font-medium text-right">{value}</span>
                            </div>
                        ))}
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
                        {[
                            ['Request', purchase.request.request_no],
                            ['Buyer', purchase.request.buyer.name],
                            ['Order', purchase.request.order.order_reference],
                        ].map(([label, value]) => (
                            <div key={label} className="flex justify-between text-xs">
                                <span className="text-gray-500">{label}</span>
                                <span className="font-medium text-right">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Documents Section */}
            <div className="card">
                <div className="card-header">
                    <h2 className="text-xs font-semibold text-gray-700">Documents</h2>
                </div>
                <div className="card-body">
                    <DocumentRow
                        label={
                            purchase.invoice_type_submitted === 'PROVISIONAL'
                                ? 'Provisional Invoice / Slip'
                                : 'Tax Invoice'
                        }
                        filePath={primaryDoc}
                        status={primaryDoc ? 'uploaded' : 'pending'}
                    />
                    <DocumentRow
                        label="Payment Receipt"
                        filePath={purchase.payments[0]?.payment_proof_path || null}
                        status={purchase.payments.length > 0 ? 'uploaded' : 'awaiting'}
                    />
                    {purchase.invoice_type_submitted === 'PROVISIONAL' && (
                        <DocumentRow
                            label="Final GST Tax Invoice"
                            filePath={purchase.tax_invoice_path}
                            status={purchase.tax_invoice_path ? 'uploaded' : 'pending'}
                        />
                    )}
                </div>
            </div>

            {/* Payment Records */}
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
                                    <th className="text-left px-3 py-2 font-medium text-gray-600 hidden sm:table-cell">Reference</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600 hidden sm:table-cell">Recorded By</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchase.payments.map((p) => (
                                    <tr key={p.id} className="border-b border-gray-100 even:bg-gray-50">
                                        <td className="px-3 py-2 tabular-nums">{formatDateTime(p.payment_date)}</td>
                                        <td className="px-3 py-2">{p.payment_method}</td>
                                        <td className="px-3 py-2 text-right tabular-nums font-medium">
                                            {formatCurrency(p.amount_paid)}
                                        </td>
                                        <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">
                                            {p.reference_id || '-'}
                                        </td>
                                        <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">
                                            {p.accountant.name}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Actions: Vendor Confirmation + Tax Invoice Upload */}
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

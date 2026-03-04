import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { generateSignedUrl } from '@/lib/fileStorage';
import { Eye, Download, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';

function DocumentCard({
    label,
    filePath,
    status,
    role,
}: {
    label: string;
    filePath: string | null;
    status: 'uploaded' | 'pending' | 'awaiting';
    role: string;
}) {
    const viewUrl = filePath ? generateSignedUrl(filePath) : null;
    const downloadUrl = filePath ? `${generateSignedUrl(filePath)}&download=1` : null;
    const canDownload = role !== 'CEO';

    return (
        <div className={`flex flex-col gap-2 p-3 rounded-lg border ${status === 'uploaded' ? 'border-green-200 bg-green-50' :
            status === 'pending' ? 'border-amber-200 bg-amber-50' :
                'border-gray-200 bg-gray-50'
            }`}>
            <div className="flex items-center gap-2">
                <FileText size={16} className={
                    status === 'uploaded' ? 'text-green-600' :
                        status === 'pending' ? 'text-amber-600' : 'text-gray-400'
                } />
                <span className="text-xs font-semibold text-gray-800">{label}</span>
            </div>
            <div className="flex items-center gap-1.5">
                {status === 'uploaded' ? (
                    <><CheckCircle size={12} className="text-green-600" /><span className="badge-green">Uploaded</span></>
                ) : status === 'pending' ? (
                    <><AlertCircle size={12} className="text-amber-600" /><span className="badge-amber">Pending</span></>
                ) : (
                    <><Clock size={12} className="text-gray-400" /><span className="badge-gray">Awaiting payment</span></>
                )}
            </div>
            {filePath && (
                <p className="text-2xs text-gray-500 truncate">{filePath.split('/').pop()}</p>
            )}
            {viewUrl && (
                <div className="flex gap-2 mt-1">
                    <a
                        href={viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-2xs flex items-center gap-1"
                    >
                        <Eye size={11} /> View
                    </a>
                    {canDownload && downloadUrl && (
                        <a
                            href={downloadUrl}
                            download
                            className="btn-secondary text-2xs flex items-center gap-1"
                        >
                            <Download size={11} /> Download
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}

export default async function TransactionDetail({
    params,
}: {
    params: { id: string };
}) {
    const session = await requireRole('ACCOUNTANT');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const purchase = await (prisma.purchase.findUnique as any)({
        where: { id: params.id },
        include: {
            request: { include: { buyer: true, order: true, manager: true, preferred_vendor: true, lines: { include: { material: true } } } },
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

    const expectedTotal = purchase.request.lines.reduce((s: number, l: { expected_amount: number }) => s + Number(l.expected_amount), 0);
    const totalPaid = purchase.payments.reduce((s: number, p: { amount_paid: number }) => s + Number(p.amount_paid), 0);

    const primaryDocPath =
        purchase.invoice_type_submitted === 'PROVISIONAL'
            ? purchase.provisional_invoice_path
            : purchase.tax_invoice_path;

    const userRole = session.user.role;

    // Preferred vendor from request level
    const preferredVendor = purchase.request.preferred_vendor ?? null;
    const vendorDiffers = preferredVendor && preferredVendor.id !== purchase.vendor_id;

    return (
        <div className="space-y-4 max-w-5xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div>
                    <Link href="/dashboard/accountant/all-transactions" className="text-2xs text-blue-600 hover:underline">
                        ← Back to Transactions
                    </Link>
                    <h1 className="text-lg font-semibold text-gray-900 mt-1">{purchase.purchase_no}</h1>
                </div>
                <StatusBadge status={purchase.status} />
            </div>

            {/* Purchase / Request / Financial — responsive 3-col to 1-col */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card">
                    <div className="card-header"><h2 className="text-xs font-semibold text-gray-700">Purchase Info</h2></div>
                    <div className="card-body space-y-1.5">
                        {[
                            ['Runner', purchase.runner.name],
                            ['Invoice No', purchase.invoice_no],
                            ['Invoice Date', formatDateTime(purchase.invoice_date)],
                            ['Invoice Amount', formatCurrency(purchase.invoice_amount)],
                            ['Invoice Type', purchase.invoice_type_submitted],
                        ].map(([label, value]) => (
                            <div key={label} className="flex justify-between text-xs">
                                <span className="text-gray-500">{label}</span>
                                <span className="font-medium text-right">{value}</span>
                            </div>
                        ))}
                        {/* Vendor comparison */}
                        <div className="pt-1.5 border-t border-gray-100 space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Preferred Vendor</span>
                                <span className="font-medium text-right">{preferredVendor?.name ?? 'Any Vendor'}</span>
                            </div>
                            <div className="flex justify-between text-xs items-center gap-2">
                                <span className="text-gray-500">Actual Vendor</span>
                                <span className="flex items-center gap-1.5 font-medium text-right">
                                    {purchase.vendor.name}
                                    {vendorDiffers && (
                                        <span className="bg-orange-100 text-orange-700 text-2xs px-1.5 py-0.5 rounded font-normal whitespace-nowrap">
                                            Different from requested
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>
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
                                <span className="font-medium text-right">{value}</span>
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
                                <span className="font-medium tabular-nums text-right">{value}</span>
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

            {/* Documents — compact 3-card row */}
            <div className="card">
                <div className="card-header">
                    <h2 className="text-xs font-semibold text-gray-700">Documents</h2>
                </div>
                <div className="card-body">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <DocumentCard
                            label={purchase.invoice_type_submitted === 'PROVISIONAL' ? 'Provisional Invoice' : 'Tax Invoice'}
                            filePath={primaryDocPath}
                            status={primaryDocPath ? 'uploaded' : 'pending'}
                            role={userRole}
                        />
                        <DocumentCard
                            label="Payment Proof"
                            filePath={purchase.payments[0]?.payment_proof_path || null}
                            status={purchase.payments.length > 0 ? 'uploaded' : 'awaiting'}
                            role={userRole}
                        />
                        <DocumentCard
                            label="Final GST Tax Invoice"
                            filePath={purchase.invoice_type_submitted === 'PROVISIONAL' ? purchase.tax_invoice_path : null}
                            status={
                                purchase.invoice_type_submitted !== 'PROVISIONAL' ? 'uploaded' :
                                    purchase.tax_invoice_path ? 'uploaded' : 'pending'
                            }
                            role={userRole}
                        />
                    </div>
                </div>
            </div>

            {/* Purchase Lines */}
            <div className="card">
                <div className="card-header"><h2 className="text-xs font-semibold text-gray-700">Purchase Lines</h2></div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-3 py-2 font-medium text-gray-600">Material</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600">Qty</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600">Rate</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
                        </tr></thead>
                        <tbody>
                            {purchase.lines.map((l: { id: string; material: { sku_code: string; description: string }; quantity: number; rate: number; amount: number }) => (
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
            </div>

            {/* Payments */}
            {purchase.payments.length > 0 && (
                <div className="card">
                    <div className="card-header"><h2 className="text-xs font-semibold text-gray-700">Payment History</h2></div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Method</th>
                                <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600 hidden sm:table-cell">Reference</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600 hidden sm:table-cell">Recorded By</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Proof</th>
                            </tr></thead>
                            <tbody>
                                {purchase.payments.map((p: { id: string; payment_date: string; payment_method: string; amount_paid: number; reference_id: string | null; accountant: { name: string }; payment_proof_path: string | null }) => (
                                    <tr key={p.id} className="border-b border-gray-100 even:bg-gray-50">
                                        <td className="px-3 py-2 tabular-nums">{formatDateTime(p.payment_date)}</td>
                                        <td className="px-3 py-2">{p.payment_method}</td>
                                        <td className="px-3 py-2 text-right tabular-nums font-medium">{formatCurrency(p.amount_paid)}</td>
                                        <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{p.reference_id || '-'}</td>
                                        <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{p.accountant.name}</td>
                                        <td className="px-3 py-2">
                                            {p.payment_proof_path ? (
                                                <div className="flex gap-1">
                                                    <a
                                                        href={generateSignedUrl(p.payment_proof_path)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn-ghost text-2xs p-1 flex items-center gap-0.5"
                                                    >
                                                        <Eye size={11} /> View
                                                    </a>
                                                    {userRole !== 'CEO' && (
                                                        <a
                                                            href={`${generateSignedUrl(p.payment_proof_path)}&download=1`}
                                                            download
                                                            className="btn-ghost text-2xs p-1 flex items-center gap-0.5"
                                                        >
                                                            <Download size={11} /> DL
                                                        </a>
                                                    )}
                                                </div>
                                            ) : <span className="badge-gray">None</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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

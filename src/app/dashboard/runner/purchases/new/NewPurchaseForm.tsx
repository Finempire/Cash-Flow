'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createPurchase } from '@/app/actions/purchases';
import FileUpload from '@/components/ui/FileUpload';
import AddVendorModal, { type CreatedVendor } from '@/components/ui/AddVendorModal';

interface Vendor { id: string; name: string; gstin: string; }
interface RequestLine {
    material_id: string;
    material_name: string;
    unit: string;
    expected_qty: number;
    expected_rate: number;
    preferred_vendor_id: string | null;
    preferred_vendor_name: string | null;
}

const ADD_NEW_VENDOR = '__ADD_NEW_VENDOR__';

export default function NewPurchaseForm({
    requestId,
    vendors: initialVendors,
    requestLines,
}: {
    requestId: string;
    vendors: Vendor[];
    requestLines: RequestLine[];
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Determine a default vendor from first line's preferred vendor
    const firstPreferred = requestLines[0]?.preferred_vendor_id || '';
    const [vendorId, setVendorId] = useState(firstPreferred);
    const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
    const [showVendorModal, setShowVendorModal] = useState(false);

    const [invoiceNo, setInvoiceNo] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [invoiceType, setInvoiceType] = useState<'PROVISIONAL' | 'TAX'>('TAX');
    const [invoiceFilePath, setInvoiceFilePath] = useState<string | null>(null);
    const [invoiceFileError, setInvoiceFileError] = useState<string | null>(null);
    const [lines, setLines] = useState(
        requestLines.map((l) => ({ material_id: l.material_id, quantity: l.expected_qty, rate: l.expected_rate }))
    );

    const totalAmount = lines.reduce((sum, l) => sum + l.quantity * l.rate, 0);

    const updateLine = (index: number, field: 'quantity' | 'rate', value: number) => {
        const updated = [...lines];
        updated[index] = { ...updated[index], [field]: value };
        setLines(updated);
    };

    const handleVendorChange = (val: string) => {
        if (val === ADD_NEW_VENDOR) { setShowVendorModal(true); return; }
        setVendorId(val);
    };

    const handleVendorCreated = (v: CreatedVendor) => {
        setVendors((prev) => [...prev, v]);
        setVendorId(v.id);
        setShowVendorModal(false);
    };

    // Build preferred vendor info banner
    const preferredVendorId = requestLines[0]?.preferred_vendor_id;
    const preferredVendorName = requestLines[0]?.preferred_vendor_name;
    const showBanner = !!preferredVendorId && !!preferredVendorName;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vendorId || !invoiceNo) { toast.error('Vendor and invoice number are required'); return; }
        if (!invoiceFilePath) { setInvoiceFileError('Invoice document is required before submitting'); return; }
        setInvoiceFileError(null);
        setLoading(true);
        try {
            const result = await createPurchase({
                request_id: requestId, vendor_id: vendorId,
                invoice_no: invoiceNo, invoice_date: invoiceDate,
                invoice_amount: totalAmount, invoice_type_submitted: invoiceType,
                invoice_file_key: invoiceFilePath, lines,
            });
            toast.success(`Purchase ${result.purchase_no} created`);
            router.push('/dashboard/runner/my-purchases');
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create purchase');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-4 pb-20 sm:pb-0">
                {/* Invoice Details */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="text-xs font-semibold text-gray-700">Invoice Details</h2>
                    </div>
                    <div className="card-body">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="label">Vendor</label>
                                {/* Info banner if preferred vendor */}
                                {showBanner && (
                                    <div className="mb-1.5 p-2 bg-blue-50 border-l-4 border-blue-400 rounded text-xs text-blue-800">
                                        Store Manager preferred: <span className="font-semibold">{preferredVendorName}</span> — you may change if needed
                                    </div>
                                )}
                                <select
                                    value={vendorId}
                                    onChange={(e) => handleVendorChange(e.target.value)}
                                    className="select h-12 sm:h-8 w-full"
                                    required
                                >
                                    <option value="">Select vendor</option>
                                    {vendors.map((v) => (
                                        <option key={v.id} value={v.id}>{v.name}{v.gstin ? ` (${v.gstin})` : ''}</option>
                                    ))}
                                    <option disabled>──────────────</option>
                                    <option value={ADD_NEW_VENDOR}>+ Add New Vendor</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Invoice Number</label>
                                <input type="text" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="input h-12 sm:h-8" required placeholder="e.g. INV-2024-001" />
                            </div>
                            <div>
                                <label className="label">Invoice Date</label>
                                <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="input h-12 sm:h-8" required />
                            </div>
                            <div>
                                <label className="label">Invoice Type</label>
                                <select value={invoiceType} onChange={(e) => { setInvoiceType(e.target.value as 'PROVISIONAL' | 'TAX'); setInvoiceFilePath(null); setInvoiceFileError(null); }} className="select h-12 sm:h-8" required>
                                    <option value="TAX">Tax Invoice / Final GST Bill</option>
                                    <option value="PROVISIONAL">Provisional Invoice / Slip</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Invoice Document Upload */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="text-xs font-semibold text-gray-700">Invoice Document</h2>
                    </div>
                    <div className="card-body">
                        <FileUpload
                            type={invoiceType === 'PROVISIONAL' ? 'PROVISIONAL_INVOICE' : 'TAX_INVOICE'}
                            onUploaded={(path) => { setInvoiceFilePath(path); setInvoiceFileError(null); }}
                            label={invoiceType === 'PROVISIONAL' ? 'Provisional Invoice / Slip' : 'Tax Invoice / Final GST Bill'}
                            required disabled={loading}
                        />
                        {invoiceFileError && <p className="mt-2 text-xs text-red-600 font-medium">⚠ {invoiceFileError}</p>}
                    </div>
                </div>

                {/* Material Lines */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="text-xs font-semibold text-gray-700">Material Lines</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Material</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Unit</th>
                                    <th className="text-right px-3 py-2 font-medium text-gray-600">Exp Qty</th>
                                    <th className="text-right px-3 py-2 font-medium text-gray-600">Actual Qty</th>
                                    <th className="text-right px-3 py-2 font-medium text-gray-600">Exp Rate</th>
                                    <th className="text-right px-3 py-2 font-medium text-gray-600">Actual Rate</th>
                                    <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requestLines.map((rl, i) => (
                                    <tr key={i} className="border-b border-gray-100">
                                        <td className="px-3 py-1.5 text-gray-700">{rl.material_name}</td>
                                        <td className="px-3 py-1.5 text-gray-500">{rl.unit}</td>
                                        <td className="px-3 py-1.5 text-right text-gray-400 tabular-nums">{rl.expected_qty}</td>
                                        <td className="px-3 py-1.5">
                                            <input type="number" value={lines[i].quantity || ''} onChange={(e) => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)} className="input text-xs text-right tabular-nums w-24" min="0.01" step="0.01" required />
                                        </td>
                                        <td className="px-3 py-1.5 text-right text-gray-400 tabular-nums">{rl.expected_rate.toFixed(2)}</td>
                                        <td className="px-3 py-1.5">
                                            <input type="number" value={lines[i].rate || ''} onChange={(e) => updateLine(i, 'rate', parseFloat(e.target.value) || 0)} className="input text-xs text-right tabular-nums w-28" min="0.01" step="0.01" required />
                                        </td>
                                        <td className="px-3 py-1.5 text-right tabular-nums font-medium">{(lines[i].quantity * lines[i].rate).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-50 border-t border-gray-200">
                                    <td colSpan={6} className="px-3 py-2 text-right font-medium text-gray-700">Total Invoice Amount:</td>
                                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-900">{totalAmount.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Desktop buttons */}
                <div className="hidden sm:flex justify-end gap-2">
                    <button type="button" onClick={() => router.back()} className="btn-secondary" disabled={loading}>Cancel</button>
                    <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Submitting...' : 'Submit Purchase'}</button>
                </div>
                {/* Mobile fixed bottom button */}
                <div className="fixed bottom-0 left-0 right-0 sm:hidden p-3 bg-white border-t border-gray-200 z-40">
                    <button type="submit" className="w-full h-14 bg-blue-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50" disabled={loading}>
                        {loading ? 'Submitting...' : 'Submit Purchase'}
                    </button>
                </div>
            </form>

            {showVendorModal && (
                <AddVendorModal stage="PURCHASE" onCreated={handleVendorCreated} onClose={() => setShowVendorModal(false)} />
            )}
        </>
    );
}

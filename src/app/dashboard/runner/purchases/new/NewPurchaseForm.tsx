'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createPurchase } from '@/app/actions/purchases';

interface Vendor { id: string; name: string; gstin: string; }
interface RequestLine {
    material_id: string;
    material_name: string;
    unit: string;
    expected_qty: number;
    expected_rate: number;
}

export default function NewPurchaseForm({
    requestId,
    vendors,
    requestLines,
}: {
    requestId: string;
    vendors: Vendor[];
    requestLines: RequestLine[];
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [vendorId, setVendorId] = useState('');
    const [invoiceNo, setInvoiceNo] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [invoiceType, setInvoiceType] = useState<'PROVISIONAL' | 'TAX'>('TAX');
    const [lines, setLines] = useState(
        requestLines.map((l) => ({
            material_id: l.material_id,
            quantity: l.expected_qty,
            rate: l.expected_rate,
        }))
    );

    const totalAmount = lines.reduce((sum, l) => sum + l.quantity * l.rate, 0);

    const updateLine = (index: number, field: 'quantity' | 'rate', value: number) => {
        const updated = [...lines];
        updated[index] = { ...updated[index], [field]: value };
        setLines(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vendorId || !invoiceNo) {
            toast.error('Vendor and invoice number are required');
            return;
        }

        setLoading(true);
        try {
            const result = await createPurchase({
                request_id: requestId,
                vendor_id: vendorId,
                invoice_no: invoiceNo,
                invoice_date: invoiceDate,
                invoice_amount: totalAmount,
                invoice_type_submitted: invoiceType,
                lines,
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
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="card">
                <div className="card-header">
                    <h2 className="text-xs font-semibold text-gray-700">Invoice Details</h2>
                </div>
                <div className="card-body">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">Vendor</label>
                            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="select" required>
                                <option value="">Select vendor</option>
                                {vendors.map((v) => (
                                    <option key={v.id} value={v.id}>{v.name} {v.gstin ? `(${v.gstin})` : ''}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Invoice Number</label>
                            <input type="text" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="input" required />
                        </div>
                        <div>
                            <label className="label">Invoice Date</label>
                            <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="input" required />
                        </div>
                        <div>
                            <label className="label">Invoice Type</label>
                            <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value as 'PROVISIONAL' | 'TAX')} className="select" required>
                                <option value="TAX">Tax Invoice</option>
                                <option value="PROVISIONAL">Provisional Invoice / Slip</option>
                            </select>
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
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Material</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Unit</th>
                                <th className="text-right px-3 py-2 font-medium text-gray-600">Expected Qty</th>
                                <th className="text-right px-3 py-2 font-medium text-gray-600">Actual Qty</th>
                                <th className="text-right px-3 py-2 font-medium text-gray-600">Expected Rate</th>
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
                                        <input
                                            type="number"
                                            value={lines[i].quantity || ''}
                                            onChange={(e) => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)}
                                            className="input text-xs text-right tabular-nums w-24"
                                            min="0.01"
                                            step="0.01"
                                            required
                                        />
                                    </td>
                                    <td className="px-3 py-1.5 text-right text-gray-400 tabular-nums">{rl.expected_rate.toFixed(2)}</td>
                                    <td className="px-3 py-1.5">
                                        <input
                                            type="number"
                                            value={lines[i].rate || ''}
                                            onChange={(e) => updateLine(i, 'rate', parseFloat(e.target.value) || 0)}
                                            className="input text-xs text-right tabular-nums w-28"
                                            min="0.01"
                                            step="0.01"
                                            required
                                        />
                                    </td>
                                    <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                                        {(lines[i].quantity * lines[i].rate).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50 border-t border-gray-200">
                                <td colSpan={6} className="px-3 py-2 text-right font-medium text-gray-700">
                                    Total Invoice Amount:
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-900">
                                    {totalAmount.toFixed(2)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <button type="button" onClick={() => router.back()} className="btn-secondary" disabled={loading}>
                    Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit Purchase'}
                </button>
            </div>
        </form>
    );
}

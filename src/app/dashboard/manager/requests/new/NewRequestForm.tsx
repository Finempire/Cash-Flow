'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createMaterialRequest } from '@/app/actions/material-requests';
import { Plus, Trash2 } from 'lucide-react';

interface Buyer { id: string; name: string; brand_code: string; }
interface OrderItem { id: string; order_reference: string; buyer_id: string; style_name: string; }
interface MaterialItem { id: string; sku_code: string; description: string; unit_of_measure: string; default_rate?: number; }

interface Line {
    material_id: string;
    description: string;
    quantity: number;
    expected_rate: number;
}

export default function NewRequestForm({
    buyers,
    orders,
    materials,
}: {
    buyers: Buyer[];
    orders: OrderItem[];
    materials: MaterialItem[];
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [buyerId, setBuyerId] = useState('');
    const [orderId, setOrderId] = useState('');
    const [storeLocation, setStoreLocation] = useState('');
    const [expectedDate, setExpectedDate] = useState('');
    const [remarks, setRemarks] = useState('');
    const [lines, setLines] = useState<Line[]>([
        { material_id: '', description: '', quantity: 0, expected_rate: 0 },
    ]);

    const filteredOrders = orders.filter((o) => !buyerId || o.buyer_id === buyerId);

    const addLine = () => {
        setLines([...lines, { material_id: '', description: '', quantity: 0, expected_rate: 0 }]);
    };

    const removeLine = (index: number) => {
        if (lines.length > 1) {
            setLines(lines.filter((_, i) => i !== index));
        }
    };

    const updateLine = (index: number, field: keyof Line, value: string | number) => {
        const updated = [...lines];
        if (field === 'material_id') {
            const mat = materials.find((m) => m.id === value);
            updated[index] = {
                ...updated[index],
                material_id: value as string,
                description: mat?.description || '',
                expected_rate: mat?.default_rate || updated[index].expected_rate,
            };
        } else {
            updated[index] = { ...updated[index], [field]: value };
        }
        setLines(updated);
    };

    const totalAmount = lines.reduce((sum, l) => sum + l.quantity * l.expected_rate, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!buyerId || !orderId) {
            toast.error('Buyer and order are required');
            return;
        }
        if (lines.some((l) => !l.material_id || l.quantity <= 0 || l.expected_rate <= 0)) {
            toast.error('All material lines must have valid material, quantity, and rate');
            return;
        }

        setLoading(true);
        try {
            const result = await createMaterialRequest({
                buyer_id: buyerId,
                order_id: orderId,
                store_location: storeLocation || undefined,
                expected_date: expectedDate || undefined,
                remarks: remarks || undefined,
                lines: lines.map((l) => ({
                    material_id: l.material_id,
                    description: l.description || undefined,
                    quantity: l.quantity,
                    expected_rate: l.expected_rate,
                })),
            });

            toast.success(`Request ${result.request_no} created`);
            router.push('/dashboard/manager/requests');
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-4xl">
            <div className="card">
                <div className="card-header">
                    <h2 className="text-xs font-semibold text-gray-700">Request Details</h2>
                </div>
                <div className="card-body">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">Buyer</label>
                            <select
                                value={buyerId}
                                onChange={(e) => { setBuyerId(e.target.value); setOrderId(''); }}
                                className="select"
                                required
                            >
                                <option value="">Select buyer</option>
                                {buyers.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name} ({b.brand_code})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Order</label>
                            <select
                                value={orderId}
                                onChange={(e) => setOrderId(e.target.value)}
                                className="select"
                                required
                            >
                                <option value="">Select order</option>
                                {filteredOrders.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.order_reference} {o.style_name ? `- ${o.style_name}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Store Location</label>
                            <input
                                type="text"
                                value={storeLocation}
                                onChange={(e) => setStoreLocation(e.target.value)}
                                className="input"
                                placeholder="e.g. Main Store"
                            />
                        </div>
                        <div>
                            <label className="label">Expected Date</label>
                            <input
                                type="date"
                                value={expectedDate}
                                onChange={(e) => setExpectedDate(e.target.value)}
                                className="input"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="label">Remarks</label>
                            <textarea
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                className="textarea"
                                rows={2}
                                placeholder="Additional notes..."
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header flex items-center justify-between">
                    <h2 className="text-xs font-semibold text-gray-700">Material Lines</h2>
                    <button type="button" onClick={addLine} className="btn-secondary text-2xs">
                        <Plus size={12} /> Add Line
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-3 py-2 font-medium text-gray-600 w-1/3">Material</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
                                <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">Qty</th>
                                <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">Rate</th>
                                <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">Amount</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {lines.map((line, i) => (
                                <tr key={i} className="border-b border-gray-100">
                                    <td className="px-3 py-1.5">
                                        <select
                                            value={line.material_id}
                                            onChange={(e) => updateLine(i, 'material_id', e.target.value)}
                                            className="select text-xs"
                                            required
                                        >
                                            <option value="">Select material</option>
                                            {materials.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.sku_code} - {m.description} ({m.unit_of_measure})
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <input
                                            type="text"
                                            value={line.description}
                                            onChange={(e) => updateLine(i, 'description', e.target.value)}
                                            className="input text-xs"
                                            placeholder="Optional"
                                        />
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <input
                                            type="number"
                                            value={line.quantity || ''}
                                            onChange={(e) => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)}
                                            className="input text-xs text-right tabular-nums"
                                            min="0.01"
                                            step="0.01"
                                            required
                                        />
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <input
                                            type="number"
                                            value={line.expected_rate || ''}
                                            onChange={(e) => updateLine(i, 'expected_rate', parseFloat(e.target.value) || 0)}
                                            className="input text-xs text-right tabular-nums"
                                            min="0.01"
                                            step="0.01"
                                            required
                                        />
                                    </td>
                                    <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                                        {(line.quantity * line.expected_rate).toFixed(2)}
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <button
                                            type="button"
                                            onClick={() => removeLine(i)}
                                            className="p-1 text-gray-400 hover:text-red-500"
                                            disabled={lines.length === 1}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50 border-t border-gray-200">
                                <td colSpan={4} className="px-3 py-2 text-right font-medium text-gray-700">
                                    Total Expected Amount:
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-900">
                                    {totalAmount.toFixed(2)}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="btn-secondary"
                    disabled={loading}
                >
                    Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Request'}
                </button>
            </div>
        </form>
    );
}

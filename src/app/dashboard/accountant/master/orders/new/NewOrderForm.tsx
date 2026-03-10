'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface Buyer {
    id: string;
    name: string;
    brand_code: string;
    contact_details: string;
    notes: string;
}

interface NewOrderFormProps {
    initialBuyers: Buyer[];
}

export default function NewOrderForm({ initialBuyers }: NewOrderFormProps) {
    const router = useRouter();
    const [buyers, setBuyers] = useState<Buyer[]>(initialBuyers);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Order state
    const [orderRef, setOrderRef] = useState('');
    const [buyerId, setBuyerId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [shippingDate, setShippingDate] = useState('');
    const [remarks, setRemarks] = useState('');

    // Line items state
    const [styles, setStyles] = useState([{ style_code: '', style_name: '', description: '' }]);

    // Modal state
    const [showBuyerModal, setShowBuyerModal] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [buyerForm, setBuyerForm] = useState({ name: '', brand_code: '', contact_details: '', notes: '' });
    const [buyerSaving, setBuyerSaving] = useState(false);

    const handleAddStyle = () => {
        setStyles([...styles, { style_code: '', style_name: '', description: '' }]);
    };

    const handleRemoveStyle = (index: number) => {
        setStyles(styles.filter((_, i) => i !== index));
    };

    const handleStyleChange = (index: number, field: string, value: string) => {
        const newStyles = [...styles];
        newStyles[index] = { ...newStyles[index], [field]: value };
        setStyles(newStyles);
    };

    const openCreateBuyerMode = () => {
        setModalMode('create');
        setBuyerForm({ name: '', brand_code: '', contact_details: '', notes: '' });
        setShowBuyerModal(true);
    };

    const openEditBuyerMode = () => {
        if (!buyerId) return;
        const b = buyers.find(x => x.id === buyerId);
        if (b) {
            setModalMode('edit');
            setBuyerForm({ name: b.name, brand_code: b.brand_code, contact_details: b.contact_details || '', notes: b.notes || '' });
            setShowBuyerModal(true);
        }
    };

    const saveBuyer = async () => {
        try {
            setBuyerSaving(true);
            const url = modalMode === 'create' ? '/api/master/buyers' : `/api/master/buyers/${buyerId}`;
            const method = modalMode === 'create' ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buyerForm)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save buyer');
            }

            const savedBuyer = await res.json();
            
            if (modalMode === 'create') {
                setBuyers([...buyers, savedBuyer]);
                setBuyerId(savedBuyer.id);
            } else {
                setBuyers(buyers.map(b => b.id === savedBuyer.id ? savedBuyer : b));
            }
            setShowBuyerModal(false);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setBuyerSaving(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!orderRef || !buyerId) {
            setError('Order Reference and Buyer are required.');
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_reference: orderRef,
                    buyer_id: buyerId,
                    start_date: startDate || undefined,
                    end_date: endDate || undefined,
                    shipping_date: shippingDate || undefined,
                    remarks: remarks || undefined,
                    styles: styles.filter(s => s.style_name || s.description) // Only send non-empty rows
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save order');
            }

            router.push('/dashboard/accountant/master/orders');
            router.refresh();
        } catch (err: any) {
            setError(err.message);
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl pb-16">
            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
                    {error}
                </div>
            )}

            <div className="card">
                <div className="card-header pb-3 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-sm font-semibold text-gray-800">1. Core Information</h2>
                </div>
                <div className="card-body p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Invoice/Order No. *
                        </label>
                        <input
                            type="text"
                            required
                            value={orderRef}
                            onChange={(e) => setOrderRef(e.target.value)}
                            className="input-field"
                            placeholder="e.g. 29755179"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between mb-1">
                            <label className="block text-xs font-medium text-gray-700">Buyer *</label>
                            <div className="flex gap-2">
                                {buyerId && (
                                    <button type="button" onClick={openEditBuyerMode} className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1">
                                        <Edit2 size={12} /> Edit
                                    </button>
                                )}
                                <button type="button" onClick={openCreateBuyerMode} className="text-green-600 hover:text-green-800 text-xs flex items-center gap-1">
                                    <Plus size={12} /> Add New
                                </button>
                            </div>
                        </div>
                        <select
                            required
                            value={buyerId}
                            onChange={(e) => setBuyerId(e.target.value)}
                            className="input-field"
                        >
                            <option value="">-- Select Buyer --</option>
                            {buyers.map(b => (
                                <option key={b.id} value={b.id}>{b.name} ({b.brand_code})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="input-field"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="input-field"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Shipping Date</label>
                        <input
                            type="date"
                            value={shippingDate}
                            onChange={(e) => setShippingDate(e.target.value)}
                            className="input-field"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                        <input
                            type="text"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="input-field"
                            placeholder="Additional context"
                        />
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header pb-3 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-sm font-semibold text-gray-800">2. Styles / Line Items</h2>
                    <button
                        type="button"
                        onClick={handleAddStyle}
                        className="btn-secondary py-1 px-3 text-xs flex items-center gap-1"
                    >
                        <Plus size={14} /> Add Row
                    </button>
                </div>
                <div className="p-0 overflow-x-auto">
                    <table className="w-full text-sm text-left align-top">
                        <thead className="text-xs text-gray-600 bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-3 py-2 font-medium w-1/4">Style Code</th>
                                <th className="px-3 py-2 font-medium w-1/4">Style Name</th>
                                <th className="px-3 py-2 font-medium">Description (Colors, Qty, Details)</th>
                                <th className="px-3 py-2 font-medium w-12 text-center">Act</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {styles.map((style, idx) => (
                                <tr key={idx} className="bg-white">
                                    <td className="px-3 py-2">
                                        <input 
                                            type="text" 
                                            value={style.style_code} 
                                            onChange={(e) => handleStyleChange(idx, 'style_code', e.target.value)}
                                            className="w-full text-xs rounded border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Generated if empty" 
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input 
                                            type="text" 
                                            value={style.style_name} 
                                            onChange={(e) => handleStyleChange(idx, 'style_name', e.target.value)}
                                            className="w-full text-xs rounded border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="e.g. Windbreaker Set" 
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <textarea
                                            value={style.description}
                                            rows={3}
                                            onChange={(e) => handleStyleChange(idx, 'description', e.target.value)}
                                            className="w-full text-xs rounded border-gray-300 focus:ring-blue-500 focus:border-blue-500 py-1"
                                            placeholder="Color: Black & Dark Grey... S-20, M-10... Total 70 @ $40"
                                        />
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveStyle(idx)}
                                            className="text-gray-400 hover:text-red-500"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="btn-secondary px-6"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary px-8"
                >
                    {submitting ? 'Saving...' : 'Save Complete Order'}
                </button>
            </div>

            {/* Buyer Modal */}
            {showBuyerModal && (
                <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-semibold text-gray-900">
                                {modalMode === 'create' ? 'Add New Buyer' : 'Edit Buyer'}
                            </h3>
                            <button onClick={() => setShowBuyerModal(false)} className="text-gray-400 hover:text-gray-600">
                                &times;
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Company/Buyer Name *</label>
                                <input
                                    type="text"
                                    value={buyerForm.name}
                                    onChange={(e) => setBuyerForm({...buyerForm, name: e.target.value})}
                                    className="input-field"
                                    placeholder="e.g. Samshek Inc"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Brand Code *</label>
                                <input
                                    type="text"
                                    value={buyerForm.brand_code}
                                    onChange={(e) => setBuyerForm({...buyerForm, brand_code: e.target.value})}
                                    className="input-field"
                                    placeholder="Short unique identifier"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Contact Details</label>
                                <textarea
                                    value={buyerForm.contact_details}
                                    onChange={(e) => setBuyerForm({...buyerForm, contact_details: e.target.value})}
                                    className="input-field"
                                    placeholder="Email, Phone, Address..."
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 shrink-0">
                            <button type="button" onClick={() => setShowBuyerModal(false)} className="btn-secondary py-1.5 text-xs">Cancel</button>
                            <button type="button" onClick={saveBuyer} disabled={buyerSaving || !buyerForm.name || !buyerForm.brand_code} className="btn-primary py-1.5 text-xs">
                                {buyerSaving ? 'Saving...' : 'Save Buyer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}

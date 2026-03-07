'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createOtherExpense } from '@/app/actions/expenses';
import FileUpload from '@/components/ui/FileUpload';

interface Buyer {
    id: string;
    name: string;
}

interface Order {
    id: string;
    order_reference: string;
    buyer_id: string;
}

export default function NewExpenseForm({
    buyers,
    orders,
}: {
    buyers: Buyer[];
    orders: Order[];
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [buyerId, setBuyerId] = useState('');
    const [orderId, setOrderId] = useState('');
    const [paymentDetails, setPaymentDetails] = useState('');
    const [invoicePath, setInvoicePath] = useState<string | null>(null);

    const availableOrders = orders.filter((o) => !buyerId || o.buyer_id === buyerId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = {
                description,
                amount: parseFloat(amount),
                buyer_id: buyerId || undefined,
                order_id: orderId || undefined,
                payment_details: paymentDetails,
                invoice_path: invoicePath || undefined,
            };

            await createOtherExpense(data);
            toast.success('Expense submitted successfully');
            router.back();
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to submit expense');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
            <div className="card">
                <div className="card-header">
                    <h2 className="text-xs font-semibold text-gray-700">Expense Details</h2>
                </div>
                <div className="card-body">
                    <div className="space-y-3">
                        <div>
                            <label className="label">Description *</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="input h-10"
                                required
                                placeholder="e.g. Office Supplies, Travel"
                            />
                        </div>
                        <div>
                            <label className="label">Amount (INR) *</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="input h-10"
                                required
                                min="0.01"
                                step="0.01"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="label">Link to Buyer (Optional)</label>
                                <select
                                    value={buyerId}
                                    onChange={(e) => {
                                        setBuyerId(e.target.value);
                                        setOrderId(''); // Reset order when buyer changes
                                    }}
                                    className="select h-10"
                                >
                                    <option value="">-- None --</option>
                                    {buyers.map((b) => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Link to Order (Optional)</label>
                                <select
                                    value={orderId}
                                    onChange={(e) => setOrderId(e.target.value)}
                                    className="select h-10"
                                    disabled={!buyerId && availableOrders.length === 0}
                                >
                                    <option value="">-- None --</option>
                                    {availableOrders.map((o) => (
                                        <option key={o.id} value={o.id}>{o.order_reference}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h2 className="text-xs font-semibold text-gray-700">Payment & Invoice</h2>
                </div>
                <div className="card-body">
                    <div className="space-y-4">
                        <div>
                            <label className="label">Bank Details or UPI ID *</label>
                            <textarea
                                value={paymentDetails}
                                onChange={(e) => setPaymentDetails(e.target.value)}
                                className="textarea"
                                required
                                rows={2}
                                placeholder="Enter account number, IFSC code, or UPI ID where payment should be sent"
                            />
                        </div>
                        <div>
                            <label className="label">Invoice / Bill Attachment (Optional)</label>
                            <FileUpload
                                type="EXPENSE_INVOICE"
                                onUploaded={(path) => setInvoicePath(path)}
                                label="Upload Document"
                                disabled={loading}
                            />
                        </div>
                    </div>
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
                    {loading ? 'Submitting...' : 'Submit Expense'}
                </button>
            </div>
        </form>
    );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { recordPayment } from '@/app/actions/purchases';

export default function RecordPaymentForm({
    purchaseId,
    purchaseNo,
    remainingAmount,
}: {
    purchaseId: string;
    purchaseNo: string;
    remainingAmount: number;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE'>('UPI');
    const [amountPaid, setAmountPaid] = useState(remainingAmount);
    const [referenceId, setReferenceId] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = async () => {
        if (amountPaid <= 0) {
            toast.error('Amount must be positive');
            return;
        }

        setLoading(true);
        try {
            await recordPayment({
                purchase_id: purchaseId,
                payment_date: paymentDate,
                payment_method: paymentMethod,
                amount_paid: amountPaid,
                reference_id: referenceId || undefined,
                payment_proof_key: `payment-proofs/${purchaseId}/${Date.now()}.pdf`,
                notes: notes || undefined,
            });
            toast.success(`Payment recorded for ${purchaseNo}`);
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Payment recording failed');
        } finally {
            setLoading(false);
        }
    };

    if (!expanded) {
        return (
            <button onClick={() => setExpanded(true)} className="btn-primary">
                Record Payment
            </button>
        );
    }

    return (
        <div className="space-y-3 p-3 bg-gray-50 rounded border border-gray-200">
            <div className="grid grid-cols-4 gap-3">
                <div>
                    <label className="label">Payment Date</label>
                    <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="input" required />
                </div>
                <div>
                    <label className="label">Method</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)} className="select">
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="CHEQUE">Cheque</option>
                    </select>
                </div>
                <div>
                    <label className="label">Amount</label>
                    <input
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                        className="input tabular-nums"
                        min="0.01"
                        step="0.01"
                        max={remainingAmount}
                        required
                    />
                </div>
                <div>
                    <label className="label">Reference ID</label>
                    <input type="text" value={referenceId} onChange={(e) => setReferenceId(e.target.value)} className="input" placeholder="UPI Ref / Cheque No" />
                </div>
            </div>
            <div>
                <label className="label">Notes</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="input" placeholder="Payment notes..." />
            </div>
            <div className="flex gap-2">
                <button onClick={handleSubmit} disabled={loading} className="btn-success">
                    {loading ? 'Recording...' : 'Confirm Payment'}
                </button>
                <button onClick={() => setExpanded(false)} disabled={loading} className="btn-secondary">
                    Cancel
                </button>
            </div>
        </div>
    );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { recordPayment } from '@/app/actions/purchases';
import FileUpload from '@/components/ui/FileUpload';

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
    const [paymentProofPath, setPaymentProofPath] = useState<string | null>(null);
    const [proofError, setProofError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (amountPaid <= 0) {
            toast.error('Amount must be positive');
            return;
        }

        if (!paymentProofPath) {
            setProofError('Payment proof is required before recording payment');
            return;
        }
        setProofError(null);

        setLoading(true);
        try {
            await recordPayment({
                purchase_id: purchaseId,
                payment_date: paymentDate,
                payment_method: paymentMethod,
                amount_paid: amountPaid,
                reference_id: referenceId || undefined,
                payment_proof_key: paymentProofPath,
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
            <button
                onClick={() => setExpanded(true)}
                className="btn-primary w-full sm:w-auto h-11 sm:h-auto"
            >
                Record Payment
            </button>
        );
    }

    return (
        <div className="space-y-4 p-3 bg-gray-50 rounded border border-gray-200">
            {/* Payment Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                    <label className="label">Payment Date</label>
                    <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="input h-12 sm:h-8"
                        required
                    />
                </div>
                <div>
                    <label className="label">Method</label>
                    <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                        className="select h-12 sm:h-8"
                    >
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
                        className="input tabular-nums h-12 sm:h-8"
                        min="0.01"
                        step="0.01"
                        max={remainingAmount}
                        required
                    />
                </div>
                <div>
                    <label className="label">Reference ID</label>
                    <input
                        type="text"
                        value={referenceId}
                        onChange={(e) => setReferenceId(e.target.value)}
                        className="input h-12 sm:h-8"
                        placeholder="UPI Ref / Cheque No"
                    />
                </div>
            </div>

            <div>
                <label className="label">Notes</label>
                <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input h-12 sm:h-8"
                    placeholder="Payment notes..."
                />
            </div>

            {/* Payment Proof Upload — required */}
            <div>
                <FileUpload
                    type="PAYMENT_PROOF"
                    purchaseId={purchaseId}
                    onUploaded={(path) => {
                        setPaymentProofPath(path);
                        setProofError(null);
                    }}
                    label="Payment Proof / Receipt"
                    required
                    disabled={loading}
                />
                {proofError && (
                    <p className="mt-1 text-xs text-red-600 font-medium">⚠ {proofError}</p>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="btn-success w-full sm:w-auto h-12 sm:h-auto"
                >
                    {loading ? 'Recording...' : 'Confirm Payment'}
                </button>
                <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    disabled={loading}
                    className="btn-secondary w-full sm:w-auto h-12 sm:h-auto"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

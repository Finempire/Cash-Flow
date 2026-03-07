'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { payOtherExpense, rejectOtherExpense } from '@/app/actions/expenses';
import FileUpload from '@/components/ui/FileUpload';

export default function ExpenseActions({
    expenseId,
    status,
}: {
    expenseId: string;
    status: string;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [action, setAction] = useState<'IDLE' | 'PAYING' | 'REJECTING'>('IDLE');
    const [proofPath, setProofPath] = useState<string | null>(null);
    const [reason, setReason] = useState('');

    if (status !== 'PENDING') return null;

    const handlePay = async () => {
        if (!proofPath) {
            toast.error('Payment proof document is required');
            return;
        }
        setLoading(true);
        try {
            await payOtherExpense(expenseId, proofPath, reason);
            toast.success('Expense marked as paid');
            setAction('IDLE');
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to pay expense');
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!reason.trim()) {
            toast.error('Rejection reason is required');
            return;
        }
        setLoading(true);
        try {
            await rejectOtherExpense(expenseId, reason);
            toast.success('Expense rejected');
            setAction('IDLE');
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to reject expense');
        } finally {
            setLoading(false);
        }
    };

    if (action === 'IDLE') {
        return (
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <button onClick={() => setAction('REJECTING')} className="btn-secondary w-full sm:w-auto border-red-200 text-red-700 hover:bg-red-50">
                    Reject Request
                </button>
                <button onClick={() => setAction('PAYING')} className="btn-primary w-full sm:w-auto bg-green-600 hover:bg-green-700">
                    Mark as Paid
                </button>
            </div>
        );
    }

    if (action === 'PAYING') {
        return (
            <div className="card border-green-200 mt-4">
                <div className="card-header bg-green-50">
                    <h3 className="text-xs font-semibold text-green-800">Process Payment</h3>
                </div>
                <div className="card-body space-y-3">
                    <p className="text-xs text-gray-600">Upload the transaction receipt or proof of payment.</p>
                    <FileUpload
                        type="EXPENSE_PROOF"
                        expenseId={expenseId}
                        onUploaded={(path) => setProofPath(path)}
                        label="Payment Proof Document"
                        required
                        disabled={loading}
                    />
                    <div>
                        <label className="label">Accountant Notes (Optional)</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="textarea"
                            rows={2}
                            placeholder="Any notes about this payment..."
                        />
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setAction('IDLE')} className="btn-secondary flex-1" disabled={loading}>Cancel</button>
                        <button type="button" onClick={handlePay} className="btn-primary flex-1 bg-green-600 hover:bg-green-700" disabled={loading || !proofPath}>
                            {loading ? 'Processing...' : 'Confirm Payment'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (action === 'REJECTING') {
        return (
            <div className="card border-red-200 mt-4">
                <div className="card-header bg-red-50">
                    <h3 className="text-xs font-semibold text-red-800">Reject Expense</h3>
                </div>
                <div className="card-body space-y-3">
                    <div>
                        <label className="label">Reason for Rejection *</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="textarea"
                            rows={3}
                            required
                            placeholder="Please explain why this expense is being rejected..."
                        />
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setAction('IDLE')} className="btn-secondary flex-1" disabled={loading}>Cancel</button>
                        <button type="button" onClick={handleReject} className="btn-primary flex-1 bg-red-600 hover:bg-red-700" disabled={loading || !reason.trim()}>
                            {loading ? 'Rejecting...' : 'Confirm Rejection'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { approvePurchase, rejectPurchase } from '@/app/actions/purchases';

export default function PurchaseReviewActions({
    purchaseId,
    purchaseNo,
}: {
    purchaseId: string;
    purchaseNo: string;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState('');
    const [showReject, setShowReject] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const handleApprove = async () => {
        setLoading(true);
        try {
            await approvePurchase(purchaseId, notes || undefined);
            toast.success(`${purchaseNo} approved`);
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Approval failed');
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            toast.error('Rejection reason is required');
            return;
        }
        setLoading(true);
        try {
            await rejectPurchase(purchaseId, rejectReason);
            toast.success(`${purchaseNo} rejected`);
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Rejection failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-2">
            <div>
                <label className="label">Internal Notes</label>
                <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input"
                    placeholder="Notes for internal reference..."
                />
            </div>

            {showReject && (
                <div>
                    <label className="label">Rejection Reason</label>
                    <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="textarea"
                        rows={2}
                        placeholder="Reason for rejecting this invoice..."
                        required
                    />
                </div>
            )}

            <div className="flex gap-2">
                <button onClick={handleApprove} disabled={loading} className="btn-success">
                    {loading ? 'Processing...' : 'Approve'}
                </button>
                {!showReject ? (
                    <button onClick={() => setShowReject(true)} className="btn-danger" disabled={loading}>
                        Reject
                    </button>
                ) : (
                    <button onClick={handleReject} disabled={loading} className="btn-danger">
                        {loading ? 'Rejecting...' : 'Confirm Rejection'}
                    </button>
                )}
            </div>
        </div>
    );
}

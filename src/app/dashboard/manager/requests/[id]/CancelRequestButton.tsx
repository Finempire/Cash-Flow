'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cancelMaterialRequest } from '@/app/actions/material-requests';

export default function CancelRequestButton({ requestId }: { requestId: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleCancel = async () => {
        if (!confirm('Cancel this material request? This action cannot be undone.')) return;
        setLoading(true);
        try {
            await cancelMaterialRequest(requestId);
            toast.success('Request cancelled');
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to cancel request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button onClick={handleCancel} disabled={loading} className="btn-danger">
            {loading ? 'Cancelling...' : 'Cancel Request'}
        </button>
    );
}

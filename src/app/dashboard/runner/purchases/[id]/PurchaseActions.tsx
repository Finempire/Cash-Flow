'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateVendorConfirmation, uploadTaxInvoice } from '@/app/actions/purchases';

interface Props {
    purchaseId: string;
    status: string;
    invoiceType: string;
    vendorConfirmation: {
        status: string;
        shown_to_vendor_at: string | null;
        vendor_confirmed_at: string | null;
        runner_remark: string | null;
    } | null;
    hasTaxInvoice: boolean;
    isAssignedRunner: boolean;
}

export default function PurchaseActions({
    purchaseId,
    status,
    invoiceType,
    vendorConfirmation,
    hasTaxInvoice,
    isAssignedRunner,
}: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [remark, setRemark] = useState('');

    if (!isAssignedRunner) return null;

    const handleShowToVendor = async () => {
        setLoading(true);
        try {
            await updateVendorConfirmation(purchaseId, {
                shown_to_vendor: true,
                runner_remark: remark || undefined,
            });
            toast.success('Marked as shown to vendor');
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update confirmation');
        } finally {
            setLoading(false);
        }
    };

    const handleVendorConfirmed = async () => {
        setLoading(true);
        try {
            await updateVendorConfirmation(purchaseId, {
                shown_to_vendor: true,
                vendor_confirmed: true,
                runner_remark: remark || undefined,
            });
            toast.success('Vendor confirmed');
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update confirmation');
        } finally {
            setLoading(false);
        }
    };

    const handleTaxInvoiceUpload = async () => {
        // For production, this would use pre-signed URL upload
        // Simplified: generate a placeholder key
        const key = `tax-invoices/${purchaseId}/${Date.now()}.pdf`;
        setLoading(true);
        try {
            await uploadTaxInvoice(purchaseId, key);
            toast.success('Tax invoice uploaded. Purchase completed.');
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to upload tax invoice');
        } finally {
            setLoading(false);
        }
    };

    const showVendorSection =
        vendorConfirmation && vendorConfirmation.status !== 'VENDOR_CONFIRMED';

    const showTaxInvoiceSection =
        invoiceType === 'PROVISIONAL' &&
        !hasTaxInvoice &&
        ['PAID', 'PAID_PENDING_TAX_INVOICE'].includes(status);

    if (!showVendorSection && !showTaxInvoiceSection) return null;

    return (
        <div className="space-y-4">
            {showVendorSection && (
                <div className="card">
                    <div className="card-header">
                        <h2 className="text-xs font-semibold text-gray-700">
                            Vendor Confirmation
                        </h2>
                    </div>
                    <div className="card-body space-y-3">
                        <p className="text-xs text-gray-600">
                            Show the payment proof to the vendor and confirm receipt.
                        </p>
                        <div>
                            <label className="label">Remark (Optional)</label>
                            <textarea
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                className="textarea"
                                rows={2}
                                placeholder="Any observation or note..."
                            />
                        </div>
                        <div className="flex gap-2">
                            {vendorConfirmation?.status === 'NOT_CONFIRMED' && (
                                <button
                                    onClick={handleShowToVendor}
                                    disabled={loading}
                                    className="btn-primary"
                                >
                                    {loading ? 'Updating...' : 'Mark as Shown to Vendor'}
                                </button>
                            )}
                            <button
                                onClick={handleVendorConfirmed}
                                disabled={loading}
                                className="btn-success"
                            >
                                {loading ? 'Confirming...' : 'Vendor Confirmed'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTaxInvoiceSection && (
                <div className="card border-amber-200">
                    <div className="card-header bg-amber-50">
                        <h2 className="text-xs font-semibold text-amber-800">
                            Upload Final GST Tax Invoice
                        </h2>
                    </div>
                    <div className="card-body space-y-3">
                        <p className="text-xs text-gray-600">
                            The initial invoice was provisional. Upload the final GST Tax
                            Invoice received from the vendor.
                        </p>
                        <button
                            onClick={handleTaxInvoiceUpload}
                            disabled={loading}
                            className="btn-primary"
                        >
                            {loading ? 'Uploading...' : 'Upload Tax Invoice'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

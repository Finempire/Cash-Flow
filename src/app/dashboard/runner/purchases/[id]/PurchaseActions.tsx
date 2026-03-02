'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateVendorConfirmation, uploadTaxInvoice } from '@/app/actions/purchases';
import FileUpload from '@/components/ui/FileUpload';

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
    const [taxInvoicePath, setTaxInvoicePath] = useState<string | null>(null);
    const [taxInvoiceError, setTaxInvoiceError] = useState<string | null>(null);

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

    const handleTaxInvoiceSubmit = async () => {
        if (!taxInvoicePath) {
            setTaxInvoiceError('Please upload the Tax Invoice file first');
            return;
        }
        setLoading(true);
        try {
            await uploadTaxInvoice(purchaseId, taxInvoicePath);
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
            {/* Vendor Confirmation Section */}
            {showVendorSection && (
                <div className="card">
                    <div className="card-header">
                        <h2 className="text-xs font-semibold text-gray-700">Vendor Confirmation</h2>
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
                        <div className="flex flex-col sm:flex-row gap-2">
                            {vendorConfirmation?.status === 'NOT_CONFIRMED' && (
                                <button
                                    type="button"
                                    onClick={handleShowToVendor}
                                    disabled={loading}
                                    className="btn-primary w-full sm:w-auto h-12 sm:h-auto"
                                >
                                    {loading ? 'Updating...' : 'Mark as Shown to Vendor'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleVendorConfirmed}
                                disabled={loading}
                                className="btn-success w-full sm:w-auto h-12 sm:h-auto"
                            >
                                {loading ? 'Confirming...' : 'Vendor Confirmed'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tax Invoice Upload Section */}
            {showTaxInvoiceSection && (
                <div className="card border-amber-200">
                    <div className="card-header bg-amber-50">
                        <h2 className="text-xs font-semibold text-amber-800">
                            ⚠ Final Tax Invoice Required
                        </h2>
                    </div>
                    <div className="card-body space-y-3">
                        <p className="text-xs text-gray-600">
                            The initial invoice was provisional. Upload the final GST Tax Invoice
                            received from the vendor.
                        </p>
                        <FileUpload
                            type="TAX_INVOICE"
                            purchaseId={purchaseId}
                            onUploaded={(path) => {
                                setTaxInvoicePath(path);
                                setTaxInvoiceError(null);
                            }}
                            label="Final GST Tax Invoice"
                            required
                            disabled={loading}
                        />
                        {taxInvoiceError && (
                            <p className="text-xs text-red-600">⚠ {taxInvoiceError}</p>
                        )}
                        <button
                            type="button"
                            onClick={handleTaxInvoiceSubmit}
                            disabled={loading || !taxInvoicePath}
                            className="btn-primary w-full h-12 sm:h-auto sm:w-auto"
                        >
                            {loading ? 'Submitting...' : 'Submit Tax Invoice'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

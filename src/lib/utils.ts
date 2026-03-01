import { PurchaseStatus } from '@prisma/client';

export function getStatusConfig(status: PurchaseStatus): {
    label: string;
    className: string;
} {
    const configs: Record<PurchaseStatus, { label: string; className: string }> = {
        PENDING_PURCHASE: { label: 'Pending Purchase', className: 'badge-amber' },
        INVOICE_SUBMITTED: { label: 'Invoice Submitted', className: 'badge-blue' },
        APPROVED: { label: 'Approved', className: 'badge-green' },
        PAID: { label: 'Paid', className: 'badge-green' },
        PARTIALLY_PAID: { label: 'Partially Paid', className: 'badge-amber' },
        PAID_PENDING_TAX_INVOICE: { label: 'Awaiting Tax Invoice', className: 'badge-amber' },
        COMPLETED: { label: 'Completed', className: 'badge-green' },
        REJECTED: { label: 'Rejected', className: 'badge-red' },
        CANCELLED: { label: 'Cancelled', className: 'badge-gray' },
    };
    return configs[status];
}

export function formatCurrency(amount: number | string | { toString(): string } | null | undefined): string {
    if (amount === null || amount === undefined) return '0.00';
    const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount));
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numAmount);
}

export function formatDate(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export function formatDateTime(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function generateRequestNo(): string {
    const year = new Date().getFullYear();
    const seq = Math.floor(Math.random() * 9999)
        .toString()
        .padStart(4, '0');
    return `MR-${year}-${seq}`;
}

export function generatePurchaseNo(): string {
    const year = new Date().getFullYear();
    const seq = Math.floor(Math.random() * 9999)
        .toString()
        .padStart(4, '0');
    return `PUR-${year}-${seq}`;
}

/**
 * Central status configuration for the V2 system.
 * Use this file as the single source of truth for status colors, labels,
 * next-action labels, and allowed transitions per role.
 */

import { Role } from '@prisma/client';

// ─── Purchase Status ─────────────────────────────────────────────────────────

export type PurchaseStatusKey =
    | 'PENDING_PURCHASE'
    | 'INVOICE_SUBMITTED'
    | 'APPROVED'
    | 'PAID'
    | 'PARTIALLY_PAID'
    | 'PAID_PENDING_TAX_INVOICE'
    | 'COMPLETED'
    | 'REJECTED'
    | 'CANCELLED';

export const PURCHASE_STATUS_CONFIG: Record<
    PurchaseStatusKey,
    {
        label: string;
        color: string; // Tailwind bg color class
        textColor: string; // Tailwind text color class
        nextActionLabel: string;
        nextActionRole: Role | null;
        blockerCode?: string;
    }
> = {
    PENDING_PURCHASE: {
        label: 'Pending Purchase',
        color: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        nextActionLabel: 'Create Purchase Request',
        nextActionRole: 'STORE_MANAGER',
        blockerCode: 'WAITING_PURCHASE_REQUEST',
    },
    INVOICE_SUBMITTED: {
        label: 'Invoice Submitted',
        color: 'bg-blue-100',
        textColor: 'text-blue-800',
        nextActionLabel: 'Review Invoice',
        nextActionRole: 'ACCOUNTANT',
        blockerCode: 'WAITING_ACCOUNTANT_APPROVAL',
    },
    APPROVED: {
        label: 'Approved',
        color: 'bg-indigo-100',
        textColor: 'text-indigo-800',
        nextActionLabel: 'Process Payment',
        nextActionRole: 'ACCOUNTANT',
        blockerCode: 'WAITING_PAYMENT',
    },
    PAID: {
        label: 'Paid',
        color: 'bg-green-100',
        textColor: 'text-green-800',
        nextActionLabel: 'Upload Tax Invoice',
        nextActionRole: 'RUNNER',
        blockerCode: 'WAITING_FINAL_TAX_INVOICE',
    },
    PARTIALLY_PAID: {
        label: 'Partially Paid',
        color: 'bg-orange-100',
        textColor: 'text-orange-800',
        nextActionLabel: 'Process Remaining Payment',
        nextActionRole: 'ACCOUNTANT',
        blockerCode: 'WAITING_PAYMENT',
    },
    PAID_PENDING_TAX_INVOICE: {
        label: 'Paid – Tax Invoice Pending',
        color: 'bg-red-100',
        textColor: 'text-red-800',
        nextActionLabel: 'Upload Final Tax Invoice',
        nextActionRole: 'RUNNER',
        blockerCode: 'WAITING_FINAL_TAX_INVOICE',
    },
    COMPLETED: {
        label: 'Completed',
        color: 'bg-gray-100',
        textColor: 'text-gray-700',
        nextActionLabel: 'Final Sign-off',
        nextActionRole: 'ACCOUNTANT',
    },
    REJECTED: {
        label: 'Rejected',
        color: 'bg-red-50',
        textColor: 'text-red-700',
        nextActionLabel: 'Reopen & Correct',
        nextActionRole: 'ACCOUNTANT',
    },
    CANCELLED: {
        label: 'Cancelled',
        color: 'bg-gray-50',
        textColor: 'text-gray-500',
        nextActionLabel: '—',
        nextActionRole: null,
    },
};

// ─── Expense Status ───────────────────────────────────────────────────────────

export type ExpenseStatusKey = 'PENDING' | 'PAID' | 'REJECTED';

export const EXPENSE_STATUS_CONFIG: Record<
    ExpenseStatusKey,
    {
        label: string;
        color: string;
        textColor: string;
        nextActionLabel: string;
        nextActionRole: Role | null;
        blockerCode?: string;
    }
> = {
    PENDING: {
        label: 'Pending Approval',
        color: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        nextActionLabel: 'Review & Pay Expense',
        nextActionRole: 'ACCOUNTANT',
        blockerCode: 'WAITING_ACCOUNTANT_APPROVAL',
    },
    PAID: {
        label: 'Paid',
        color: 'bg-green-100',
        textColor: 'text-green-800',
        nextActionLabel: '—',
        nextActionRole: null,
    },
    REJECTED: {
        label: 'Rejected',
        color: 'bg-red-100',
        textColor: 'text-red-700',
        nextActionLabel: 'Reopen & Correct',
        nextActionRole: 'ACCOUNTANT',
    },
};

// ─── Vendor Confirmation Status ───────────────────────────────────────────────

export type ConfirmStatusKey = 'NOT_CONFIRMED' | 'SHOWN_TO_VENDOR' | 'VENDOR_CONFIRMED';

export const CONFIRM_STATUS_CONFIG: Record<
    ConfirmStatusKey,
    { label: string; color: string; textColor: string }
> = {
    NOT_CONFIRMED: {
        label: 'Not Shown',
        color: 'bg-gray-100',
        textColor: 'text-gray-600',
    },
    SHOWN_TO_VENDOR: {
        label: 'Shown to Vendor',
        color: 'bg-blue-100',
        textColor: 'text-blue-700',
    },
    VENDOR_CONFIRMED: {
        label: 'Vendor Confirmed',
        color: 'bg-green-100',
        textColor: 'text-green-700',
    },
};

// ─── Exception Flags ──────────────────────────────────────────────────────────

export const EXCEPTION_FLAGS = {
    MISSING_DOCUMENT: { label: 'Missing Document', color: 'bg-red-100 text-red-700' },
    OVERDUE_REQUIRED_DATE: { label: 'Overdue', color: 'bg-orange-100 text-orange-700' },
    PENDING_TAX_INVOICE: { label: 'Tax Invoice Pending', color: 'bg-yellow-100 text-yellow-700' },
    VENDOR_MISMATCH: { label: 'Vendor Mismatch', color: 'bg-purple-100 text-purple-700' },
    BLOCKED_BY_APPROVAL: { label: 'Blocked', color: 'bg-red-50 text-red-600' },
    REOPENED_ITEM: { label: 'Reopened', color: 'bg-orange-50 text-orange-600' },
    DELAYED_SHIPPING: { label: 'Shipping Risk', color: 'bg-red-200 text-red-800' },
} as const;

export type ExceptionFlagKey = keyof typeof EXCEPTION_FLAGS;

// ─── Blocker Code Labels ──────────────────────────────────────────────────────

export const BLOCKER_CODE_LABELS: Record<string, string> = {
    WAITING_STORE_ACCEPTANCE: 'Waiting: Store Manager acceptance',
    WAITING_PURCHASE_REQUEST: 'Waiting: Purchase request creation',
    WAITING_RUNNER_ACCEPTANCE: 'Waiting: Runner acceptance',
    WAITING_INVOICE_UPLOAD: 'Waiting: Invoice upload',
    WAITING_ACCOUNTANT_APPROVAL: 'Waiting: Accountant approval',
    WAITING_PAYMENT: 'Waiting: Payment',
    WAITING_VENDOR_CONFIRMATION: 'Waiting: Vendor confirmation',
    WAITING_FINAL_TAX_INVOICE: 'Waiting: Final tax invoice',
    WAITING_EXPENSE_COMPLETION: 'Waiting: Expense completion',
    WAITING_FINAL_SIGNOFF: 'Waiting: Final sign-off',
};

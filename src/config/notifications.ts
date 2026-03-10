/**
 * Central notification event configuration.
 * Maps workflow events to notification rules: title, message template,
 * target roles, notification type, and action URL pattern.
 */

import { NotificationType, Role } from '@prisma/client';

export type NotificationEvent =
    // Purchase lifecycle
    | 'purchase.submitted'
    | 'purchase.approved'
    | 'purchase.rejected'
    | 'purchase.paid'
    | 'purchase.completed'
    | 'purchase.reopened'
    | 'purchase.taxInvoiceUploaded'
    | 'purchase.reminderSent'
    // Expense lifecycle
    | 'expense.submitted'
    | 'expense.paid'
    | 'expense.rejected'
    | 'expense.reopened'
    // Material Request lifecycle
    | 'materialRequest.created'
    | 'materialRequest.accepted'
    | 'materialRequest.rejected'
    // Mention
    | 'comment.mention'
    // Overdue
    | 'overdue.purchase'
    | 'overdue.expense';

export type NotificationRule = {
    type: NotificationType;
    titleTemplate: string;   // Use {ref} for entity reference
    messageTemplate: string; // Use {ref}, {actor}, {status} as placeholders
    targetRoles: Role[];     // Which roles receive this notification
    actionUrlPattern: string; // e.g. '/dashboard/accountant/transactions/{id}'
};

export const NOTIFICATION_RULES: Record<NotificationEvent, NotificationRule> = {
    'purchase.submitted': {
        type: 'ACTION_REQUIRED',
        titleTemplate: 'New Invoice for Review — {ref}',
        messageTemplate: 'Runner {actor} submitted an invoice for purchase {ref}. Please review.',
        targetRoles: ['ACCOUNTANT'],
        actionUrlPattern: '/dashboard/accountant/transactions/{id}',
    },
    'purchase.approved': {
        type: 'STATUS_CHANGE',
        titleTemplate: 'Purchase Approved — {ref}',
        messageTemplate: 'Purchase {ref} has been approved by {actor}. Awaiting payment.',
        targetRoles: ['STORE_MANAGER', 'RUNNER'],
        actionUrlPattern: '/dashboard/runner/purchases/{id}',
    },
    'purchase.rejected': {
        type: 'ACTION_REQUIRED',
        titleTemplate: 'Purchase Rejected — {ref}',
        messageTemplate: 'Purchase {ref} was rejected by {actor}. Reason: {note}',
        targetRoles: ['STORE_MANAGER', 'RUNNER'],
        actionUrlPattern: '/dashboard/runner/purchases/{id}',
    },
    'purchase.paid': {
        type: 'STATUS_CHANGE',
        titleTemplate: 'Payment Processed — {ref}',
        messageTemplate: 'Payment for {ref} was processed. Upload final tax invoice if applicable.',
        targetRoles: ['RUNNER'],
        actionUrlPattern: '/dashboard/runner/purchases/{id}',
    },
    'purchase.completed': {
        type: 'STATUS_CHANGE',
        titleTemplate: 'Purchase Completed — {ref}',
        messageTemplate: 'Purchase {ref} has been marked as completed.',
        targetRoles: ['STORE_MANAGER'],
        actionUrlPattern: '/dashboard/manager/requests/{requestId}',
    },
    'purchase.reopened': {
        type: 'ACTION_REQUIRED',
        titleTemplate: 'Purchase Reopened — {ref}',
        messageTemplate: 'Purchase {ref} was reopened by {actor}. Reason: {note}',
        targetRoles: ['RUNNER', 'STORE_MANAGER'],
        actionUrlPattern: '/dashboard/runner/purchases/{id}',
    },
    'purchase.taxInvoiceUploaded': {
        type: 'ACTION_REQUIRED',
        titleTemplate: 'Tax Invoice Uploaded — {ref}',
        messageTemplate: 'Runner {actor} uploaded the final tax invoice for {ref}.',
        targetRoles: ['ACCOUNTANT'],
        actionUrlPattern: '/dashboard/accountant/transactions/{id}',
    },
    'purchase.reminderSent': {
        type: 'REMINDER',
        titleTemplate: 'Reminder — {ref}',
        messageTemplate: 'Action required on purchase {ref}: {note}',
        targetRoles: ['ACCOUNTANT', 'STORE_MANAGER', 'RUNNER'],
        actionUrlPattern: '/dashboard/accountant/transactions/{id}',
    },
    'expense.submitted': {
        type: 'ACTION_REQUIRED',
        titleTemplate: 'New Expense Request — {ref}',
        messageTemplate: '{actor} submitted expense {ref} for approval.',
        targetRoles: ['ACCOUNTANT'],
        actionUrlPattern: '/dashboard/accountant/other-expenses/{id}',
    },
    'expense.paid': {
        type: 'STATUS_CHANGE',
        titleTemplate: 'Expense Paid — {ref}',
        messageTemplate: 'Your expense {ref} has been paid by {actor}.',
        targetRoles: ['STORE_MANAGER'],
        actionUrlPattern: '/dashboard/expenses/{id}',
    },
    'expense.rejected': {
        type: 'STATUS_CHANGE',
        titleTemplate: 'Expense Rejected — {ref}',
        messageTemplate: 'Your expense {ref} was rejected. Reason: {note}',
        targetRoles: ['STORE_MANAGER'],
        actionUrlPattern: '/dashboard/expenses/{id}',
    },
    'expense.reopened': {
        type: 'ACTION_REQUIRED',
        titleTemplate: 'Expense Reopened — {ref}',
        messageTemplate: 'Expense {ref} was reopened by {actor}. Reason: {note}',
        targetRoles: ['STORE_MANAGER'],
        actionUrlPattern: '/dashboard/expenses/{id}',
    },
    'materialRequest.created': {
        type: 'ACTION_REQUIRED',
        titleTemplate: 'New Material Request — {ref}',
        messageTemplate: 'Manager {actor} raised material request {ref}.',
        targetRoles: ['ACCOUNTANT'],
        actionUrlPattern: '/dashboard/manager/requests/{id}',
    },
    'materialRequest.accepted': {
        type: 'STATUS_CHANGE',
        titleTemplate: 'Material Request Accepted — {ref}',
        messageTemplate: 'Request {ref} was accepted by store. Next: create purchase.',
        targetRoles: ['STORE_MANAGER'],
        actionUrlPattern: '/dashboard/manager/requests/{id}',
    },
    'materialRequest.rejected': {
        type: 'STATUS_CHANGE',
        titleTemplate: 'Material Request Rejected — {ref}',
        messageTemplate: 'Request {ref} was rejected.',
        targetRoles: ['STORE_MANAGER'],
        actionUrlPattern: '/dashboard/manager/requests/{id}',
    },
    'comment.mention': {
        type: 'MENTION',
        titleTemplate: 'You were mentioned — {ref}',
        messageTemplate: '{actor} mentioned you in a comment on {ref}: "{body}"',
        targetRoles: ['ACCOUNTANT', 'STORE_MANAGER', 'RUNNER', 'CEO'],
        actionUrlPattern: '/dashboard/accountant/transactions/{id}',
    },
    'overdue.purchase': {
        type: 'REMINDER',
        titleTemplate: 'Overdue Purchase — {ref}',
        messageTemplate: 'Purchase {ref} has been in current stage for too long. Action required.',
        targetRoles: ['ACCOUNTANT'],
        actionUrlPattern: '/dashboard/accountant/transactions/{id}',
    },
    'overdue.expense': {
        type: 'REMINDER',
        titleTemplate: 'Overdue Expense — {ref}',
        messageTemplate: 'Expense {ref} approval is overdue. Please action immediately.',
        targetRoles: ['ACCOUNTANT'],
        actionUrlPattern: '/dashboard/accountant/other-expenses/{id}',
    },
};

/**
 * Central permission configuration.
 * Defines what each role can see and do across the application.
 * Use this as the single source of truth for UI rendering and API guards.
 */

import { Role } from '@prisma/client';

// ─── Action Keys ──────────────────────────────────────────────────────────────

export type ActionKey =
    // Purchase actions
    | 'purchase:review'
    | 'purchase:approve'
    | 'purchase:reject'
    | 'purchase:pay'
    | 'purchase:reopen'
    | 'purchase:uploadTaxInvoice'
    | 'purchase:complete'
    | 'purchase:viewFinancials'
    // Expense actions
    | 'expense:create'
    | 'expense:pay'
    | 'expense:reject'
    | 'expense:reopen'
    | 'expense:viewFinancials'
    // Material Request actions
    | 'materialRequest:create'
    | 'materialRequest:accept'
    | 'materialRequest:reject'
    // Runner actions
    | 'runner:acceptTask'
    | 'runner:uploadInvoice'
    | 'runner:uploadTaxInvoice'
    | 'runner:confirmVendor'
    // Admin actions
    | 'users:manage'
    | 'master:create'
    | 'master:import'
    | 'master:deactivate'
    | 'master:mergeDuplicates'
    // Comments
    | 'comment:create'
    | 'comment:view'
    // Reports
    | 'reports:view'
    | 'reports:export'
    // Reminders
    | 'reminder:send';

// ─── Permission Map ───────────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<Role, Set<ActionKey>> = {
    ACCOUNTANT: new Set<ActionKey>([
        'purchase:review',
        'purchase:approve',
        'purchase:reject',
        'purchase:pay',
        'purchase:reopen',
        'purchase:complete',
        'purchase:viewFinancials',
        'expense:pay',
        'expense:reject',
        'expense:reopen',
        'expense:viewFinancials',
        'users:manage',
        'master:create',
        'master:import',
        'master:deactivate',
        'master:mergeDuplicates',
        'comment:create',
        'comment:view',
        'reports:view',
        'reports:export',
        'reminder:send',
    ]),
    STORE_MANAGER: new Set<ActionKey>([
        'materialRequest:create',
        'materialRequest:accept',
        'materialRequest:reject',
        'expense:create',
        'master:create',
        'comment:create',
        'comment:view',
        'reports:view',
        'reports:export',
        'reminder:send',
    ]),
    RUNNER: new Set<ActionKey>([
        'runner:acceptTask',
        'runner:uploadInvoice',
        'runner:uploadTaxInvoice',
        'runner:confirmVendor',
        'comment:view',
    ]),
    CEO: new Set<ActionKey>([
        'reports:view',
        'reports:export',
        'comment:view',
    ]),
};

/**
 * Check if a role has permission for a specific action.
 */
export function can(role: Role, action: ActionKey): boolean {
    return ROLE_PERMISSIONS[role]?.has(action) ?? false;
}

/**
 * Assert that a role has permission; throw if not.
 */
export function assertCan(role: Role, action: ActionKey): void {
    if (!can(role, action)) {
        throw new Error(`Role ${role} is not permitted to perform: ${action}`);
    }
}

// ─── Finance Field Visibility ─────────────────────────────────────────────────

/** Roles that are allowed to see financial fields (amounts, rates, totals) */
export const FINANCE_VISIBLE_ROLES: Role[] = ['ACCOUNTANT', 'CEO'];

export function canViewFinancials(role: Role): boolean {
    return FINANCE_VISIBLE_ROLES.includes(role);
}

// ─── Dashboard Navigation ─────────────────────────────────────────────────────

export type NavItem = {
    label: string;
    href: string;
    icon?: string;
};

export const ROLE_NAV: Record<Role, NavItem[]> = {
    ACCOUNTANT: [
        { label: 'Dashboard', href: '/dashboard/accountant' },
        { label: 'Purchases Review', href: '/dashboard/accountant/purchases-review' },
        { label: 'Payments', href: '/dashboard/accountant/payments' },
        { label: 'Expenses', href: '/dashboard/accountant/other-expenses' },
        { label: 'All Transactions', href: '/dashboard/accountant/all-transactions' },
        { label: 'Reports', href: '/dashboard/accountant/reports' },
        { label: 'Master Data', href: '/dashboard/accountant/master' },
        { label: 'Users', href: '/dashboard/accountant/users' },
    ],
    STORE_MANAGER: [
        { label: 'Dashboard', href: '/dashboard/manager' },
        { label: 'Material Requests', href: '/dashboard/manager/requests' },
        { label: 'Expenses', href: '/dashboard/expenses' },
    ],
    RUNNER: [
        { label: 'Dashboard', href: '/dashboard/runner' },
        { label: 'My Tasks', href: '/dashboard/runner/pending' },
        { label: 'My Purchases', href: '/dashboard/runner/my-purchases' },
        { label: 'Notifications', href: '/dashboard/runner/notifications' },
    ],
    CEO: [
        { label: 'Dashboard', href: '/dashboard/ceo' },
        { label: 'Transactions', href: '/dashboard/ceo/transactions' },
        { label: 'Reports', href: '/dashboard/ceo/reports' },
    ],
};

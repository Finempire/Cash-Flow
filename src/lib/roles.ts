import type { Role } from '@prisma/client';

export function getRoleDashboardPath(role: Role): string {
    const paths: Record<Role, string> = {
        STORE_MANAGER: '/dashboard/manager',
        RUNNER: '/dashboard/runner',
        ACCOUNTANT: '/dashboard/accountant',
        CEO: '/dashboard/ceo',
    };
    return paths[role];
}

export function getRoleLabel(role: Role): string {
    const labels: Record<Role, string> = {
        STORE_MANAGER: 'Store Manager',
        RUNNER: 'Runner',
        ACCOUNTANT: 'Accountant',
        CEO: 'CEO',
    };
    return labels[role];
}

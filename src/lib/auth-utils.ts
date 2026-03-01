import { auth } from './auth';
import { redirect } from 'next/navigation';
import type { Role } from '@prisma/client';

export async function requireAuth() {
    const session = await auth();
    if (!session?.user) {
        redirect('/login');
    }
    return session;
}

export async function requireRole(...roles: Role[]) {
    const session = await requireAuth();
    if (!roles.includes(session.user.role)) {
        redirect('/unauthorized');
    }
    return session;
}

export async function getCurrentUser() {
    const session = await auth();
    return session?.user ?? null;
}

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

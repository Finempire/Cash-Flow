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



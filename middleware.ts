import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const rolePathMap: Record<string, string[]> = {
    STORE_MANAGER: ['/dashboard/manager'],
    RUNNER: ['/dashboard/runner'],
    ACCOUNTANT: ['/dashboard/accountant'],
    CEO: ['/dashboard/ceo'],
};

const publicPaths = ['/login', '/api/auth'];

import NextAuth from 'next-auth';
import { authConfig } from './src/lib/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
    matcher: ['/dashboard/:path*', '/api/((?!auth).*)'],
};

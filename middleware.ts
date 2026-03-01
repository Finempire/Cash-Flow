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

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths
    if (publicPaths.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Get JWT token
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    // Not authenticated - redirect to login
    if (!token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    const role = token.role as string;

    // Root dashboard redirect to role-specific dashboard
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
        const rolePaths = rolePathMap[role];
        if (rolePaths) {
            return NextResponse.redirect(new URL(rolePaths[0], request.url));
        }
    }

    // Check role-based path access
    if (pathname.startsWith('/dashboard/')) {
        const allowedPaths = rolePathMap[role];
        if (!allowedPaths) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        const hasAccess = allowedPaths.some((p) => pathname.startsWith(p));
        if (!hasAccess) {
            // Redirect to their own dashboard
            return NextResponse.redirect(new URL(allowedPaths[0], request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/api/((?!auth).*)'],
};

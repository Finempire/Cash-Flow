import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Simple health check endpoint used by CI/CD to verify the app is running.
 */
export async function GET() {
    return NextResponse.json(
        { status: 'ok', timestamp: new Date().toISOString() },
        { status: 200 }
    );
}

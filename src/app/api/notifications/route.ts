import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/notifications
 * Returns paginated notifications for the current user.
 */
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
    const skip = (page - 1) * limit;

    const notifications = await prisma.notification.findMany({
        where: { user_id: session.user.id },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
    });

    const unreadCount = await prisma.notification.count({
        where: { user_id: session.user.id, is_read: false },
    });

    return NextResponse.json({ notifications, unreadCount });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// ─── POST /api/notifications/read-all ────────────────────────────────────────
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.notification.updateMany({
        where: { user_id: session.user.id, is_read: false },
        data: { is_read: true },
    });

    return NextResponse.json({ success: true });
}

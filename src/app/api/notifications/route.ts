import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const notifications = await prisma.notification.findMany({
            where: { user_id: session.user.id },
            orderBy: { created_at: 'desc' },
            take: 50,
        });

        return NextResponse.json(notifications);
    } catch (error) {
        console.error('Notifications fetch failed:', error);
        return NextResponse.json(
            { error: 'Failed to fetch notifications' },
            { status: 500 }
        );
    }
}

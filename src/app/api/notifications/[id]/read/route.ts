import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
    _request: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await prisma.notification.update({
            where: { id: params.id, user_id: session.user.id },
            data: { is_read: true },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Mark read failed:', error);
        return NextResponse.json(
            { error: 'Failed to mark notification as read' },
            { status: 500 }
        );
    }
}

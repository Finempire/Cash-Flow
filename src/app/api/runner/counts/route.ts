import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'RUNNER') {
        return NextResponse.json({ pending: 0 });
    }

    const pending = await prisma.materialRequest.count({
        where: { status: 'PENDING_PURCHASE' },
    });

    return NextResponse.json({ pending });
}

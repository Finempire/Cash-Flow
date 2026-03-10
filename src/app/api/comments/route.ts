import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { triggerNotification } from '@/lib/workflow';


// ─── GET /api/comments ────────────────────────────────────────────────────────
// Query params: entityType, entityId
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
        return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 });
    }

    const comments = await prisma.comment.findMany({
        where: { entity_type: entityType, entity_id: entityId },
        include: {
            author: { select: { id: true, name: true, role: true } },
        },
        orderBy: { created_at: 'asc' },
    });

    return NextResponse.json({ comments });
}

// ─── POST /api/comments ───────────────────────────────────────────────────────
// Body: { entityType, entityId, body }
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entityType, entityId, body } = await req.json();
    if (!entityType || !entityId || !body?.trim()) {
        return NextResponse.json({ error: 'entityType, entityId, and body are required' }, { status: 400 });
    }

    // Extract @mentions: "@name" patterns → look up matching users
    const mentionMatches = (body as string).match(/@[\w\s]+/g) ?? [];
    const mentionedNames = mentionMatches.map((m: string) => m.slice(1).trim());

    let mentionedUserIds: string[] = [];
    if (mentionedNames.length > 0) {
        const users = await prisma.user.findMany({
            where: { name: { in: mentionedNames }, is_active: true },
            select: { id: true },
        });
        mentionedUserIds = users.map((u) => u.id);
    }

    const comment = await prisma.comment.create({
        data: {
            entity_type: entityType,
            entity_id: entityId,
            author_id: session.user.id,
            body: body.trim(),
            mentions: mentionedUserIds,
        },
        include: {
            author: { select: { id: true, name: true, role: true } },
        },
    });

    // Trigger mention notifications
    if (mentionedUserIds.length > 0) {
        await triggerNotification(
            'comment.mention',
            {
                entityId,
                entityType,
                ref: entityType,
                actor: session.user.name ?? 'User',
                body: body.trim(),
                targetUserIds: mentionedUserIds,
            },
            session.user.id
        );
    }

    return NextResponse.json({ comment }, { status: 201 });
}

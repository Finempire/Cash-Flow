import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';


// ─── GET /api/drafts ──────────────────────────────────────────────────────────
// Query params: entityType, draftKey
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType');
    const draftKey = searchParams.get('draftKey');

    if (!entityType || !draftKey) {
        return NextResponse.json({ error: 'entityType and draftKey required' }, { status: 400 });
    }

    const draft = await prisma.draftAutosave.findUnique({
        where: {
            user_id_entity_type_draft_key: {
                user_id: session.user.id,
                entity_type: entityType,
                draft_key: draftKey,
            },
        },
    });

    return NextResponse.json({ draft: draft?.data ?? null });
}

// ─── PUT /api/drafts ──────────────────────────────────────────────────────────
// Body: { entityType, draftKey, data }
export async function PUT(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entityType, draftKey, data } = await req.json();
    if (!entityType || !draftKey || !data) {
        return NextResponse.json({ error: 'entityType, draftKey, and data required' }, { status: 400 });
    }

    await prisma.draftAutosave.upsert({
        where: {
            user_id_entity_type_draft_key: {
                user_id: session.user.id,
                entity_type: entityType,
                draft_key: draftKey,
            },
        },
        update: { data, updated_at: new Date() },
        create: {
            user_id: session.user.id,
            entity_type: entityType,
            draft_key: draftKey,
            data,
        },
    });

    return NextResponse.json({ saved: true });
}

// ─── DELETE /api/drafts ───────────────────────────────────────────────────────
// Query params: entityType, draftKey
export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType');
    const draftKey = searchParams.get('draftKey');

    if (!entityType || !draftKey) {
        return NextResponse.json({ error: 'entityType and draftKey required' }, { status: 400 });
    }

    await prisma.draftAutosave.deleteMany({
        where: {
            user_id: session.user.id,
            entity_type: entityType,
            draft_key: draftKey,
        },
    });

    return NextResponse.json({ deleted: true });
}

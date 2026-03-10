/**
 * Draft autosave library for V2.
 * Handles saving, loading, and clearing user drafts stored in the DraftAutosave table.
 */

import { prisma } from '@/lib/prisma';

export type EntityType = 'MaterialRequest' | 'OtherExpense' | 'Purchase';

// ─── Save Draft ───────────────────────────────────────────────────────────────

/**
 * Save or update a draft for a user+entityType+draftKey combination.
 * Uses upsert to handle both create and update cases.
 */
export async function saveDraft(
    userId: string,
    entityType: EntityType,
    draftKey: string,
    data: Record<string, unknown>
): Promise<void> {
    await prisma.draftAutosave.upsert({
        where: {
            user_id_entity_type_draft_key: {
                user_id: userId,
                entity_type: entityType,
                draft_key: draftKey,
            },
        },
        update: {
            data: data as object,
            updated_at: new Date(),
        },
        create: {
            user_id: userId,
            entity_type: entityType,
            draft_key: draftKey,
            data: data as object,
        },
    });
}

// ─── Load Draft ───────────────────────────────────────────────────────────────

/**
 * Load a draft for a user+entityType+draftKey combination.
 * Returns null if no draft exists.
 */
export async function loadDraft(
    userId: string,
    entityType: EntityType,
    draftKey: string
): Promise<Record<string, unknown> | null> {
    const draft = await prisma.draftAutosave.findUnique({
        where: {
            user_id_entity_type_draft_key: {
                user_id: userId,
                entity_type: entityType,
                draft_key: draftKey,
            },
        },
    });

    if (!draft) return null;
    return draft.data as Record<string, unknown>;
}

// ─── List Drafts ──────────────────────────────────────────────────────────────

/**
 * List all drafts for a user by entity type.
 * Useful for showing "Resume draft" indicators.
 */
export async function listDrafts(
    userId: string,
    entityType: EntityType
): Promise<{ draftKey: string; updatedAt: Date }[]> {
    const drafts = await prisma.draftAutosave.findMany({
        where: { user_id: userId, entity_type: entityType },
        orderBy: { updated_at: 'desc' },
        select: { draft_key: true, updated_at: true },
    });

    return drafts.map((d) => ({ draftKey: d.draft_key, updatedAt: d.updated_at }));
}

// ─── Clear Draft ──────────────────────────────────────────────────────────────

/**
 * Remove a draft (e.g. after successful form submission).
 */
export async function clearDraft(
    userId: string,
    entityType: EntityType,
    draftKey: string
): Promise<void> {
    await prisma.draftAutosave.deleteMany({
        where: {
            user_id: userId,
            entity_type: entityType,
            draft_key: draftKey,
        },
    });
}

// ─── Clear All Drafts (for an entity type) ───────────────────────────────────

export async function clearAllDrafts(
    userId: string,
    entityType: EntityType
): Promise<void> {
    await prisma.draftAutosave.deleteMany({
        where: { user_id: userId, entity_type: entityType },
    });
}

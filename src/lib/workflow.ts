/**
 * Workflow helper library for V2.
 * Handles setting workflow control fields, SLA tracking, and triggering notifications.
 */

import { prisma } from '@/lib/prisma';
import { Role, BlockerCode } from '@prisma/client';
import { NOTIFICATION_RULES, NotificationEvent } from '@/config/notifications';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkflowFields = {
    pending_since_at?: Date | null;
    next_action_role?: Role | null;
    next_action_user_id?: string | null;
    next_action_label?: string | null;
    blocker_code?: BlockerCode | null;
    blocker_note?: string | null;
    overdue_flag?: boolean;
    overdue_reason?: string | null;
    last_activity_at?: Date;
    entered_stage_at?: Date | null;
    exited_stage_at?: Date | null;
};

// ─── Set Workflow Fields ──────────────────────────────────────────────────────

/**
 * Returns a workflow field update object for a given status transition.
 * Call this when updating any entity's status to auto-fill workflow control fields.
 */
export function buildWorkflowUpdate(opts: {
    nextActionRole?: Role | null;
    nextActionLabel?: string;
    blockerCode?: BlockerCode | null;
    blockerNote?: string | null;
    isExitingStage?: boolean;
    enteredStageAt?: Date;
}): WorkflowFields {
    const now = new Date();
    return {
        pending_since_at: now,
        next_action_role: opts.nextActionRole ?? null,
        next_action_label: opts.nextActionLabel ?? null,
        blocker_code: opts.blockerCode ?? null,
        blocker_note: opts.blockerNote ?? null,
        overdue_flag: false,
        overdue_reason: null,
        last_activity_at: now,
        ...(opts.isExitingStage && { exited_stage_at: now }),
        ...(opts.enteredStageAt !== undefined && { entered_stage_at: opts.enteredStageAt }),
    };
}

// ─── SLA Check ───────────────────────────────────────────────────────────────

/** Default SLA hours per stage */
const SLA_HOURS: Record<string, number> = {
    INVOICE_SUBMITTED: 24,   // 1 business day for accountant to review
    APPROVED: 24,             // 1 business day for payment
    PENDING_PURCHASE: 48,    // 2 days for runner to accept
    PAID_PENDING_TAX_INVOICE: 72, // 3 days for tax invoice
    PENDING: 48,             // 2 days for expense approval
};

/**
 * Returns true if the entity has breached SLA based on pending_since_at.
 */
export function isSlaBreached(
    status: string,
    pendingSinceAt: Date | null | undefined
): boolean {
    if (!pendingSinceAt) return false;
    const slaHours = SLA_HOURS[status];
    if (!slaHours) return false;
    const elapsedHours = (Date.now() - pendingSinceAt.getTime()) / (1000 * 60 * 60);
    return elapsedHours > slaHours;
}

// ─── Trigger Notifications ────────────────────────────────────────────────────

type NotificationContext = {
    entityId: string;
    entityType: string;
    ref: string;         // Human-readable reference number (e.g. 'PUR-2026-0001')
    actor: string;       // Name of the user triggering the action
    note?: string;       // Optional note (rejection reason, etc.)
    body?: string;       // Comment body for mentions
    requestId?: string;  // For purchase→request navigation
    targetUserIds?: string[]; // For direct user targeting (mentions)
};

/**
 * Creates Notification rows in the database for a workflow event.
 * Resolves target users based on roles in the notification rule.
 */
export async function triggerNotification(
    event: NotificationEvent,
    ctx: NotificationContext,
    actorUserId: string
): Promise<void> {
    const rule = NOTIFICATION_RULES[event];
    if (!rule) return;

    const replacer = (template: string) =>
        template
            .replace('{ref}', ctx.ref)
            .replace('{actor}', ctx.actor)
            .replace('{note}', ctx.note ?? '')
            .replace('{body}', ctx.body ?? '')
            .replace('{id}', ctx.entityId)
            .replace('{requestId}', ctx.requestId ?? ctx.entityId);

    const title = replacer(rule.titleTemplate);
    const message = replacer(rule.messageTemplate);
    const actionUrl = replacer(rule.actionUrlPattern);

    // For mentions, use provided targetUserIds; otherwise query by role
    let targetUserIds: string[] = ctx.targetUserIds ?? [];

    if (targetUserIds.length === 0) {
        const users = await prisma.user.findMany({
            where: {
                role: { in: rule.targetRoles },
                is_active: true,
                id: { not: actorUserId }, // Don't notify yourself
            },
            select: { id: true },
        });
        targetUserIds = users.map((u) => u.id);
    }

    if (targetUserIds.length === 0) return;

    await prisma.notification.createMany({
        data: targetUserIds.map((userId) => ({
            user_id: userId,
            title,
            message,
            entity_type: ctx.entityType,
            entity_id: ctx.entityId,
            notification_type: rule.type,
            action_url: actionUrl,
        })),
        skipDuplicates: true,
    });
}

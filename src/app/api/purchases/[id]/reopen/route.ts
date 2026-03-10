import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { buildWorkflowUpdate, triggerNotification } from '@/lib/workflow';


/**
 * POST /api/purchases/[id]/reopen
 * Accountant-only: reopen a purchase for correction.
 * Requires a mandatory reason. Creates audit log entry.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ACCOUNTANT') {
        return NextResponse.json({ error: 'Unauthorized — Accountant only' }, { status: 403 });
    }

    const { reason } = await req.json();
    if (!reason?.trim()) {
        return NextResponse.json({ error: 'A reason is required to reopen a purchase.' }, { status: 400 });
    }

    const purchase = await prisma.purchase.findUnique({
        where: { id: params.id },
        include: { runner: true, request: true, vendor: true },
    });

    if (!purchase) {
        return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    const allowedStatuses = ['APPROVED', 'PAID', 'COMPLETED', 'REJECTED'];
    if (!allowedStatuses.includes(purchase.status)) {
        return NextResponse.json(
            { error: `Cannot reopen purchase in status: ${purchase.status}` },
            { status: 422 }
        );
    }

    const workflow = buildWorkflowUpdate({
        nextActionRole: 'RUNNER',
        nextActionLabel: 'Re-submit corrected invoice',
        blockerCode: 'WAITING_INVOICE_UPLOAD',
        blockerNote: reason,
        isExitingStage: true,
        enteredStageAt: new Date(),
    });

    const [updated] = await Promise.all([
        prisma.purchase.update({
            where: { id: params.id },
            data: {
                status: 'INVOICE_SUBMITTED',
                reopen_reason: reason.trim(),
                ...workflow,
            },
        }),
        prisma.auditLog.create({
            data: {
                entity_type: 'Purchase',
                entity_id: params.id,
                action: 'REOPENED',
                performed_by: session.user.id,
                previous_state: { status: purchase.status },
                new_state: { status: 'INVOICE_SUBMITTED', reopen_reason: reason },
            },
        }),
    ]);

    // Notify runner and store manager
    await triggerNotification(
        'purchase.reopened',
        {
            entityId: params.id,
            entityType: 'Purchase',
            ref: purchase.purchase_no,
            actor: session.user.name ?? 'Accountant',
            note: reason,
        },
        session.user.id
    );

    return NextResponse.json({ purchase: updated });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/reports/order-aging
 * Returns all active material requests with lifecycle / aging information.
 * Role-gated: ACCOUNTANT, CEO only.
 */
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user || !['ACCOUNTANT', 'CEO'].includes(session.user.role ?? '')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const buyerId = searchParams.get('buyerId');
    const minDays = parseInt(searchParams.get('minDays') ?? '0', 10);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const skip = (page - 1) * limit;

    const requests = await prisma.materialRequest.findMany({
        where: {
            ...(buyerId && { buyer_id: buyerId }),
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        include: {
            buyer: { select: { id: true, name: true } },
            order: { select: { id: true, order_reference: true } },
            manager: { select: { name: true } },
        },
        orderBy: { created_at: 'asc' },
        skip,
        take: limit,
    });

    const now = Date.now();

    const rows = requests
        .map((r) => {
            const pendingSince = r.pending_since_at ?? r.created_at;
            const agingMs = now - pendingSince.getTime();
            const agingDays = Math.floor(agingMs / (1000 * 60 * 60 * 24));

            return {
                id: r.id,
                request_no: r.request_no,
                buyer: r.buyer.name,
                buyer_id: r.buyer.id,
                order: r.order.order_reference,
                current_stage: r.status,
                pending_since: pendingSince.toISOString(),
                aging_days: agingDays,
                blocker: r.blocker_code ? r.blocker_code.replace(/_/g, ' ') : null,
                next_action_role: r.next_action_role,
                next_action_label: r.next_action_label,
                overdue: r.overdue_flag,
                sla_breached: r.sla_breached,
            };
        })
        .filter((r) => r.aging_days >= minDays);

    return NextResponse.json({ rows, total: rows.length, page, limit });
}

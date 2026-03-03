import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const ALLOWED_ROLES = ['STORE_MANAGER', 'RUNNER', 'ACCOUNTANT'] as const;

const VendorSchema = z.object({
    name: z.string().min(1, 'Vendor name is required'),
    gstin: z.string().optional(),
    contact_person: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
    created_inline: z.boolean().default(false),
    created_at_stage: z.enum(['MATERIAL_REQUEST', 'PURCHASE']).optional(),
});

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ALLOWED_ROLES.includes(session.user.role as typeof ALLOWED_ROLES[number])) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: unknown;
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = VendorSchema.safeParse(body);
    if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        parsed.error.errors.forEach((e) => { if (e.path[0]) fieldErrors[String(e.path[0])] = e.message; });
        return NextResponse.json({ error: 'Validation failed', fieldErrors }, { status: 422 });
    }

    const data = parsed.data;

    // Use type cast to handle fields added to schema before Prisma client regeneration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vendor = await (prisma.vendor.create as any)({
        data: {
            name: data.name,
            gstin: data.gstin || null,
            contact_person: data.contact_person || null,
            phone: data.phone || null,
            address: data.address || null,
            notes: data.notes || null,
            is_active: true,
            created_inline: data.created_inline,
            created_at_stage: data.created_at_stage ?? null,
            created_by_user_id: data.created_inline ? session.user.id : null,
        },
    });

    if (data.created_inline) {
        await prisma.auditLog.create({
            data: {
                entity_type: 'Vendor',
                entity_id: vendor.id,
                action: 'VENDOR_CREATED_INLINE',
                performed_by: session.user.id,
                new_state: {
                    name: vendor.name,
                    created_at_stage: data.created_at_stage,
                    created_by_role: session.user.role,
                },
            },
        });
    }

    return NextResponse.json({ id: vendor.id, name: vendor.name, gstin: vendor.gstin || '' });
}

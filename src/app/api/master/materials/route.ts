import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const ALLOWED_ROLES = ['STORE_MANAGER', 'RUNNER', 'ACCOUNTANT'] as const;

const InlineMaterialSchema = z.object({
    description: z.string().min(1, 'Material name is required'),
    sku_code: z.string().optional(),
    category: z.string().optional(),
    unit_of_measure: z.string().min(1, 'Unit of measure is required'),
    default_rate: z.number().positive().optional(),
});

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!ALLOWED_ROLES.includes(session.user.role as typeof ALLOWED_ROLES[number])) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = InlineMaterialSchema.safeParse(body);
    if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        parsed.error.errors.forEach((e) => {
            if (e.path[0]) fieldErrors[String(e.path[0])] = e.message;
        });
        return NextResponse.json({ error: 'Validation failed', fieldErrors }, { status: 422 });
    }

    const data = parsed.data;

    // Auto-generate SKU if not provided
    const skuCode = data.sku_code?.trim() || `INLINE-${Date.now()}`;

    // Check for duplicate SKU
    const existing = await prisma.material.findUnique({ where: { sku_code: skuCode } });
    if (existing) {
        return NextResponse.json(
            { error: 'Validation failed', fieldErrors: { sku_code: 'This SKU code already exists' } },
            { status: 422 }
        );
    }

    const material = await prisma.material.create({
        data: {
            sku_code: skuCode,
            description: data.description,
            category: data.category || null,
            unit_of_measure: data.unit_of_measure,
            default_rate: data.default_rate ?? null,
            created_inline: true,
        },
    });

    // Write AuditLog entry
    await prisma.auditLog.create({
        data: {
            entity_type: 'Material',
            entity_id: material.id,
            action: 'MATERIAL_CREATED_INLINE',
            performed_by: session.user.id,
            new_state: {
                sku_code: material.sku_code,
                description: material.description,
                unit_of_measure: material.unit_of_measure,
                created_inline: true,
                created_by_role: session.user.role,
            },
        },
    });

    return NextResponse.json({
        id: material.id,
        sku_code: material.sku_code,
        description: material.description,
        category: material.category,
        unit_of_measure: material.unit_of_measure,
        default_rate: material.default_rate ? Number(material.default_rate) : undefined,
        created_inline: true,
    });
}

'use server';

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const createAuditLog = async (
    entityType: string,
    entityId: string,
    action: string,
    performedBy: string,
    previousState?: Record<string, unknown>,
    newState?: Record<string, unknown>
) => {
    await prisma.auditLog.create({
        data: {
            entity_type: entityType,
            entity_id: entityId,
            action,
            performed_by: performedBy,
            previous_state: previousState ? JSON.parse(JSON.stringify(previousState)) : undefined,
            new_state: newState ? JSON.parse(JSON.stringify(newState)) : undefined,
        },
    });
};

const createNotification = async (
    userId: string,
    title: string,
    message: string,
    entityType: string,
    entityId: string
) => {
    await prisma.notification.create({
        data: {
            user_id: userId,
            title,
            message,
            entity_type: entityType,
            entity_id: entityId,
        },
    });
};

// Generate next request number
async function getNextRequestNo(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `MR-${year}-`;
    const last = await prisma.materialRequest.findFirst({
        where: { request_no: { startsWith: prefix } },
        orderBy: { request_no: 'desc' },
    });
    const seq = last ? parseInt(last.request_no.split('-')[2]) + 1 : 1;
    return `${prefix}${seq.toString().padStart(4, '0')}`;
}

const MaterialRequestLineSchema = z.object({
    material_id: z.string().uuid(),
    description: z.string().optional(),
    quantity: z.number().positive(),
    expected_rate: z.number().positive(),
});

const CreateRequestSchema = z.object({
    buyer_id: z.string().uuid(),
    order_id: z.string().uuid(),
    store_location: z.string().optional(),
    expected_date: z.string().optional(),
    remarks: z.string().optional(),
    lines: z.array(MaterialRequestLineSchema).min(1, 'At least one material line required'),
});

export async function createMaterialRequest(formData: z.infer<typeof CreateRequestSchema>) {
    const session = await requireRole('STORE_MANAGER', 'ACCOUNTANT');
    const data = CreateRequestSchema.parse(formData);

    const requestNo = await getNextRequestNo();

    const request = await prisma.materialRequest.create({
        data: {
            request_no: requestNo,
            manager_id: session.user.id,
            buyer_id: data.buyer_id,
            order_id: data.order_id,
            store_location: data.store_location || null,
            expected_date: data.expected_date ? new Date(data.expected_date) : null,
            remarks: data.remarks || null,
            status: 'PENDING_PURCHASE',
            lines: {
                create: data.lines.map((line) => ({
                    material_id: line.material_id,
                    description: line.description || null,
                    quantity: line.quantity,
                    expected_rate: line.expected_rate,
                    expected_amount: line.quantity * line.expected_rate,
                })),
            },
        },
    });

    await createAuditLog(
        'MaterialRequest',
        request.id,
        'CREATED',
        session.user.id,
        undefined,
        { request_no: requestNo, status: 'PENDING_PURCHASE' }
    );

    // Notify runners
    const runners = await prisma.user.findMany({
        where: { role: 'RUNNER', is_active: true },
    });
    for (const runner of runners) {
        await createNotification(
            runner.id,
            'New Material Request',
            `Request ${requestNo} requires procurement`,
            'MaterialRequest',
            request.id
        );
    }

    revalidatePath('/dashboard');
    return { success: true, id: request.id, request_no: requestNo };
}

export async function updateMaterialRequest(
    requestId: string,
    formData: z.infer<typeof CreateRequestSchema>
) {
    const session = await requireRole('STORE_MANAGER', 'ACCOUNTANT');
    const data = CreateRequestSchema.parse(formData);

    const existing = await prisma.materialRequest.findUnique({
        where: { id: requestId },
        include: { lines: true },
    });

    if (!existing) throw new Error('Request not found');
    if (existing.status !== 'PENDING_PURCHASE') {
        throw new Error('Cannot edit request after purchase has been initiated');
    }
    if (existing.manager_id !== session.user.id && session.user.role !== 'ACCOUNTANT') {
        throw new Error('Unauthorized');
    }

    // Delete existing lines and recreate
    await prisma.materialRequestLine.deleteMany({ where: { request_id: requestId } });

    const updated = await prisma.materialRequest.update({
        where: { id: requestId },
        data: {
            buyer_id: data.buyer_id,
            order_id: data.order_id,
            store_location: data.store_location || null,
            expected_date: data.expected_date ? new Date(data.expected_date) : null,
            remarks: data.remarks || null,
            lines: {
                create: data.lines.map((line) => ({
                    material_id: line.material_id,
                    description: line.description || null,
                    quantity: line.quantity,
                    expected_rate: line.expected_rate,
                    expected_amount: line.quantity * line.expected_rate,
                })),
            },
        },
    });

    await createAuditLog(
        'MaterialRequest',
        requestId,
        'UPDATED',
        session.user.id,
        { status: existing.status },
        { status: updated.status }
    );

    revalidatePath('/dashboard');
    return { success: true };
}

export async function cancelMaterialRequest(requestId: string) {
    const session = await requireRole('STORE_MANAGER', 'ACCOUNTANT');

    const existing = await prisma.materialRequest.findUnique({
        where: { id: requestId },
    });

    if (!existing) throw new Error('Request not found');
    if (existing.status !== 'PENDING_PURCHASE') {
        throw new Error('Cannot cancel request after purchase has been initiated');
    }
    if (existing.manager_id !== session.user.id && session.user.role !== 'ACCOUNTANT') {
        throw new Error('Unauthorized');
    }

    await prisma.materialRequest.update({
        where: { id: requestId },
        data: { status: 'CANCELLED' },
    });

    await createAuditLog(
        'MaterialRequest',
        requestId,
        'CANCELLED',
        session.user.id,
        { status: 'PENDING_PURCHASE' },
        { status: 'CANCELLED' }
    );

    revalidatePath('/dashboard');
    return { success: true };
}

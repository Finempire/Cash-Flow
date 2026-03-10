import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const body = await req.json();
        const { name, brand_code, contact_details, notes, is_active } = body;

        const existingBuyer = await prisma.buyer.findUnique({ where: { id } });
        if (!existingBuyer) {
            return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });
        }

        if (brand_code && brand_code !== existingBuyer.brand_code) {
            const codeTaken = await prisma.buyer.findUnique({ where: { brand_code } });
            if (codeTaken) {
                return NextResponse.json({ error: 'A buyer with this brand code already exists' }, { status: 400 });
            }
        }

        const updatedBuyer = await prisma.buyer.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(brand_code && { brand_code }),
                ...(contact_details !== undefined && { contact_details }),
                ...(notes !== undefined && { notes }),
                ...(is_active !== undefined && { is_active }),
            },
        });

        // Audit Log
        if (session.user?.id) {
            await prisma.auditLog.create({
                data: {
                    action: 'UPDATE',
                    entity_type: 'Buyer',
                    entity_id: id,
                    performed_by: session.user.id,
                    previous_state: JSON.parse(JSON.stringify(existingBuyer)),
                    new_state: JSON.parse(JSON.stringify(updatedBuyer)),
                },
            });
        }

        return NextResponse.json(updatedBuyer);
    } catch (error: any) {
        console.error('Update Buyer API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update buyer' },
            { status: 500 }
        );
    }
}

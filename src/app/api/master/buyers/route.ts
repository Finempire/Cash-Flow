import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, brand_code, contact_details, notes } = body;

        if (!name || !brand_code) {
            return NextResponse.json(
                { error: 'Name and Brand Code are required' },
                { status: 400 }
            );
        }

        // Check if brand_code already exists
        const existing = await prisma.buyer.findUnique({
            where: { brand_code },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'A buyer with this brand code already exists' },
                { status: 400 }
            );
        }

        const newBuyer = await prisma.buyer.create({
            data: {
                name,
                brand_code,
                contact_details: contact_details || null,
                notes: notes || null,
                is_active: true,
            },
        });

        // Audit Log
        if (session.user?.id) {
            await prisma.auditLog.create({
                data: {
                    action: 'CREATE',
                    entity_type: 'Buyer',
                    entity_id: newBuyer.id,
                    performed_by: session.user.id,
                    new_state: JSON.parse(JSON.stringify(newBuyer)),
                },
            });
        }

        return NextResponse.json(newBuyer, { status: 201 });
    } catch (error: any) {
        console.error('Create Buyer API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create buyer' },
            { status: 500 }
        );
    }
}

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
        const {
            order_reference,
            buyer_id,
            style_name,
            season,
            remarks,
            start_date,
            end_date,
            shipping_date,
            styles
        } = body;

        if (!order_reference || !buyer_id) {
            return NextResponse.json(
                { error: 'Order reference and Buyer ID are required' },
                { status: 400 }
            );
        }

        const existingRef = await prisma.order.findUnique({
            where: { order_reference },
        });

        if (existingRef) {
            return NextResponse.json(
                { error: 'An order with this reference (invoice no) already exists' },
                { status: 400 }
            );
        }

        // Create the order along with nested styles
        const newOrder = await prisma.order.create({
            data: {
                order_reference,
                buyer_id,
                style_name,
                season,
                remarks,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
                shipping_date: shipping_date ? new Date(shipping_date) : null,
                is_active: true,
                styles: {
                    create: Array.isArray(styles) ? styles.map((s: any) => ({
                        style_code: s.style_code,
                        style_name: s.style_name,
                        description: s.description,
                        buyer_id: buyer_id,
                        created_inline: true,
                    })) : [],
                }
            },
            include: {
                styles: true,
            }
        });

        if (session.user?.id) {
            await prisma.auditLog.create({
                data: {
                    action: 'CREATE',
                    entity_type: 'Order',
                    entity_id: newOrder.id,
                    performed_by: session.user.id,
                    new_state: JSON.parse(JSON.stringify(newOrder)),
                },
            });
        }

        return NextResponse.json(newOrder, { status: 201 });
    } catch (error: any) {
        console.error('Create Order API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create order' },
            { status: 500 }
        );
    }
}

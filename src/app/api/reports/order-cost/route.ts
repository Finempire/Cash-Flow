import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['ACCOUNTANT', 'CEO'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');
    const exportFormat = searchParams.get('export');

    try {
        const where: Record<string, unknown> = { status: 'COMPLETED' };
        if (orderId) {
            where.request = { order_id: orderId };
        }

        const purchases = await prisma.purchase.findMany({
            where,
            include: {
                request: {
                    include: { buyer: true, order: true },
                },
                lines: {
                    include: { material: true },
                },
            },
        });

        const data = purchases.flatMap((p) =>
            p.lines.map((line) => ({
                buyer: p.request.buyer.name,
                order_reference: p.request.order.order_reference,
                material: line.material.description,
                sku: line.material.sku_code,
                quantity: Number(line.quantity),
                unit_rate: Number(line.rate),
                total_cost: Number(line.amount),
            }))
        );

        if (exportFormat === 'csv' || exportFormat === 'xlsx') {
            const rows = data.map((d) => ({
                Buyer: d.buyer,
                'Order Reference': d.order_reference,
                Material: d.material,
                SKU: d.sku,
                Quantity: d.quantity,
                'Unit Rate': d.unit_rate,
                'Total Cost': d.total_cost,
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Order Cost');

            const buf = XLSX.write(wb, {
                type: 'buffer',
                bookType: exportFormat === 'csv' ? 'csv' : 'xlsx',
            });

            return new NextResponse(buf, {
                headers: {
                    'Content-Type': exportFormat === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="order-cost-report.${exportFormat}"`,
                },
            });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Order cost report failed:', error);
        return NextResponse.json({ error: 'Report generation failed' }, { status: 500 });
    }
}

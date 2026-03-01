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
    const dateStr = searchParams.get('date');
    const exportFormat = searchParams.get('export');

    try {
        const targetDate = dateStr ? new Date(dateStr) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const payments = await prisma.payment.findMany({
            where: {
                payment_date: { gte: startOfDay, lte: endOfDay },
            },
            include: {
                purchase: { include: { vendor: true } },
            },
        });

        const totalPaidOut = payments.reduce(
            (sum, p) => sum + Number(p.amount_paid),
            0
        );

        const summary = {
            date: targetDate.toISOString().split('T')[0],
            total_transactions: payments.length,
            total_paid_out: totalPaidOut,
            transactions: payments.map((p) => ({
                payment_id: p.id,
                purchase_no: p.purchase.purchase_no,
                vendor: p.purchase.vendor.name,
                method: p.payment_method,
                amount: Number(p.amount_paid),
                reference: p.reference_id,
            })),
        };

        if (exportFormat === 'csv' || exportFormat === 'xlsx') {
            const rows = summary.transactions.map((t) => ({
                'Purchase No': t.purchase_no,
                Vendor: t.vendor,
                Method: t.method,
                Amount: t.amount,
                Reference: t.reference || '',
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Daily Summary');

            const buf = XLSX.write(wb, {
                type: 'buffer',
                bookType: exportFormat === 'csv' ? 'csv' : 'xlsx',
            });

            return new NextResponse(buf, {
                headers: {
                    'Content-Type':
                        exportFormat === 'csv'
                            ? 'text/csv'
                            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="daily-summary-${summary.date}.${exportFormat}"`,
                },
            });
        }

        return NextResponse.json(summary);
    } catch (error) {
        console.error('Daily summary report failed:', error);
        return NextResponse.json(
            { error: 'Report generation failed' },
            { status: 500 }
        );
    }
}

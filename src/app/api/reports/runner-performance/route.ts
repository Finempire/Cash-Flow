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
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const exportFormat = searchParams.get('export');

    try {
        const where: Record<string, unknown> = { role: 'RUNNER' as const };

        const runners = await prisma.user.findMany({
            where,
            include: {
                purchases: {
                    where: from || to
                        ? {
                            created_at: {
                                ...(from ? { gte: new Date(from) } : {}),
                                ...(to ? { lte: new Date(to) } : {}),
                            },
                        }
                        : undefined,
                    include: {
                        vendorConfirmation: true,
                    },
                },
            },
        });

        const data = runners.map((r) => {
            const totalTrips = r.purchases.length;
            const totalAmount = r.purchases.reduce(
                (sum, p) => sum + Number(p.invoice_amount),
                0
            );
            const pendingConfirmations = r.purchases.filter(
                (p) =>
                    p.vendorConfirmation &&
                    p.vendorConfirmation.status === 'NOT_CONFIRMED'
            ).length;
            const pendingTaxInvoices = r.purchases.filter(
                (p) =>
                    p.invoice_type_submitted === 'PROVISIONAL' && !p.tax_invoice_path
            ).length;

            return {
                runner_name: r.name,
                total_trips: totalTrips,
                total_amount: totalAmount,
                avg_amount: totalTrips > 0 ? Math.round((totalAmount / totalTrips) * 100) / 100 : 0,
                pending_confirmations: pendingConfirmations,
                pending_tax_invoices: pendingTaxInvoices,
            };
        });

        if (exportFormat === 'csv' || exportFormat === 'xlsx') {
            const rows = data.map((d) => ({
                'Runner Name': d.runner_name,
                'Total Trips': d.total_trips,
                'Total Amount': d.total_amount,
                'Avg Amount': d.avg_amount,
                'Pending Confirmations': d.pending_confirmations,
                'Pending Tax Invoices': d.pending_tax_invoices,
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Runner Performance');

            const buf = XLSX.write(wb, {
                type: 'buffer',
                bookType: exportFormat === 'csv' ? 'csv' : 'xlsx',
            });

            return new NextResponse(buf, {
                headers: {
                    'Content-Type': exportFormat === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="runner-performance.${exportFormat}"`,
                },
            });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Runner performance report failed:', error);
        return NextResponse.json({ error: 'Report generation failed' }, { status: 500 });
    }
}

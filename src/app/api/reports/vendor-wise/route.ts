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
        const where: Record<string, unknown> = {};
        if (from || to) {
            where.created_at = {};
            if (from) (where.created_at as Record<string, Date>).gte = new Date(from);
            if (to) (where.created_at as Record<string, Date>).lte = new Date(to);
        }

        const purchases = await prisma.purchase.findMany({
            where,
            include: { vendor: true, payments: true },
        });

        // Group by vendor
        const vendorMap = new Map<string, {
            vendor: string;
            total_invoices: number;
            total_amount: number;
            pending_tax_invoices: number;
        }>();

        for (const p of purchases) {
            const key = p.vendor_id;
            const existing = vendorMap.get(key) || {
                vendor: p.vendor.name,
                total_invoices: 0,
                total_amount: 0,
                pending_tax_invoices: 0,
            };
            existing.total_invoices++;
            existing.total_amount += Number(p.invoice_amount);
            if (p.invoice_type_submitted === 'PROVISIONAL' && !p.tax_invoice_path) {
                existing.pending_tax_invoices++;
            }
            vendorMap.set(key, existing);
        }

        const data = Array.from(vendorMap.values()).map((v) => ({
            ...v,
            avg_invoice_value: v.total_invoices > 0
                ? Math.round((v.total_amount / v.total_invoices) * 100) / 100
                : 0,
        }));

        if (exportFormat === 'csv' || exportFormat === 'xlsx') {
            const rows = data.map((d) => ({
                Vendor: d.vendor,
                'Total Invoices': d.total_invoices,
                'Total Amount': d.total_amount,
                'Avg Invoice Value': d.avg_invoice_value,
                'Pending Tax Invoices': d.pending_tax_invoices,
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Vendor Report');

            const buf = XLSX.write(wb, {
                type: 'buffer',
                bookType: exportFormat === 'csv' ? 'csv' : 'xlsx',
            });

            return new NextResponse(buf, {
                headers: {
                    'Content-Type': exportFormat === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="vendor-report.${exportFormat}"`,
                },
            });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Vendor report failed:', error);
        return NextResponse.json({ error: 'Report generation failed' }, { status: 500 });
    }
}

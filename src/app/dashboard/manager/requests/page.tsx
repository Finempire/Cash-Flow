import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import RequestsClient from './RequestsClient';

export default async function ManagerRequests() {
    const session = await requireRole('STORE_MANAGER', 'ACCOUNTANT');

    const requests = await prisma.materialRequest.findMany({
        where: session.user.role === 'STORE_MANAGER'
            ? { manager_id: session.user.id }
            : {},
        include: {
            buyer: true,
            order: true,
            lines: true,
            manager: true,
        },
        orderBy: { created_at: 'desc' },
    });

    const serialized = requests.map((r) => ({
        id: r.id,
        request_no: r.request_no,
        buyer_name: r.buyer.name,
        order_reference: r.order.order_reference,
        manager_name: r.manager.name,
        items_count: r.lines.length,
        total_amount: r.lines.reduce((s, l) => s + Number(l.expected_amount), 0),
        status: r.status,
        store_location: r.store_location || '-',
        created_at: r.created_at.toISOString(),
    }));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-gray-900">Material Requests</h1>
                <Link href="/dashboard/manager/requests/new" className="btn-primary">
                    New Request
                </Link>
            </div>
            <RequestsClient data={serialized} />
        </div>
    );
}

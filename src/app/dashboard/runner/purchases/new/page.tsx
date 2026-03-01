import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import NewPurchaseForm from './NewPurchaseForm';
import { redirect } from 'next/navigation';

export default async function NewPurchase({
    searchParams,
}: {
    searchParams: { request_id?: string };
}) {
    await requireRole('RUNNER');

    const requestId = searchParams.request_id;
    if (!requestId) redirect('/dashboard/runner/pending');

    const request = await prisma.materialRequest.findUnique({
        where: { id: requestId },
        include: {
            buyer: true,
            order: true,
            lines: { include: { material: true } },
        },
    });

    if (!request || request.status !== 'PENDING_PURCHASE') {
        redirect('/dashboard/runner/pending');
    }

    const vendors = await prisma.vendor.findMany({
        where: { is_active: true },
        orderBy: { name: 'asc' },
    });

    return (
        <div className="space-y-4 max-w-4xl">
            <h1 className="text-lg font-semibold text-gray-900">Create Purchase</h1>
            <div className="card p-3">
                <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                        <span className="text-gray-500">Request:</span>{' '}
                        <span className="font-medium">{request.request_no}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">Buyer:</span>{' '}
                        <span className="font-medium">{request.buyer.name}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">Order:</span>{' '}
                        <span className="font-medium">{request.order.order_reference}</span>
                    </div>
                </div>
            </div>
            <NewPurchaseForm
                requestId={request.id}
                vendors={vendors.map((v) => ({ id: v.id, name: v.name, gstin: v.gstin || '' }))}
                requestLines={request.lines.map((l) => ({
                    material_id: l.material_id,
                    material_name: `${l.material.sku_code} - ${l.material.description}`,
                    unit: l.material.unit_of_measure,
                    expected_qty: Number(l.quantity),
                    expected_rate: Number(l.expected_rate),
                }))}
            />
        </div>
    );
}

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import NewRequestForm from './NewRequestForm';

export default async function NewRequest() {
    await requireRole('STORE_MANAGER', 'ACCOUNTANT');

    const [buyers, orders, materials, vendors] = await Promise.all([
        prisma.buyer.findMany({ orderBy: { name: 'asc' } }),
        prisma.order.findMany({ where: { is_active: true }, include: { buyer: true }, orderBy: { order_reference: 'asc' } }),
        prisma.material.findMany({ orderBy: { description: 'asc' } }),
        prisma.vendor.findMany({ where: { is_active: true }, orderBy: { name: 'asc' } }),
    ]);

    return (
        <div className="space-y-4">
            <h1 className="text-lg font-semibold text-gray-900">New Material Request</h1>
            <NewRequestForm
                buyers={buyers.map((b) => ({ id: b.id, name: b.name, brand_code: b.brand_code }))}
                orders={orders.map((o) => ({ id: o.id, order_reference: o.order_reference, buyer_id: o.buyer_id, style_name: o.style_name || '' }))}
                materials={materials.map((m) => ({ id: m.id, sku_code: m.sku_code, description: m.description, unit_of_measure: m.unit_of_measure, default_rate: m.default_rate ? Number(m.default_rate) : undefined }))}
                vendors={vendors.map((v) => ({ id: v.id, name: v.name, gstin: v.gstin || '' }))}
            />
        </div>
    );
}

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import MasterCrudPage from '@/components/master/MasterCrudPage';

export default async function OrdersPage() {
    await requireRole('ACCOUNTANT');
    const orders = await prisma.order.findMany({
        include: { buyer: true },
        orderBy: { order_reference: 'asc' },
    });
    const buyers = await prisma.buyer.findMany({ orderBy: { name: 'asc' } });

    return (
        <MasterCrudPage
            title="Orders"
            entityType="order"
            data={orders.map((o) => ({
                id: o.id,
                order_reference: o.order_reference,
                buyer_id: o.buyer_id,
                buyer_name: o.buyer.name,
                style_name: o.style_name || '',
                season: o.season || '',
                is_active: o.is_active,
            }))}
            columns={[
                { key: 'order_reference', label: 'Order Ref' },
                { key: 'buyer_name', label: 'Buyer' },
                { key: 'style_name', label: 'Style' },
                { key: 'season', label: 'Season' },
                { key: 'is_active', label: 'Active', type: 'boolean' },
            ]}
            fields={[
                { key: 'order_reference', label: 'Order Reference', required: true },
                {
                    key: 'buyer_id', label: 'Buyer', required: true, type: 'select',
                    options: buyers.map((b) => ({ value: b.id, label: b.name }))
                },
                { key: 'style_name', label: 'Style Name' },
                { key: 'season', label: 'Season' },
                { key: 'remarks', label: 'Remarks', type: 'textarea' },
                { key: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
            ]}
        />
    );
}

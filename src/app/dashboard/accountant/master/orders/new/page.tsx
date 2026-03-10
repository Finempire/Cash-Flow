import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import NewOrderForm from './NewOrderForm';

export const dynamic = 'force-dynamic';

export default async function NewOrderPage() {
    await requireRole('ACCOUNTANT');

    const buyers = await prisma.buyer.findMany({
        orderBy: { name: 'asc' },
    });

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-bold text-gray-900">
                Create New Order
            </h1>
            <p className="text-sm text-gray-600 mb-6">
                Fill in the details from the customer's purchase order/invoice. You can add a new buyer if they don't exist in the system yet.
            </p>
            
            <NewOrderForm
                initialBuyers={buyers.map((b) => ({
                    id: b.id,
                    name: b.name,
                    brand_code: b.brand_code,
                    contact_details: b.contact_details || '',
                    notes: b.notes || '',
                }))}
            />
        </div>
    );
}

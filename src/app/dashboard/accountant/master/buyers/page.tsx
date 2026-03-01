import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import MasterCrudPage from '@/components/master/MasterCrudPage';

export default async function BuyersPage() {
    await requireRole('ACCOUNTANT');
    const buyers = await prisma.buyer.findMany({ orderBy: { name: 'asc' } });

    return (
        <MasterCrudPage
            title="Buyers"
            entityType="buyer"
            data={buyers.map((b) => ({
                id: b.id,
                name: b.name,
                brand_code: b.brand_code,
                contact_details: b.contact_details || '',
                notes: b.notes || '',
            }))}
            columns={[
                { key: 'name', label: 'Name' },
                { key: 'brand_code', label: 'Brand Code' },
                { key: 'contact_details', label: 'Contact' },
            ]}
            fields={[
                { key: 'name', label: 'Buyer Name', required: true },
                { key: 'brand_code', label: 'Brand Code', required: true },
                { key: 'contact_details', label: 'Contact Details' },
                { key: 'notes', label: 'Notes', type: 'textarea' },
            ]}
        />
    );
}

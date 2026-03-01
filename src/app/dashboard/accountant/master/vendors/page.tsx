import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import MasterCrudPage from '@/components/master/MasterCrudPage';

export default async function VendorsPage() {
    await requireRole('ACCOUNTANT');
    const vendors = await prisma.vendor.findMany({ orderBy: { name: 'asc' } });

    return (
        <MasterCrudPage
            title="Vendors"
            entityType="vendor"
            data={vendors.map((v) => ({
                id: v.id,
                name: v.name,
                gstin: v.gstin || '',
                contact_person: v.contact_person || '',
                phone: v.phone || '',
                address: v.address || '',
                is_active: v.is_active,
            }))}
            columns={[
                { key: 'name', label: 'Name' },
                { key: 'gstin', label: 'GSTIN' },
                { key: 'contact_person', label: 'Contact' },
                { key: 'phone', label: 'Phone' },
                { key: 'is_active', label: 'Active', type: 'boolean' },
            ]}
            fields={[
                { key: 'name', label: 'Vendor Name', required: true },
                { key: 'gstin', label: 'GSTIN' },
                { key: 'contact_person', label: 'Contact Person' },
                { key: 'phone', label: 'Phone' },
                { key: 'address', label: 'Address', type: 'textarea' },
                { key: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
            ]}
        />
    );
}

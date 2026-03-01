import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import MasterCrudPage from '@/components/master/MasterCrudPage';

export default async function MaterialsPage() {
    await requireRole('ACCOUNTANT');
    const materials = await prisma.material.findMany({ orderBy: { sku_code: 'asc' } });

    return (
        <MasterCrudPage
            title="Materials"
            entityType="material"
            data={materials.map((m) => ({
                id: m.id,
                sku_code: m.sku_code,
                description: m.description,
                category: m.category || '',
                unit_of_measure: m.unit_of_measure,
                default_rate: m.default_rate ? Number(m.default_rate) : '',
            }))}
            columns={[
                { key: 'sku_code', label: 'SKU Code' },
                { key: 'description', label: 'Description' },
                { key: 'category', label: 'Category' },
                { key: 'unit_of_measure', label: 'UoM' },
                { key: 'default_rate', label: 'Default Rate' },
            ]}
            fields={[
                { key: 'sku_code', label: 'SKU Code', required: true },
                { key: 'description', label: 'Description', required: true },
                { key: 'category', label: 'Category' },
                { key: 'unit_of_measure', label: 'Unit of Measure', required: true },
                { key: 'default_rate', label: 'Default Rate', type: 'number' },
            ]}
        />
    );
}

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import MaterialsMasterClient from './MaterialsMasterClient';

export default async function MaterialsPage() {
    await requireRole('ACCOUNTANT');

    const materials = await prisma.material.findMany({
        orderBy: { created_at: 'desc' },
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-gray-900">Materials</h1>
            </div>
            <MaterialsMasterClient
                data={materials.map((m) => ({
                    id: m.id,
                    sku_code: m.sku_code,
                    description: m.description,
                    category: m.category || '',
                    unit_of_measure: m.unit_of_measure,
                    default_rate: m.default_rate ? Number(m.default_rate) : '',
                    created_inline: m.created_inline,
                }))}
            />
        </div>
    );
}

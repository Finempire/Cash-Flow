import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import VendorsMasterClient from './VendorsMasterClient';

export default async function VendorsPage() {
    await requireRole('ACCOUNTANT');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vendors = await (prisma.vendor.findMany as any)({
        orderBy: { created_at: 'desc' },
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-gray-900">Vendors</h1>
            </div>
            <VendorsMasterClient
                data={vendors.map((v: {
                    id: string; name: string; gstin: string | null; contact_person: string | null;
                    phone: string | null; address: string | null; is_active: boolean;
                    created_inline: boolean; created_at_stage: string | null;
                }) => ({
                    id: v.id,
                    name: v.name,
                    gstin: v.gstin || '',
                    contact_person: v.contact_person || '',
                    phone: v.phone || '',
                    address: v.address || '',
                    is_active: v.is_active,
                    created_inline: v.created_inline ?? false,
                    created_at_stage: v.created_at_stage ?? null,
                }))}
            />
        </div>
    );
}

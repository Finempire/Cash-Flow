import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import MasterCrudPage from '@/components/master/MasterCrudPage';

export default async function UsersPage() {
    await requireRole('ACCOUNTANT');
    const users = await prisma.user.findMany({ orderBy: { name: 'asc' } });

    return (
        <MasterCrudPage
            title="Users"
            entityType="user"
            data={users.map((u) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                is_active: u.is_active,
            }))}
            columns={[
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'role', label: 'Role' },
                { key: 'is_active', label: 'Active', type: 'boolean' },
            ]}
            fields={[
                { key: 'name', label: 'Full Name', required: true },
                { key: 'email', label: 'Email', required: true },
                {
                    key: 'role', label: 'Role', required: true, type: 'select',
                    options: [
                        { value: 'STORE_MANAGER', label: 'Store Manager' },
                        { value: 'RUNNER', label: 'Runner' },
                        { value: 'ACCOUNTANT', label: 'Accountant' },
                        { value: 'CEO', label: 'CEO' },
                    ]
                },
                { key: 'password', label: 'Password (leave blank to keep current)' },
                { key: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
            ]}
        />
    );
}

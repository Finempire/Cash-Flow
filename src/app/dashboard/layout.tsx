import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getRoleDashboardPath } from '@/lib/auth-utils';
import DashboardShell from '@/components/layout/DashboardShell';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const user = session.user;

    return (
        <DashboardShell
            userName={user.name}
            userRole={user.role}
        >
            {children}
        </DashboardShell>
    );
}

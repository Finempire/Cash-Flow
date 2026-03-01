import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function DashboardRootPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const { role } = session.user;

    switch (role) {
        case 'ACCOUNTANT':
            redirect('/dashboard/accountant');
        case 'STORE_MANAGER':
            redirect('/dashboard/manager');
        case 'RUNNER':
            redirect('/dashboard/runner');
        case 'CEO':
            redirect('/dashboard/ceo');
        default:
            redirect('/login');
    }
}

import { requireRole } from '@/lib/auth-utils';
import ReportsPage from '@/app/dashboard/accountant/reports/page';

export default async function CEOReports() {
    await requireRole('CEO');
    return <ReportsPage />;
}

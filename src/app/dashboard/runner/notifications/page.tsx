import { requireRole } from '@/lib/auth-utils';
import NotificationsClient from './NotificationsClient';

export default async function RunnerNotifications() {
    await requireRole('RUNNER');

    return (
        <div className="space-y-4">
            <h1 className="text-lg font-semibold text-gray-900">Notifications</h1>
            <NotificationsClient />
        </div>
    );
}

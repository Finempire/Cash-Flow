import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';

export default async function RunnerNotifications() {
    const session = await requireRole('RUNNER');

    const notifications = await prisma.notification.findMany({
        where: { user_id: session.user.id },
        orderBy: { created_at: 'desc' },
        take: 50,
    });

    return (
        <div className="space-y-4">
            <h1 className="text-lg font-semibold text-gray-900">Notifications</h1>
            <div className="card">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-400">
                        No notifications
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {notifications.map((n) => (
                            <div
                                key={n.id}
                                className={`px-3 py-2.5 ${!n.is_read ? 'bg-blue-50' : ''}`}
                            >
                                <p className="text-xs font-medium text-gray-800">{n.title}</p>
                                <p className="text-2xs text-gray-500 mt-0.5">{n.message}</p>
                                <p className="text-2xs text-gray-400 mt-0.5">
                                    {new Date(n.created_at).toLocaleString('en-IN')}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

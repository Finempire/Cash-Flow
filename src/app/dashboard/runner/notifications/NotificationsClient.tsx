'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

interface Notification {
    id: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    entity_type: string;
}

export default function RunnerNotificationsClient() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/notifications')
            .then((r) => r.json())
            .then((data) => {
                setNotifications(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const markAsRead = async (id: string) => {
        await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
    };

    if (loading) {
        return (
            <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-16 rounded-lg" />
                ))}
            </div>
        );
    }

    if (notifications.length === 0) {
        return (
            <div className="card p-10 text-center">
                <Bell size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No notifications yet</p>
            </div>
        );
    }

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return (
        <div className="space-y-3">
            {unreadCount > 0 && (
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{unreadCount} unread</span>
                    <button
                        onClick={async () => {
                            for (const n of notifications.filter((n) => !n.is_read)) {
                                await markAsRead(n.id);
                            }
                        }}
                        className="text-xs text-blue-600 hover:underline"
                    >
                        Mark all as read
                    </button>
                </div>
            )}

            <div className="space-y-2">
                {notifications.map((n) => (
                    <button
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        className={`w-full text-left card px-4 py-3 transition-colors hover:bg-gray-50 border-l-4 ${!n.is_read
                                ? 'border-l-blue-500 bg-blue-50/60'
                                : 'border-l-gray-200'
                            }`}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm ${!n.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                {n.title}
                            </p>
                            {!n.is_read && (
                                <span className="shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                        <p className="text-2xs text-gray-400 mt-1">
                            {new Date(n.created_at).toLocaleString('en-IN')}
                        </p>
                    </button>
                ))}
            </div>
        </div>
    );
}

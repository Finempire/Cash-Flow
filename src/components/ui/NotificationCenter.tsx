'use client';

import React, { useState, useEffect, useRef } from 'react';

type Notification = {
    id: string;
    title: string;
    message: string;
    entity_type: string;
    action_url?: string;
    notification_type: string;
    is_read: boolean;
    created_at: string;
};

type NotificationCenterProps = {
    userId: string;
};

type FilterType = 'all' | 'unread' | 'mentions' | 'approvals' | 'reminders';

const FILTER_LABELS: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'approvals', label: 'Approvals' },
    { key: 'mentions', label: 'Mentions' },
    { key: 'reminders', label: 'Reminders' },
];

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationCenter({ userId }: NotificationCenterProps) {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<FilterType>('all');
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications ?? []);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) fetchNotifications();
    }, [open]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const filtered = notifications.filter((n) => {
        if (filter === 'unread') return !n.is_read;
        if (filter === 'mentions') return n.notification_type === 'MENTION';
        if (filter === 'approvals') return n.notification_type === 'ACTION_REQUIRED';
        if (filter === 'reminders') return n.notification_type === 'REMINDER';
        return true;
    });

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    const markAllRead = async () => {
        await fetch('/api/notifications/read-all', { method: 'POST' });
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    };

    const markRead = async (id: string) => {
        await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
    };

    const typeColors: Record<string, string> = {
        ACTION_REQUIRED: 'bg-blue-500',
        MENTION: 'bg-purple-500',
        REMINDER: 'bg-orange-500',
        STATUS_CHANGE: 'bg-green-500',
        SYSTEM: 'bg-gray-400',
    };

    return (
        <div className="relative" ref={ref}>
            {/* Bell Button */}
            <button
                onClick={() => setOpen((o) => !o)}
                className="relative p-2 rounded-md hover:bg-gray-100 transition-colors"
                title="Notifications"
            >
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-2xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-2xs text-blue-600 hover:underline"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex border-b border-gray-100 px-1">
                        {FILTER_LABELS.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={`px-3 py-2 text-2xs font-medium transition-colors ${
                                    filter === f.key
                                        ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                                        : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* List */}
                    <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                        {loading ? (
                            <div className="py-8 text-center text-xs text-gray-400">Loading…</div>
                        ) : filtered.length === 0 ? (
                            <div className="py-8 text-center text-xs text-gray-400">No notifications.</div>
                        ) : (
                            filtered.map((n) => (
                                <a
                                    key={n.id}
                                    href={n.action_url ?? '#'}
                                    onClick={() => markRead(n.id)}
                                    className={`flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                                        !n.is_read ? 'bg-blue-50/40' : ''
                                    }`}
                                >
                                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${typeColors[n.notification_type] ?? 'bg-gray-300'}`} />
                                    <div className="min-w-0">
                                        <p className={`text-xs font-medium truncate ${!n.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                                            {n.title}
                                        </p>
                                        <p className="text-2xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                                        <p className="text-2xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                                    </div>
                                </a>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

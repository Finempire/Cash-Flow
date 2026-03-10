'use client';

import { useState, useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';
import { Bell, LogOut, User, Menu } from 'lucide-react';
import { getRoleLabel } from '@/lib/roles';
import type { Role } from '@prisma/client';

interface TopNavProps {
    userName: string;
    userRole: Role;
    onMenuToggle: () => void;
}

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

export default function TopNav({ userName, userRole, onMenuToggle }: TopNavProps) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    useEffect(() => {
        async function fetchNotifications() {
            try {
                const res = await fetch('/api/notifications');
                if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data.notifications)) {
                        setNotifications(data.notifications);
                    } else if (Array.isArray(data)) {
                        // Support legacy array format just in case
                        setNotifications(data);
                    } else {
                        console.error('Expected object with notifications array from /api/notifications, got:', data);
                    }
                }
            } catch {
                // Silent fail
            }
        }
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotifications(false);
            }
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setShowProfile(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id: string) => {
        try {
            await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            );
        } catch {
            // Silent fail
        }
    };

    return (
        <header className="fixed top-0 right-0 left-0 md:left-56 h-11 bg-white border-b border-gray-200 flex items-center justify-between px-3 z-20">
            {/* Hamburger — mobile only */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onMenuToggle}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 md:hidden"
                    aria-label="Open menu"
                >
                    <Menu size={18} />
                </button>
                <span className="text-xs text-gray-500 hidden sm:inline">
                    {getRoleLabel(userRole)} Dashboard
                </span>
            </div>

            <div className="flex items-center gap-2">
                {/* Notifications */}
                <div ref={notifRef} className="relative">
                    <button
                        onClick={() => {
                            setShowNotifications(!showNotifications);
                            setShowProfile(false);
                        }}
                        className="relative p-2 rounded hover:bg-gray-100 text-gray-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                        <Bell size={16} />
                        {unreadCount > 0 && (
                            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-2xs rounded-full flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded shadow-sm max-h-80 overflow-y-auto scrollbar-thin z-50">
                            <div className="px-3 py-2 border-b border-gray-200">
                                <span className="text-xs font-medium text-gray-700">Notifications</span>
                            </div>
                            {notifications.length === 0 ? (
                                <div className="px-3 py-4 text-xs text-gray-400 text-center">No notifications</div>
                            ) : (
                                notifications.slice(0, 20).map((n) => (
                                    <button
                                        key={n.id}
                                        onClick={() => markAsRead(n.id)}
                                        className={`w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-gray-50 ${!n.is_read ? 'bg-blue-50' : ''}`}
                                    >
                                        <p className="text-xs font-medium text-gray-800">{n.title}</p>
                                        <p className="text-2xs text-gray-500 mt-0.5">{n.message}</p>
                                        <p className="text-2xs text-gray-400 mt-0.5">
                                            {new Date(n.created_at).toLocaleString('en-IN')}
                                        </p>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Profile */}
                <div ref={profileRef} className="relative">
                    <button
                        onClick={() => {
                            setShowProfile(!showProfile);
                            setShowNotifications(false);
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 min-h-[44px]"
                    >
                        <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                            <User size={14} className="text-blue-600" />
                        </div>
                        <span className="text-xs text-gray-700 hidden sm:inline">{userName}</span>
                    </button>

                    {showProfile && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded shadow-sm z-50">
                            <div className="px-3 py-2 border-b border-gray-100">
                                <p className="text-xs font-medium text-gray-800">{userName}</p>
                                <p className="text-2xs text-gray-500">{getRoleLabel(userRole)}</p>
                            </div>
                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-600 hover:bg-gray-50"
                            >
                                <LogOut size={14} />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

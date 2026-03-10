'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, ShoppingCart, Bell, User } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function RunnerBottomNav() {
    const pathname = usePathname();
    const [pendingCount, setPendingCount] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        // Fetch pending requests and unread notifications counts
        async function fetchCounts() {
            try {
                const [pendingRes, notifRes] = await Promise.all([
                    fetch('/api/runner/counts'),
                    fetch('/api/notifications'),
                ]);
                if (pendingRes.ok) {
                    const data = await pendingRes.json();
                    setPendingCount(data.pending || 0);
                }
                if (notifRes.ok) {
                    const notifs = await notifRes.json();
                    const notifsArray = Array.isArray(notifs?.notifications) ? notifs.notifications : (Array.isArray(notifs) ? notifs : []);
                    setUnreadCount((notifsArray as { is_read: boolean }[]).filter((n) => !n.is_read).length);
                }
            } catch {
                // silent
            }
        }
        fetchCounts();
        const interval = setInterval(fetchCounts, 30000);
        return () => clearInterval(interval);
    }, []);

    const tabs = [
        {
            href: '/dashboard/runner/pending',
            label: 'Pending',
            icon: Clock,
            badge: pendingCount,
        },
        {
            href: '/dashboard/runner/my-purchases',
            label: 'My Purchases',
            icon: ShoppingCart,
            badge: 0,
        },
        {
            href: '/dashboard/runner/notifications',
            label: 'Notifications',
            icon: Bell,
            badge: unreadCount,
        },
        {
            href: '/dashboard/runner',
            label: 'Profile',
            icon: User,
            badge: 0,
        },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-gray-200 flex md:hidden z-30">
            {tabs.map((tab) => {
                const isActive = pathname === tab.href || (tab.href !== '/dashboard/runner' && pathname.startsWith(tab.href));
                const Icon = tab.icon;
                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={`flex flex-col items-center justify-center flex-1 gap-0.5 relative ${isActive ? 'text-blue-600' : 'text-gray-400'
                            }`}
                    >
                        <div className="relative">
                            <Icon size={20} />
                            {tab.badge > 0 && (
                                <span className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 text-white text-2xs rounded-full flex items-center justify-center">
                                    {tab.badge > 9 ? '9+' : tab.badge}
                                </span>
                            )}
                        </div>
                        <span className="text-2xs font-medium">{tab.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}

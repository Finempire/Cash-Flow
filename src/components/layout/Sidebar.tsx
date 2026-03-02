'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ClipboardList,
    ShoppingCart,
    CreditCard,
    FileText,
    Users,
    Store,
    Package,
    Tag,
    BarChart3,
    Clock,
    CheckCircle2,
    Bell,
    Truck,
    ListFilter,
    X,
} from 'lucide-react';

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
}

interface SidebarProps {
    role: string;
    mobileOpen: boolean;
    onMobileClose: () => void;
}

function getNavItems(role: string): NavItem[] {
    switch (role) {
        case 'STORE_MANAGER':
            return [
                { label: 'Dashboard', href: '/dashboard/manager', icon: <LayoutDashboard size={16} /> },
                { label: 'Material Requests', href: '/dashboard/manager/requests', icon: <ClipboardList size={16} /> },
            ];
        case 'RUNNER':
            return [
                { label: 'Dashboard', href: '/dashboard/runner', icon: <LayoutDashboard size={16} /> },
                { label: 'Pending Requests', href: '/dashboard/runner/pending', icon: <Clock size={16} /> },
                { label: 'My Purchases', href: '/dashboard/runner/my-purchases', icon: <ShoppingCart size={16} /> },
                { label: 'Notifications', href: '/dashboard/runner/notifications', icon: <Bell size={16} /> },
            ];
        case 'ACCOUNTANT':
            return [
                { label: 'Dashboard', href: '/dashboard/accountant', icon: <LayoutDashboard size={16} /> },
                { label: 'Purchase Review', href: '/dashboard/accountant/purchases-review', icon: <CheckCircle2 size={16} /> },
                { label: 'Payments', href: '/dashboard/accountant/payments', icon: <CreditCard size={16} /> },
                { label: 'All Transactions', href: '/dashboard/accountant/all-transactions', icon: <ListFilter size={16} /> },
                { label: 'Reports', href: '/dashboard/accountant/reports', icon: <BarChart3 size={16} /> },
                { label: 'Vendors', href: '/dashboard/accountant/master/vendors', icon: <Store size={16} /> },
                { label: 'Buyers', href: '/dashboard/accountant/master/buyers', icon: <Tag size={16} /> },
                { label: 'Orders', href: '/dashboard/accountant/master/orders', icon: <Package size={16} /> },
                { label: 'Materials', href: '/dashboard/accountant/master/materials', icon: <Truck size={16} /> },
                { label: 'Users', href: '/dashboard/accountant/users', icon: <Users size={16} /> },
            ];
        case 'CEO':
            return [
                { label: 'Dashboard', href: '/dashboard/ceo', icon: <LayoutDashboard size={16} /> },
                { label: 'Reports', href: '/dashboard/ceo/reports', icon: <BarChart3 size={16} /> },
                { label: 'Transactions', href: '/dashboard/ceo/transactions', icon: <FileText size={16} /> },
            ];
        default:
            return [];
    }
}

export default function Sidebar({ role, mobileOpen, onMobileClose }: SidebarProps) {
    const pathname = usePathname();
    const navItems = getNavItems(role);

    // Close drawer on route change
    useEffect(() => {
        onMobileClose();
    }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

    const NavLinks = ({ onClick }: { onClick?: () => void }) => (
        <nav className="flex-1 py-1.5 overflow-y-auto scrollbar-thin">
            {navItems.map((item) => {
                const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard/manager' &&
                        item.href !== '/dashboard/runner' &&
                        item.href !== '/dashboard/accountant' &&
                        item.href !== '/dashboard/ceo' &&
                        pathname.startsWith(item.href));

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClick}
                        className={`flex items-center gap-2.5 px-3 py-3 md:py-1.5 mx-1 rounded text-xs transition-colors ${isActive
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <span className="shrink-0">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );

    return (
        <>
            {/* ── Desktop sidebar (md+) ── */}
            <aside className="hidden md:flex fixed left-0 top-0 h-full w-56 bg-white border-r border-gray-200 shadow-sm z-30 flex-col">
                <div className="flex items-center justify-between px-3 h-11 border-b border-gray-200 shrink-0">
                    <span className="text-xs font-semibold text-gray-800 truncate">Petty Cash System</span>
                </div>
                <NavLinks />
                <div className="px-3 py-2 border-t border-gray-200 shrink-0">
                    <p className="text-2xs text-gray-400">v1.0.0</p>
                </div>
            </aside>

            {/* ── Mobile slide-over drawer ── */}
            {mobileOpen && (
                <>
                    {/* Dark overlay */}
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={onMobileClose}
                    />
                    {/* Drawer panel */}
                    <aside className="fixed left-0 top-0 h-full w-72 bg-white z-50 md:hidden flex flex-col shadow-xl">
                        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200 shrink-0">
                            <span className="text-sm font-semibold text-gray-800">Petty Cash System</span>
                            <button
                                onClick={onMobileClose}
                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <NavLinks onClick={onMobileClose} />
                        <div className="px-4 py-3 border-t border-gray-200 shrink-0">
                            <p className="text-2xs text-gray-400">v1.0.0</p>
                        </div>
                    </aside>
                </>
            )}
        </>
    );
}

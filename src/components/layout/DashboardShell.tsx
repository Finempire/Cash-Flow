'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import RunnerBottomNav from './RunnerBottomNav';
import type { Role } from '@prisma/client';

interface DashboardShellProps {
    userName: string;
    userRole: Role;
    children: React.ReactNode;
}

export default function DashboardShell({
    userName,
    userRole,
    children,
}: DashboardShellProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Sidebar — hidden on mobile, visible on md+ */}
            <Sidebar role={userRole} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

            {/* Top Nav — takes hamburger toggle on mobile */}
            <TopNav
                userName={userName}
                userRole={userRole}
                onMenuToggle={() => setSidebarOpen((o) => !o)}
            />

            {/* Main content — no left margin on mobile; margin-left on md+ */}
            <main className="md:ml-56 mt-11 p-4 pb-20 md:pb-4">
                {children}
            </main>

            {/* Runner bottom nav — mobile only */}
            {userRole === 'RUNNER' && <RunnerBottomNav />}
        </div>
    );
}

'use client';

import Sidebar from './Sidebar';
import TopNav from './TopNav';
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
    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar role={userRole} />
            <TopNav userName={userName} userRole={userRole} />
            <main className="ml-56 mt-11 p-4">
                {children}
            </main>
        </div>
    );
}

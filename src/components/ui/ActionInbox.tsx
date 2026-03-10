'use client';

import React, { useState } from 'react';

export type ActionInboxItem = {
    id: string;
    ref: string;
    label: string;
    entityType: string;
    href: string;
    pendingSince?: string;
    agingDays?: number;
    blockerLabel?: string;
};

export type ActionInboxProps = {
    myPending: ActionInboxItem[];
    waitingOnOthers: ActionInboxItem[];
    blocked: ActionInboxItem[];
    overdue: ActionInboxItem[];
    recentlyUpdated: ActionInboxItem[];
    className?: string;
};

type Tab = 'pending' | 'waiting' | 'blocked' | 'overdue' | 'recent';

const TABS: { key: Tab; label: string; color: string }[] = [
    { key: 'pending', label: 'My Pending', color: 'text-blue-700' },
    { key: 'waiting', label: 'Waiting on Others', color: 'text-gray-500' },
    { key: 'blocked', label: 'Blocked', color: 'text-red-600' },
    { key: 'overdue', label: 'Overdue', color: 'text-orange-600' },
    { key: 'recent', label: 'Recently Updated', color: 'text-gray-500' },
];

export default function ActionInbox({
    myPending,
    waitingOnOthers,
    blocked,
    overdue,
    recentlyUpdated,
    className = '',
}: ActionInboxProps) {
    const [activeTab, setActiveTab] = useState<Tab>('pending');

    const tabData: Record<Tab, ActionInboxItem[]> = {
        pending: myPending,
        waiting: waitingOnOthers,
        blocked,
        overdue,
        recent: recentlyUpdated,
    };

    const counts: Record<Tab, number> = {
        pending: myPending.length,
        waiting: waitingOnOthers.length,
        blocked: blocked.length,
        overdue: overdue.length,
        recent: recentlyUpdated.length,
    };

    const items = tabData[activeTab];

    return (
        <div className={`card ${className}`}>
            <div className="card-header pb-0">
                <h2 className="text-xs font-semibold text-gray-700 mb-2">Action Inbox</h2>
                {/* Tab Bar */}
                <div className="flex gap-0 border-b border-gray-200 -mx-4 px-4">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`relative px-3 py-2 text-2xs font-medium whitespace-nowrap transition-colors ${
                                activeTab === tab.key
                                    ? `${tab.color} border-b-2 border-current -mb-px`
                                    : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            {tab.label}
                            {counts[tab.key] > 0 && (
                                <span
                                    className={`ml-1 px-1 rounded text-2xs font-semibold ${
                                        activeTab === tab.key
                                            ? 'bg-current/10'
                                            : 'bg-gray-100 text-gray-500'
                                    }`}
                                >
                                    {counts[tab.key]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {items.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-gray-400">
                        Nothing here — all clear.
                    </p>
                ) : (
                    items.map((item) => (
                        <a
                            key={item.id}
                            href={item.href}
                            className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors group"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-xs font-medium text-blue-700 group-hover:underline truncate">
                                        {item.ref}
                                    </span>
                                    <span className="text-2xs text-gray-400 uppercase tracking-wide">
                                        {item.entityType}
                                    </span>
                                </div>
                                <p className="text-2xs text-gray-600 truncate">{item.label}</p>
                                {item.blockerLabel && (
                                    <p className="text-2xs text-red-500 mt-0.5">{item.blockerLabel}</p>
                                )}
                            </div>
                            <div className="ml-3 text-right shrink-0">
                                {item.agingDays !== undefined && (
                                    <span
                                        className={`text-2xs font-medium tabular-nums ${
                                            item.agingDays > 2
                                                ? 'text-red-600'
                                                : item.agingDays > 1
                                                    ? 'text-orange-500'
                                                    : 'text-gray-400'
                                        }`}
                                    >
                                        {item.agingDays}d
                                    </span>
                                )}
                                {item.pendingSince && !item.agingDays && (
                                    <span className="text-2xs text-gray-400">{item.pendingSince}</span>
                                )}
                            </div>
                        </a>
                    ))
                )}
            </div>
        </div>
    );
}

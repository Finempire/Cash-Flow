'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type CommandItem = {
    id: string;
    label: string;
    description?: string;
    href?: string;
    action?: () => void;
    icon?: string;
    group: string;
};

const DEFAULT_COMMANDS: CommandItem[] = [
    // Navigation
    { id: 'goto-dashboard', label: 'Go to Dashboard', group: 'Navigate', href: '/dashboard/accountant' },
    { id: 'goto-reports', label: 'Go to Reports', group: 'Navigate', href: '/dashboard/accountant/reports' },
    { id: 'goto-purchases', label: 'Go to Purchases Review', group: 'Navigate', href: '/dashboard/accountant/purchases-review' },
    { id: 'goto-payments', label: 'Go to Payments', group: 'Navigate', href: '/dashboard/accountant/payments' },
    { id: 'goto-expenses', label: 'Go to Expenses', group: 'Navigate', href: '/dashboard/accountant/other-expenses' },
    { id: 'goto-master', label: 'Go to Master Data', group: 'Navigate', href: '/dashboard/accountant/master' },
    // Create actions
    { id: 'create-request', label: 'Raise Material Need', description: 'New material request', group: 'Create', href: '/dashboard/manager/requests/new' },
    { id: 'create-expense', label: 'Raise Expense', description: 'New expense request', group: 'Create', href: '/dashboard/expenses/new' },
];

type CommandPaletteProps = {
    extraCommands?: CommandItem[];
};

export default function CommandPalette({ extraCommands = [] }: CommandPaletteProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const allCommands = [...DEFAULT_COMMANDS, ...extraCommands];

    const filtered = query.trim()
        ? allCommands.filter(
            (c) =>
                c.label.toLowerCase().includes(query.toLowerCase()) ||
                c.description?.toLowerCase().includes(query.toLowerCase())
        )
        : allCommands;

    // Group by group label
    const grouped = filtered.reduce((acc, cmd) => {
        if (!acc[cmd.group]) acc[cmd.group] = [];
        acc[cmd.group].push(cmd);
        return acc;
    }, {} as Record<string, CommandItem[]>);

    const flatFiltered = Object.values(grouped).flat();

    const handleSelect = useCallback(
        (item: CommandItem) => {
            setOpen(false);
            setQuery('');
            if (item.href) router.push(item.href);
            else if (item.action) item.action();
        },
        [router]
    );

    // Keyboard shortcut to open
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Focus input on open
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setSelectedIndex(0);
        }
    }, [open]);

    // Arrow key navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            const item = flatFiltered[selectedIndex];
            if (item) handleSelect(item);
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
            onClick={() => setOpen(false)}
        >
            <div
                className="w-full max-w-lg bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center px-4 py-3 border-b border-gray-100">
                    <svg className="w-4 h-4 text-gray-400 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search commands, orders, vendors..."
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                        onKeyDown={handleKeyDown}
                        className="flex-1 text-sm outline-none placeholder-gray-400"
                    />
                    <kbd className="ml-2 text-2xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Esc</kbd>
                </div>

                {/* Command List */}
                <div className="max-h-80 overflow-y-auto py-1">
                    {flatFiltered.length === 0 ? (
                        <p className="px-4 py-6 text-center text-xs text-gray-400">No commands found.</p>
                    ) : (
                        Object.entries(grouped).map(([group, items]) => (
                            <div key={group}>
                                <div className="px-4 py-1.5 text-2xs font-semibold text-gray-400 uppercase tracking-wider">
                                    {group}
                                </div>
                                {items.map((item) => {
                                    const globalIndex = flatFiltered.indexOf(item);
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleSelect(item)}
                                            className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                                                globalIndex === selectedIndex
                                                    ? 'bg-blue-50 text-blue-700'
                                                    : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div>
                                                <div className="font-medium">{item.label}</div>
                                                {item.description && (
                                                    <div className="text-2xs text-gray-400">{item.description}</div>
                                                )}
                                            </div>
                                            <svg className="w-3.5 h-3.5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-gray-100 flex gap-3 text-2xs text-gray-400">
                    <span><kbd className="bg-gray-100 px-1 rounded">↑↓</kbd> navigate</span>
                    <span><kbd className="bg-gray-100 px-1 rounded">↵</kbd> select</span>
                    <span><kbd className="bg-gray-100 px-1 rounded">Ctrl+K</kbd> toggle</span>
                </div>
            </div>
        </div>
    );
}

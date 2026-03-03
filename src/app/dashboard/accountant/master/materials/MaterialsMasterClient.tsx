'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Material } from '@prisma/client';

interface MaterialRow {
    id: string;
    sku_code: string;
    description: string;
    category: string;
    unit_of_measure: string;
    default_rate: number | string;
    created_inline: boolean;
}

export default function MaterialsMasterClient({ data }: { data: MaterialRow[] }) {
    const [showInlineOnly, setShowInlineOnly] = useState(false);
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        return data.filter((m) => {
            const matchesInline = !showInlineOnly || m.created_inline;
            const matchesSearch =
                !search ||
                m.description.toLowerCase().includes(search.toLowerCase()) ||
                m.sku_code.toLowerCase().includes(search.toLowerCase()) ||
                (m.category || '').toLowerCase().includes(search.toLowerCase());
            return matchesInline && matchesSearch;
        });
    }, [data, showInlineOnly, search]);

    return (
        <div className="space-y-3">
            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <input
                    type="text"
                    placeholder="Search by name, SKU, or category..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input h-8 sm:w-64"
                />
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none ml-1">
                    <input
                        type="checkbox"
                        checked={showInlineOnly}
                        onChange={(e) => setShowInlineOnly(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Show Inline Created only
                </label>
                {showInlineOnly && (
                    <span className="badge-blue text-2xs">
                        {filtered.length} inline material{filtered.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Table */}
            <div className="card overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-3 py-2 font-medium text-gray-600">SKU Code</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">Category</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">UoM</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600">Default Rate</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">Source</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((m) => (
                            <tr key={m.id} className="border-b border-gray-100 even:bg-gray-50 hover:bg-blue-50/50">
                                <td className="px-3 py-2 font-mono text-gray-700">{m.sku_code}</td>
                                <td className="px-3 py-2 text-gray-800 font-medium">{m.description}</td>
                                <td className="px-3 py-2 text-gray-600">{m.category || '—'}</td>
                                <td className="px-3 py-2 text-gray-600">{m.unit_of_measure}</td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                    {m.default_rate !== '' ? Number(m.default_rate).toFixed(2) : '—'}
                                </td>
                                <td className="px-3 py-2">
                                    {m.created_inline ? (
                                        <span className="badge-amber text-2xs">Inline Added</span>
                                    ) : (
                                        <span className="text-gray-400">Master Data</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                                    {showInlineOnly ? 'No inline-created materials found' : 'No materials found'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

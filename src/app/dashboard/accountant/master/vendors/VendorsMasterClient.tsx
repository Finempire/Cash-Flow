'use client';

import { useState, useMemo } from 'react';

interface VendorRow {
    id: string;
    name: string;
    gstin: string;
    contact_person: string;
    phone: string;
    address: string;
    is_active: boolean;
    created_inline: boolean;
    created_at_stage: string | null;
}

export default function VendorsMasterClient({ data }: { data: VendorRow[] }) {
    const [showInlineOnly, setShowInlineOnly] = useState(false);
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => data.filter((v) => {
        const matchesInline = !showInlineOnly || v.created_inline;
        const q = search.toLowerCase();
        const matchesSearch = !q || v.name.toLowerCase().includes(q) || v.gstin.toLowerCase().includes(q) || v.phone.toLowerCase().includes(q);
        return matchesInline && matchesSearch;
    }), [data, showInlineOnly, search]);

    return (
        <div className="space-y-3">
            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <input type="text" placeholder="Search by name, GSTIN, or phone..."
                    value={search} onChange={(e) => setSearch(e.target.value)}
                    className="input h-8 sm:w-64" />
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none ml-1">
                    <input type="checkbox" checked={showInlineOnly} onChange={(e) => setShowInlineOnly(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    Show Inline Created only
                </label>
                {showInlineOnly && (
                    <span className="badge-blue text-2xs">{filtered.length} inline vendor{filtered.length !== 1 ? 's' : ''}</span>
                )}
            </div>

            {/* Table */}
            <div className="card overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-3 py-2 font-medium text-gray-600">Vendor Name</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">GSTIN</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">Contact</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">Phone</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">Active</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">Source</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((v) => (
                            <tr key={v.id} className="border-b border-gray-100 even:bg-gray-50 hover:bg-blue-50/50">
                                <td className="px-3 py-2 font-medium text-gray-800">{v.name}</td>
                                <td className="px-3 py-2 font-mono text-gray-600">{v.gstin || '—'}</td>
                                <td className="px-3 py-2 text-gray-600">{v.contact_person || '—'}</td>
                                <td className="px-3 py-2 text-gray-600">{v.phone || '—'}</td>
                                <td className="px-3 py-2">
                                    <span className={v.is_active ? 'badge-green' : 'badge-gray'}>
                                        {v.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-3 py-2">
                                    {v.created_inline ? (
                                        <span className="badge-amber text-2xs">
                                            Inline Added{v.created_at_stage ? ` (${v.created_at_stage === 'MATERIAL_REQUEST' ? 'Request' : 'Purchase'})` : ''}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">Master Data</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                                    {showInlineOnly ? 'No inline-created vendors found' : 'No vendors found'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

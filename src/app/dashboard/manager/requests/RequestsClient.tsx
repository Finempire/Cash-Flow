'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import type { PurchaseStatus } from '@prisma/client';

interface RequestRow {
    id: string;
    request_no: string;
    buyer_name: string;
    order_reference: string;
    manager_name: string;
    items_count: number;
    total_amount: number;
    status: PurchaseStatus;
    store_location: string;
    created_at: string;
}

const statusColors: Record<string, string> = {
    PENDING_PURCHASE: 'badge-amber',
    INVOICE_SUBMITTED: 'badge-blue',
    APPROVED: 'badge-green',
    PAID: 'badge-green',
    PARTIALLY_PAID: 'badge-amber',
    PAID_PENDING_TAX_INVOICE: 'badge-amber',
    COMPLETED: 'badge-green',
    REJECTED: 'badge-red',
    CANCELLED: 'badge-gray',
};

const statusLabels: Record<string, string> = {
    PENDING_PURCHASE: 'Pending Purchase',
    INVOICE_SUBMITTED: 'Invoice Submitted',
    APPROVED: 'Approved',
    PAID: 'Paid',
    PARTIALLY_PAID: 'Partially Paid',
    PAID_PENDING_TAX_INVOICE: 'Awaiting Tax Invoice',
    COMPLETED: 'Completed',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
};

export default function RequestsClient({ data }: { data: RequestRow[] }) {
    const [filter, setFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const filtered = data.filter((r) => {
        const matchesSearch =
            !filter ||
            r.request_no.toLowerCase().includes(filter.toLowerCase()) ||
            r.buyer_name.toLowerCase().includes(filter.toLowerCase()) ||
            r.order_reference.toLowerCase().includes(filter.toLowerCase());
        const matchesStatus = !statusFilter || r.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-3">
            {/* Filters — full width on mobile */}
            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    type="text"
                    placeholder="Search by request no, buyer, or order..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="input h-11 sm:h-8 sm:w-64"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="select h-11 sm:h-8 sm:w-48"
                >
                    <option value="">All Statuses</option>
                    {Object.entries(statusLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
                {filtered.length === 0 && (
                    <div className="card p-6 text-center text-xs text-gray-400">No requests found</div>
                )}
                {filtered.map((r) => (
                    <div key={r.id} className="card">
                        <div className="card-body space-y-2">
                            <div className="flex items-center justify-between">
                                <Link href={`/dashboard/manager/requests/${r.id}`} className="text-sm font-semibold text-blue-600 hover:underline">
                                    {r.request_no}
                                </Link>
                                <span className={statusColors[r.status]}>{statusLabels[r.status]}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                <div><span className="text-gray-400">Buyer</span><p className="font-medium">{r.buyer_name}</p></div>
                                <div><span className="text-gray-400">Order</span><p className="font-medium">{r.order_reference}</p></div>
                                <div><span className="text-gray-400">Amount</span><p className="font-semibold tabular-nums">{formatCurrency(r.total_amount)}</p></div>
                                <div><span className="text-gray-400">Items</span><p>{r.items_count}</p></div>
                            </div>
                            <p className="text-2xs text-gray-400">
                                {new Date(r.created_at).toLocaleDateString('en-IN')} · {r.store_location}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop table */}
            <div className="card hidden md:block">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Request No</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Buyer</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Order</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Location</th>
                                <th className="text-center px-3 py-2 font-medium text-gray-600">Items</th>
                                <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((r) => (
                                <tr key={r.id} className="border-b border-gray-100 even:bg-gray-50 hover:bg-blue-50/50">
                                    <td className="px-3 py-2">
                                        <Link href={`/dashboard/manager/requests/${r.id}`} className="text-blue-600 hover:underline font-medium">
                                            {r.request_no}
                                        </Link>
                                    </td>
                                    <td className="px-3 py-2 text-gray-700">{r.buyer_name}</td>
                                    <td className="px-3 py-2 text-gray-700">{r.order_reference}</td>
                                    <td className="px-3 py-2 text-gray-500">{r.store_location}</td>
                                    <td className="px-3 py-2 text-center">{r.items_count}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(r.total_amount)}</td>
                                    <td className="px-3 py-2">
                                        <span className={statusColors[r.status]}>{statusLabels[r.status]}</span>
                                    </td>
                                    <td className="px-3 py-2 text-gray-500 tabular-nums">
                                        {new Date(r.created_at).toLocaleDateString('en-IN')}
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-3 py-8 text-center text-gray-400">No requests found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

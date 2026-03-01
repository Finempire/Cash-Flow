'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';

type ReportType = 'daily-summary' | 'vendor-wise' | 'order-cost' | 'runner-performance';

const reports: { type: ReportType; title: string; description: string }[] = [
    { type: 'daily-summary', title: 'Daily Petty Cash Reconciliation', description: 'Date-wise summary of all disbursements' },
    { type: 'vendor-wise', title: 'Vendor-Wise Purchase Report', description: 'Aggregate purchase data grouped by vendor' },
    { type: 'order-cost', title: 'Buyer & Order-Wise Material Cost', description: 'True COGS per order (completed purchases only)' },
    { type: 'runner-performance', title: 'Runner Boy Performance', description: 'Procurement metrics per runner' },
];

export default function ReportsPage() {
    const [selectedReport, setSelectedReport] = useState<ReportType>('daily-summary');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [data, setData] = useState<Record<string, unknown>[] | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchReport = async () => {
        setLoading(true);
        try {
            let url = `/api/reports/${selectedReport}?`;
            if (selectedReport === 'daily-summary') {
                url += `date=${reportDate}`;
            } else {
                if (dateFrom) url += `from=${dateFrom}&`;
                if (dateTo) url += `to=${dateTo}&`;
            }
            const res = await fetch(url);
            const result = await res.json();
            setData(Array.isArray(result) ? result : result.transactions || [result]);
        } catch {
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const exportReport = (format: 'csv' | 'xlsx') => {
        let url = `/api/reports/${selectedReport}?export=${format}&`;
        if (selectedReport === 'daily-summary') {
            url += `date=${reportDate}`;
        } else {
            if (dateFrom) url += `from=${dateFrom}&`;
            if (dateTo) url += `to=${dateTo}&`;
        }
        window.open(url, '_blank');
    };

    return (
        <div className="space-y-4">
            <h1 className="text-lg font-semibold text-gray-900">Reports</h1>

            <div className="grid grid-cols-4 gap-3">
                {reports.map((r) => (
                    <button
                        key={r.type}
                        onClick={() => { setSelectedReport(r.type); setData(null); }}
                        className={`card p-3 text-left hover:border-blue-300 transition-colors ${selectedReport === r.type ? 'border-blue-500 bg-blue-50' : ''
                            }`}
                    >
                        <p className="text-xs font-medium text-gray-800">{r.title}</p>
                        <p className="text-2xs text-gray-500 mt-0.5">{r.description}</p>
                    </button>
                ))}
            </div>

            <div className="card p-3">
                <div className="flex items-end gap-3">
                    {selectedReport === 'daily-summary' ? (
                        <div>
                            <label className="label">Date</label>
                            <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="input" />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="label">From</label>
                                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input" />
                            </div>
                            <div>
                                <label className="label">To</label>
                                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input" />
                            </div>
                        </>
                    )}
                    <button onClick={fetchReport} disabled={loading} className="btn-primary h-8">
                        {loading ? 'Loading...' : 'Generate'}
                    </button>
                    <button onClick={() => exportReport('csv')} className="btn-secondary h-8">
                        <Download size={12} /> CSV
                    </button>
                    <button onClick={() => exportReport('xlsx')} className="btn-secondary h-8">
                        <Download size={12} /> Excel
                    </button>
                </div>
            </div>

            {data && (
                <div className="card">
                    <div className="overflow-x-auto">
                        {data.length === 0 ? (
                            <div className="p-8 text-center text-xs text-gray-400">No data for selected period</div>
                        ) : (
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        {Object.keys(data[0]).map((key) => (
                                            <th key={key} className="text-left px-3 py-2 font-medium text-gray-600">
                                                {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((row, i) => (
                                        <tr key={i} className="border-b border-gray-100 even:bg-gray-50">
                                            {Object.values(row).map((val, j) => (
                                                <td key={j} className="px-3 py-2 text-gray-700">
                                                    {typeof val === 'number'
                                                        ? val.toLocaleString('en-IN', { maximumFractionDigits: 2 })
                                                        : String(val ?? '-')}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

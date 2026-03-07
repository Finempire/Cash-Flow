'use client';

import Link from 'next/link';
import { Eye, Download } from 'lucide-react';

type ExpenseStatus = 'PENDING' | 'PAID' | 'REJECTED';

interface Expense {
    id: string;
    expense_no: string;
    description: string;
    amount: number;
    status: ExpenseStatus;
    created_at: Date;
    payment_details: string;
    invoice_path?: string | null;
    payment_proof_path?: string | null;
    accountant_notes?: string | null;
    requester?: { name: string; email: string };
    buyer?: { name: string };
    order?: { order_reference: string };
}

export default function ExpenseListTable({
    expenses,
    viewRole,
}: {
    expenses: Expense[];
    viewRole: 'REQUESTER' | 'ACCOUNTANT';
}) {
    if (expenses.length === 0) {
        return (
            <div className="card p-8 text-center bg-gray-50 border-dashed">
                <p className="text-sm text-gray-500 font-medium">No expenses found.</p>
                {viewRole === 'REQUESTER' && (
                    <p className="text-xs text-gray-400 mt-1">Submit a new expense to see it here.</p>
                )}
            </div>
        );
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & ID</th>
                            {viewRole === 'ACCOUNTANT' && (
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requester</th>
                            )}
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {expenses.map((expense) => (
                            <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-xs font-medium text-gray-900">{expense.expense_no}</div>
                                    <div className="text-2xs text-gray-500">
                                        {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(expense.created_at))}
                                    </div>
                                </td>
                                {viewRole === 'ACCOUNTANT' && (
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="text-xs text-gray-900">{expense.requester?.name}</div>
                                        <div className="text-2xs text-gray-500">{expense.requester?.email}</div>
                                    </td>
                                )}
                                <td className="px-4 py-3">
                                    <div className="text-xs text-gray-900 line-clamp-2">{expense.description}</div>
                                    {(expense.buyer || expense.order) && (
                                        <div className="text-2xs text-gray-500 mt-0.5">
                                            {expense.buyer?.name} {expense.order && `• ${expense.order.order_reference}`}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                    <div className="text-xs font-semibold text-gray-900">{formatCurrency(expense.amount)}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${expense.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                            expense.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {expense.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-medium">
                                    <Link
                                        href={`/dashboard/expenses/${expense.id}`}
                                        className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                                    >
                                        <Eye size={14} /> View
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

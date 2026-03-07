import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { FileText, Building2, Store } from 'lucide-react';
import Link from 'next/link';
import ExpenseActions from '@/components/expenses/ExpenseActions';
import { getDownloadPresignedUrl } from '@/lib/s3';

export const metadata = {
    title: 'Expense Details | Petty Cash',
};

export default async function ExpenseDetailPage({ params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const expense = await prisma.otherExpense.findUnique({
        where: { id: params.id },
        include: {
            requester: { select: { name: true, email: true } },
            accountant: { select: { name: true } },
            buyer: { select: { name: true } },
            order: { select: { order_reference: true } },
        },
    });

    if (!expense) {
        return <div className="p-8 text-center text-gray-500">Expense not found</div>;
    }

    // Role check: Only the requester, or an accountant/CEO can view. Assuming general route is for requester, but we check if requester.
    const isOwner = expense.user_id === session.user.id;
    const isAccountant = session.user.role === 'ACCOUNTANT';
    const isCEO = session.user.role === 'CEO';

    if (!isOwner && !isAccountant && !isCEO) {
        return <div className="p-8 text-center text-red-500">Access Denied</div>;
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    let invoiceUrl = null;
    let proofUrl = null;

    if (expense.invoice_path) {
        invoiceUrl = await getDownloadPresignedUrl(expense.invoice_path);
    }
    if (expense.payment_proof_path) {
        proofUrl = await getDownloadPresignedUrl(expense.payment_proof_path);
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">
                        Expense Details: {expense.expense_no}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Requested by {expense.requester.name} on {new Intl.DateTimeFormat('en-IN', { dateStyle: 'long' }).format(new Date(expense.created_at))}
                    </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium w-fit ${expense.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        expense.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                    }`}>
                    {expense.status}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <div className="card">
                        <div className="card-header">
                            <h2 className="text-sm font-semibold text-gray-800">Particulars</h2>
                        </div>
                        <div className="card-body">
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                                <div>
                                    <dt className="text-xs font-medium text-gray-500">Description</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{expense.description}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-gray-500">Amount</dt>
                                    <dd className="mt-1 text-sm font-bold text-gray-900">{formatCurrency(Number(expense.amount))}</dd>
                                </div>
                                {expense.buyer && (
                                    <div>
                                        <dt className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                            <Building2 size={14} /> Link to Buyer
                                        </dt>
                                        <dd className="mt-1 text-sm text-gray-900">{expense.buyer.name}</dd>
                                    </div>
                                )}
                                {expense.order && (
                                    <div>
                                        <dt className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                            <Store size={14} /> Link to Order
                                        </dt>
                                        <dd className="mt-1 text-sm text-gray-900">{expense.order.order_reference}</dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h2 className="text-sm font-semibold text-gray-800">Payment & Invoices</h2>
                        </div>
                        <div className="card-body space-y-6">
                            <div>
                                <h3 className="text-xs font-medium text-gray-500">Payment Required At / Bank Details</h3>
                                <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200 text-sm whitespace-pre-wrap font-mono">
                                    {expense.payment_details}
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                {expense.invoice_path && invoiceUrl && (
                                    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white border border-gray-200 rounded flex items-center justify-center shrink-0">
                                                <FileText size={20} className="text-blue-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-800">Uploaded Invoice</p>
                                                <p className="text-2xs text-gray-500">Provided by Requester</p>
                                            </div>
                                        </div>
                                        <a href={invoiceUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
                                            View
                                        </a>
                                    </div>
                                )}

                                {expense.payment_proof_path && proofUrl && (
                                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white border border-gray-200 rounded flex items-center justify-center shrink-0">
                                                <FileText size={20} className="text-green-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-800">Payment Proof</p>
                                                <p className="text-2xs text-gray-500">Uploaded by Accountant</p>
                                            </div>
                                        </div>
                                        <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
                                            View
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="card">
                        <div className="card-header">
                            <h2 className="text-sm font-semibold text-gray-800">Accountant Notes</h2>
                        </div>
                        <div className="card-body">
                            {expense.accountant_notes ? (
                                <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-100">
                                    {expense.accountant_notes}
                                </div>
                            ) : (
                                <p className="text-xs text-center text-gray-400 py-4">No notes added.</p>
                            )}
                            {expense.accountant && (
                                <p className="text-2xs text-gray-500 mt-3 text-right">
                                    Processed by {expense.accountant.name}
                                </p>
                            )}
                        </div>
                    </div>

                    {isAccountant && (
                        <ExpenseActions expenseId={expense.id} status={expense.status} />
                    )}
                </div>
            </div>
        </div>
    );
}

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import ExpenseListTable from '@/components/expenses/ExpenseListTable';

export const metadata = {
    title: 'My Expenses | Petty Cash',
};

export default async function ExpensesPage() {
    const session = await auth();
    if (!session?.user) return null;

    const expenses = await prisma.otherExpense.findMany({
        where: { user_id: session.user.id },
        include: {
            buyer: { select: { name: true } },
            order: { select: { order_reference: true } },
        },
        orderBy: { created_at: 'desc' },
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">My Expenses</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your requested other expenses.</p>
                </div>
                <Link href="/dashboard/expenses/new" className="btn-primary w-full sm:w-auto">
                    <Plus size={16} />
                    New Expense
                </Link>
            </div>

            <ExpenseListTable expenses={expenses as any} viewRole="REQUESTER" />
        </div>
    );
}

import { requireRole } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import ExpenseListTable from '@/components/expenses/ExpenseListTable';

export const metadata = {
    title: 'Review Other Expenses | Petty Cash',
};

export default async function AccountantOtherExpensesPage() {
    await requireRole('ACCOUNTANT');

    const expenses = await prisma.otherExpense.findMany({
        include: {
            requester: { select: { name: true, email: true } },
            buyer: { select: { name: true } },
            order: { select: { order_reference: true } },
        },
        orderBy: [
            { status: 'asc' }, // PENDING first
            { created_at: 'desc' },
        ],
    });

    // Custom sorting: PENDING > PAID > REJECTED
    const sortedExpenses = [...expenses].sort((a, b) => {
        const order: Record<string, number> = { PENDING: 0, PAID: 1, REJECTED: 2 };
        if (order[a.status] !== order[b.status]) {
            return order[a.status] - order[b.status];
        }
        return b.created_at.getTime() - a.created_at.getTime();
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-xl font-bold text-gray-900">Other Expenses</h1>
                <p className="text-sm text-gray-500 mt-1">Review, process, and pay employee expenses.</p>
            </div>

            <ExpenseListTable expenses={sortedExpenses as any} viewRole="ACCOUNTANT" />
        </div>
    );
}

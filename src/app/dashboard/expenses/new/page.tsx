import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import NewExpenseForm from '@/components/expenses/NewExpenseForm';
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'New Expense | Petty Cash',
};

export default async function NewExpensePage() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const buyers = await prisma.buyer.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
    });

    const orders = await prisma.order.findMany({
        where: { is_active: true },
        orderBy: { created_at: 'desc' },
        select: { id: true, order_reference: true, buyer_id: true },
    });

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-xl font-bold text-gray-900">Request New Expense</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Submit a new expense request for accountant approval.
                </p>
            </div>
            <NewExpenseForm buyers={buyers} orders={orders} />
        </div>
    );
}

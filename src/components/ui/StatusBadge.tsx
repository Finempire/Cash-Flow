import { PurchaseStatus } from '@prisma/client';
import { getStatusConfig } from '@/lib/utils';

interface StatusBadgeProps {
    status: PurchaseStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    const config = getStatusConfig(status);
    return <span className={config.className}>{config.label}</span>;
}

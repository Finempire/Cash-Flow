interface KPICardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
}

export default function KPICard({
    title,
    value,
    subtitle,
}: KPICardProps) {
    return (
        <div className="card p-3 max-h-24">
            <p className="text-2xs font-medium text-gray-500 uppercase tracking-wide">
                {title}
            </p>
            <p className="text-lg font-semibold text-gray-900 mt-1 tabular-nums">
                {value}
            </p>
            {subtitle && (
                <p className="text-2xs text-gray-400 mt-0.5">{subtitle}</p>
            )}
        </div>
    );
}

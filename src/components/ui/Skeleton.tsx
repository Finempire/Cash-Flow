export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
    return (
        <div className="card overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
                <div className="flex gap-3">
                    {Array.from({ length: cols }).map((_, i) => (
                        <div key={i} className="skeleton h-3 flex-1 rounded" />
                    ))}
                </div>
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="px-3 py-2.5 border-b border-gray-100">
                    <div className="flex gap-3">
                        {Array.from({ length: cols }).map((_, j) => (
                            <div key={j} className="skeleton h-3 flex-1 rounded" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export function KPISkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="card p-3">
                    <div className="skeleton h-2.5 w-20 rounded mb-2" />
                    <div className="skeleton h-5 w-16 rounded mb-1" />
                    <div className="skeleton h-2 w-24 rounded" />
                </div>
            ))}
        </div>
    );
}

export function ChartSkeleton() {
    return (
        <div className="card p-3">
            <div className="skeleton h-3 w-32 rounded mb-3" />
            <div className="skeleton h-64 w-full rounded" />
        </div>
    );
}

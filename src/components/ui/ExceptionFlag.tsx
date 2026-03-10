'use client';

import React from 'react';
import { EXCEPTION_FLAGS, ExceptionFlagKey } from '@/config/statuses';

type ExceptionFlagProps = {
    flags: ExceptionFlagKey[];
    className?: string;
};

export default function ExceptionFlag({ flags, className = '' }: ExceptionFlagProps) {
    if (!flags || flags.length === 0) return null;

    return (
        <div className={`flex flex-wrap gap-1 ${className}`}>
            {flags.map((flag) => {
                const config = EXCEPTION_FLAGS[flag];
                if (!config) return null;
                return (
                    <span
                        key={flag}
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium ${config.color}`}
                        title={config.label}
                    >
                        {config.label}
                    </span>
                );
            })}
        </div>
    );
}

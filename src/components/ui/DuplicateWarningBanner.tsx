'use client';

import React from 'react';
import { DuplicateWarning } from '@/lib/duplicate-check';

type DuplicateWarningBannerProps = {
    warnings: DuplicateWarning[];
    className?: string;
};

/**
 * Shows structured duplicate warnings inline in forms.
 * This is a warning (not a hard block) — user can choose to proceed.
 */
export default function DuplicateWarningBanner({ warnings, className = '' }: DuplicateWarningBannerProps) {
    if (!warnings || warnings.length === 0) return null;

    return (
        <div className={`rounded-md border border-yellow-300 bg-yellow-50 p-3 ${className}`}>
            <div className="flex gap-2">
                <svg className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <div className="flex-1">
                    <p className="text-xs font-semibold text-yellow-800 mb-1">
                        Possible Duplicate{warnings.length > 1 ? 's' : ''} Detected
                    </p>
                    <ul className="space-y-1">
                        {warnings.map((w, i) => (
                            <li key={i} className="text-xs text-yellow-700">
                                {w.message}
                                {w.existingRef && (
                                    <span className="ml-1 font-mono text-yellow-800">({w.existingRef})</span>
                                )}
                            </li>
                        ))}
                    </ul>
                    <p className="mt-1.5 text-2xs text-yellow-600">
                        You may still proceed if this is not a duplicate. Please verify carefully.
                    </p>
                </div>
            </div>
        </div>
    );
}

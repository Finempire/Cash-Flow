'use client';

import React from 'react';

export type ChecklistItem = {
    key: string;
    label: string;
    satisfied: boolean;
    blockerNote?: string;
};

type CompletionChecklistProps = {
    items: ChecklistItem[];
    title?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    isSubmitting?: boolean;
    className?: string;
};

/**
 * Completion readiness checklist shown before final sign-off.
 * Blocks confirmation if required items are not satisfied.
 */
export default function CompletionChecklist({
    items,
    title = 'Completion Readiness',
    onConfirm,
    onCancel,
    isSubmitting = false,
    className = '',
}: CompletionChecklistProps) {
    const allSatisfied = items.every((i) => i.satisfied);
    const blockers = items.filter((i) => !i.satisfied);

    return (
        <div className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>
            <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                    All items must be satisfied before completing.
                </p>
            </div>

            <ul className="divide-y divide-gray-50 px-4">
                {items.map((item) => (
                    <li key={item.key} className="flex items-start gap-3 py-2.5">
                        <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                            item.satisfied ? 'bg-green-100' : 'bg-red-50'
                        }`}>
                            {item.satisfied ? (
                                <svg className="w-2.5 h-2.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-2.5 h-2.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <p className={`text-xs font-medium ${item.satisfied ? 'text-gray-700' : 'text-red-700'}`}>
                                {item.label}
                            </p>
                            {item.blockerNote && !item.satisfied && (
                                <p className="text-2xs text-red-500 mt-0.5">{item.blockerNote}</p>
                            )}
                        </div>
                    </li>
                ))}
            </ul>

            {blockers.length > 0 && (
                <div className="px-4 py-2 bg-red-50 border-t border-red-100 mx-0 rounded-b-none">
                    <p className="text-xs text-red-600 font-medium">
                        {blockers.length} item{blockers.length > 1 ? 's' : ''} blocking completion.
                    </p>
                </div>
            )}

            {(onConfirm || onCancel) && (
                <div className="flex justify-end gap-3 px-4 py-3 border-t border-gray-100">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="btn-ghost text-xs px-4 py-2"
                        >
                            Cancel
                        </button>
                    )}
                    {onConfirm && (
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={!allSatisfied || isSubmitting}
                            className="btn-primary text-xs px-4 py-2 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Processing…' : 'Confirm & Complete'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

'use client';

import React from 'react';

type FormFooterProps = {
    onCancel?: () => void;
    onSaveDraft?: () => void;
    onSubmit?: () => void;
    cancelLabel?: string;
    saveDraftLabel?: string;
    submitLabel?: string;
    isSubmitting?: boolean;
    isSavingDraft?: boolean;
    showSaveDraft?: boolean;
    submitDisabled?: boolean;
    className?: string;
};

/**
 * Sticky form action footer with Cancel / Save Draft / Submit buttons.
 * Disables submit while mutation is pending (idempotency guard).
 */
export default function FormFooter({
    onCancel,
    onSaveDraft,
    onSubmit,
    cancelLabel = 'Cancel',
    saveDraftLabel = 'Save Draft',
    submitLabel = 'Submit',
    isSubmitting = false,
    isSavingDraft = false,
    showSaveDraft = false,
    submitDisabled = false,
    className = '',
}: FormFooterProps) {
    return (
        <div
            className={`sticky bottom-0 flex items-center justify-end gap-3 p-4 bg-white border-t border-gray-200 ${className}`}
        >
            {onCancel && (
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="btn-ghost px-4 py-2 text-xs disabled:opacity-50"
                >
                    {cancelLabel}
                </button>
            )}

            {showSaveDraft && onSaveDraft && (
                <button
                    type="button"
                    onClick={onSaveDraft}
                    disabled={isSavingDraft || isSubmitting}
                    className="btn-secondary px-4 py-2 text-xs disabled:opacity-50"
                >
                    {isSavingDraft ? 'Saving…' : saveDraftLabel}
                </button>
            )}

            {onSubmit && (
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={isSubmitting || submitDisabled}
                    className="btn-primary px-5 py-2 text-xs disabled:opacity-60 flex items-center gap-2"
                >
                    {isSubmitting && (
                        <svg
                            className="animate-spin w-3.5 h-3.5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                        </svg>
                    )}
                    {isSubmitting ? 'Submitting…' : submitLabel}
                </button>
            )}
        </div>
    );
}

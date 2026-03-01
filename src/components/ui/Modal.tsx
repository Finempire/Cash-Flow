'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
}

export default function Modal({
    open,
    onClose,
    title,
    children,
    maxWidth = 'max-w-md',
}: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        if (open) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/20" onClick={onClose} />
            <div
                ref={modalRef}
                className={`relative w-full ${maxWidth} bg-white rounded shadow-sm border border-gray-200`}
            >
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200">
                    <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="p-4">{children}</div>
            </div>
        </div>
    );
}

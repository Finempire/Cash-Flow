'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    width?: string;
}

export default function Sheet({
    open,
    onClose,
    title,
    children,
    width = 'max-w-lg',
}: SheetProps) {
    const sheetRef = useRef<HTMLDivElement>(null);

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
        <div className="fixed inset-0 z-50 flex justify-end">
            <div
                className="fixed inset-0 bg-black/20"
                onClick={onClose}
            />
            <div
                ref={sheetRef}
                className={`relative w-full ${width} h-full bg-white shadow-sm border-l border-gray-200 overflow-y-auto scrollbar-thin animate-slide-in`}
            >
                <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-2.5 border-b border-gray-200 z-10">
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

            <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.2s ease-out;
        }
      `}</style>
        </div>
    );
}

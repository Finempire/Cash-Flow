'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

export interface CreatedMaterial {
    id: string;
    sku_code: string;
    description: string;
    unit_of_measure: string;
    default_rate?: number;
}

interface Props {
    onCreated: (material: CreatedMaterial) => void;
    onClose: () => void;
}

const CATEGORIES = ['Fabric', 'Trim', 'Thread', 'Button', 'Zipper', 'Other'];
const UNITS = ['meters', 'kg', 'pieces', 'rolls', 'dozen', 'Other'];

export default function AddMaterialModal({ onCreated, onClose }: Props) {
    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [category, setCategory] = useState('');
    const [uom, setUom] = useState('');
    const [rate, setRate] = useState('');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const nameRef = useRef<HTMLInputElement>(null);

    // Focus name field on open
    useEffect(() => { nameRef.current?.focus(); }, []);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!name.trim()) errs.description = 'Material name is required';
        if (!uom) errs.unit_of_measure = 'Unit of measure is required';
        if (rate && (isNaN(Number(rate)) || Number(rate) <= 0)) errs.default_rate = 'Rate must be a positive number';
        return errs;
    };

    const handleSave = async () => {
        const clientErrors = validate();
        if (Object.keys(clientErrors).length > 0) { setErrors(clientErrors); return; }

        setSaving(true);
        setErrors({});

        try {
            const res = await fetch('/api/master/materials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: name.trim(),
                    sku_code: sku.trim() || undefined,
                    category: category || undefined,
                    unit_of_measure: uom,
                    default_rate: rate ? Number(rate) : undefined,
                }),
            });

            const json = await res.json();

            if (!res.ok) {
                if (json.fieldErrors) {
                    setErrors(json.fieldErrors);
                } else {
                    toast.error(json.error || 'Failed to create material');
                }
                return;
            }

            toast.success('Material added and selected');
            onCreated(json as CreatedMaterial);
        } catch {
            toast.error('Network error — please try again');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-gray-900/60"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Dialog */}
            <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">Add New Material</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-4 py-4 space-y-3">
                    {/* Material Name */}
                    <div>
                        <label className="label">
                            Material Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            ref={nameRef}
                            type="text"
                            value={name}
                            onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, description: '' })); }}
                            className={`input h-9 text-sm ${errors.description ? 'border-red-400 focus:ring-red-400' : ''}`}
                            placeholder="e.g. Silk Thread Red"
                        />
                        {errors.description && (
                            <p className="mt-0.5 text-2xs text-red-600">{errors.description}</p>
                        )}
                    </div>

                    {/* SKU */}
                    <div>
                        <label className="label">SKU / Code <span className="text-gray-400 font-normal">(optional)</span></label>
                        <input
                            type="text"
                            value={sku}
                            onChange={(e) => { setSku(e.target.value); setErrors((p) => ({ ...p, sku_code: '' })); }}
                            className={`input h-9 text-sm ${errors.sku_code ? 'border-red-400 focus:ring-red-400' : ''}`}
                            placeholder="e.g. TRM-SLK-RED-001"
                        />
                        {errors.sku_code && (
                            <p className="mt-0.5 text-2xs text-red-600">{errors.sku_code}</p>
                        )}
                        <p className="mt-0.5 text-2xs text-gray-400">Leave blank to auto-generate</p>
                    </div>

                    {/* Category + UoM side by side */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="select h-9 text-sm"
                            >
                                <option value="">Select category</option>
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">
                                Unit of Measure <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={uom}
                                onChange={(e) => { setUom(e.target.value); setErrors((p) => ({ ...p, unit_of_measure: '' })); }}
                                className={`select h-9 text-sm ${errors.unit_of_measure ? 'border-red-400 focus:ring-red-400' : ''}`}
                            >
                                <option value="">Select unit</option>
                                {UNITS.map((u) => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                            {errors.unit_of_measure && (
                                <p className="mt-0.5 text-2xs text-red-600">{errors.unit_of_measure}</p>
                            )}
                        </div>
                    </div>

                    {/* Default Rate */}
                    <div>
                        <label className="label">Default Rate <span className="text-gray-400 font-normal">(optional)</span></label>
                        <input
                            type="number"
                            value={rate}
                            onChange={(e) => { setRate(e.target.value); setErrors((p) => ({ ...p, default_rate: '' })); }}
                            className={`input h-9 text-sm ${errors.default_rate ? 'border-red-400 focus:ring-red-400' : ''}`}
                            placeholder="0.00"
                            min="0.01"
                            step="0.01"
                        />
                        {errors.default_rate && (
                            <p className="mt-0.5 text-2xs text-red-600">{errors.default_rate}</p>
                        )}
                        <p className="mt-0.5 text-2xs text-gray-400">Auto-fills Rate field in the request line</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary"
                    >
                        {saving ? 'Saving...' : 'Save & Select'}
                    </button>
                </div>
            </div>
        </div>
    );
}

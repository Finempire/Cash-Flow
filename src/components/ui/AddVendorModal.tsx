'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

export interface CreatedVendor {
    id: string;
    name: string;
    gstin: string;
}

interface Props {
    stage: 'MATERIAL_REQUEST' | 'PURCHASE';
    onCreated: (vendor: CreatedVendor) => void;
    onClose: () => void;
}

export default function AddVendorModal({ stage, onCreated, onClose }: Props) {
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [gstin, setGstin] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => { nameRef.current?.focus(); }, []);
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleSave = async () => {
        const errs: Record<string, string> = {};
        if (!name.trim()) errs.name = 'Vendor name is required';
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        setSaving(true);
        setErrors({});
        try {
            const res = await fetch('/api/master/vendors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    contact_person: contact.trim() || undefined,
                    phone: phone.trim() || undefined,
                    address: address.trim() || undefined,
                    gstin: gstin.trim() || undefined,
                    notes: notes.trim() || undefined,
                    created_inline: true,
                    created_at_stage: stage,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                if (json.fieldErrors) setErrors(json.fieldErrors);
                else toast.error(json.error || 'Failed to create vendor');
                return;
            }
            toast.success('Vendor added and selected');
            onCreated(json as CreatedVendor);
        } catch {
            toast.error('Network error — please try again');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60" onClick={onClose} aria-hidden="true" />
            <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">Add New Vendor</h2>
                    <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded" aria-label="Close">
                        <X size={16} />
                    </button>
                </div>
                {/* Body */}
                <div className="px-4 py-4 space-y-3 overflow-y-auto">
                    {/* Name */}
                    <div>
                        <label className="label">Vendor Name <span className="text-red-500">*</span></label>
                        <input ref={nameRef} type="text" value={name}
                            onChange={(e) => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
                            className={`input h-9 text-sm ${errors.name ? 'border-red-400' : ''}`}
                            placeholder="e.g. Sharma Fabrics" />
                        {errors.name && <p className="mt-0.5 text-2xs text-red-600">{errors.name}</p>}
                    </div>
                    {/* Contact + Phone */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">Contact Person</label>
                            <input type="text" value={contact} onChange={(e) => setContact(e.target.value)}
                                className="input h-9 text-sm" placeholder="Optional" />
                        </div>
                        <div>
                            <label className="label">Phone Number</label>
                            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                                className="input h-9 text-sm" placeholder="Optional" />
                        </div>
                    </div>
                    {/* Address */}
                    <div>
                        <label className="label">Address / Market</label>
                        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                            className="input h-9 text-sm" placeholder="e.g. Chandni Chowk, Delhi" />
                    </div>
                    {/* GSTIN */}
                    <div>
                        <label className="label">GSTIN <span className="text-gray-400 font-normal">(optional)</span></label>
                        <input type="text" value={gstin} onChange={(e) => setGstin(e.target.value)}
                            className="input h-9 text-sm" placeholder="e.g. 07AAACM0835G1ZP" />
                    </div>
                    {/* Notes */}
                    <div>
                        <label className="label">Notes</label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                            className="textarea text-sm" rows={2} placeholder="Optional" />
                    </div>
                </div>
                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">Cancel</button>
                    <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
                        {saving ? 'Saving...' : 'Save & Select'}
                    </button>
                </div>
            </div>
        </div>
    );
}

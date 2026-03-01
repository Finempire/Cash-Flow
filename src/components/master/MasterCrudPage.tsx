'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Sheet from '@/components/ui/Sheet';
import { Plus, Edit2 } from 'lucide-react';
import {
    createVendor, updateVendor,
    createBuyer, updateBuyer,
    createOrder, updateOrder,
    createMaterial, updateMaterial,
    createUser, updateUser,
} from '@/app/actions/master-data';

interface Column {
    key: string;
    label: string;
    type?: 'boolean';
}

interface Field {
    key: string;
    label: string;
    required?: boolean;
    type?: 'textarea' | 'checkbox' | 'select' | 'number';
    options?: { value: string; label: string }[];
    defaultValue?: unknown;
}

interface MasterCrudPageProps {
    title: string;
    entityType: string;
    data: Record<string, unknown>[];
    columns: Column[];
    fields: Field[];
    extraData?: Record<string, unknown>;
}

const actionMap: Record<string, { create: (data: Record<string, unknown>) => Promise<{ success: boolean }>; update: (id: string, data: Record<string, unknown>) => Promise<{ success: boolean }> }> = {
    vendor: {
        create: (data) => createVendor(data as Parameters<typeof createVendor>[0]),
        update: (id, data) => updateVendor(id, data as Parameters<typeof updateVendor>[1]),
    },
    buyer: {
        create: (data) => createBuyer(data as Parameters<typeof createBuyer>[0]),
        update: (id, data) => updateBuyer(id, data as Parameters<typeof updateBuyer>[1]),
    },
    order: {
        create: (data) => createOrder(data as Parameters<typeof createOrder>[0]),
        update: (id, data) => updateOrder(id, data as Parameters<typeof updateOrder>[1]),
    },
    material: {
        create: (data) => createMaterial(data as Parameters<typeof createMaterial>[0]),
        update: (id, data) => updateMaterial(id, data as Parameters<typeof updateMaterial>[1]),
    },
    user: {
        create: (data) => createUser(data as Parameters<typeof createUser>[0]),
        update: (id, data) => updateUser(id, data as Parameters<typeof updateUser>[1]),
    },
};

export default function MasterCrudPage({
    title,
    entityType,
    data,
    columns,
    fields,
}: MasterCrudPageProps) {
    const router = useRouter();
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Record<string, unknown>>({});
    const [search, setSearch] = useState('');

    const openCreate = () => {
        const defaults: Record<string, unknown> = {};
        fields.forEach((f) => {
            defaults[f.key] = f.defaultValue !== undefined ? f.defaultValue : f.type === 'checkbox' ? true : '';
        });
        setFormData(defaults);
        setEditItem(null);
        setSheetOpen(true);
    };

    const openEdit = (item: Record<string, unknown>) => {
        setFormData({ ...item });
        setEditItem(item);
        setSheetOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const actions = actionMap[entityType];
            if (!actions) throw new Error('Unknown entity type');

            // Convert numeric fields
            const processedData = { ...formData };
            fields.forEach((f) => {
                if (f.type === 'number' && processedData[f.key]) {
                    processedData[f.key] = parseFloat(processedData[f.key] as string);
                }
            });

            if (editItem) {
                await actions.update(editItem.id as string, processedData);
                toast.success(`${title.slice(0, -1)} updated`);
            } else {
                await actions.create(processedData);
                toast.success(`${title.slice(0, -1)} created`);
            }

            setSheetOpen(false);
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    const filtered = data.filter((item) => {
        if (!search) return true;
        return Object.values(item).some(
            (v) => String(v).toLowerCase().includes(search.toLowerCase())
        );
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
                <button onClick={openCreate} className="btn-primary">
                    <Plus size={14} /> Add {title.slice(0, -1)}
                </button>
            </div>

            <div className="card">
                <div className="card-header">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input w-64"
                        placeholder={`Search ${title.toLowerCase()}...`}
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                {columns.map((col) => (
                                    <th key={col.key} className="text-left px-3 py-2 font-medium text-gray-600">
                                        {col.label}
                                    </th>
                                ))}
                                <th className="text-left px-3 py-2 font-medium text-gray-600 w-16">Edit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((item, i) => (
                                <tr key={item.id as string || i} className="border-b border-gray-100 even:bg-gray-50 hover:bg-blue-50/50">
                                    {columns.map((col) => (
                                        <td key={col.key} className="px-3 py-2 text-gray-700">
                                            {col.type === 'boolean' ? (
                                                <span className={item[col.key] ? 'badge-green' : 'badge-red'}>
                                                    {item[col.key] ? 'Yes' : 'No'}
                                                </span>
                                            ) : (
                                                String(item[col.key] || '-')
                                            )}
                                        </td>
                                    ))}
                                    <td className="px-3 py-2">
                                        <button onClick={() => openEdit(item)} className="p-1 text-gray-400 hover:text-blue-600">
                                            <Edit2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={columns.length + 1} className="px-3 py-8 text-center text-gray-400">No records</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Sheet
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                title={editItem ? `Edit ${title.slice(0, -1)}` : `New ${title.slice(0, -1)}`}
            >
                <form onSubmit={handleSubmit} className="space-y-3">
                    {fields.map((field) => (
                        <div key={field.key}>
                            <label className="label">{field.label}</label>
                            {field.type === 'textarea' ? (
                                <textarea
                                    value={(formData[field.key] as string) || ''}
                                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                    className="textarea"
                                    rows={3}
                                    required={field.required}
                                />
                            ) : field.type === 'checkbox' ? (
                                <label className="flex items-center gap-2 text-xs">
                                    <input
                                        type="checkbox"
                                        checked={!!formData[field.key]}
                                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.checked })}
                                        className="rounded border-gray-300"
                                    />
                                    {field.label}
                                </label>
                            ) : field.type === 'select' ? (
                                <select
                                    value={(formData[field.key] as string) || ''}
                                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                    className="select"
                                    required={field.required}
                                >
                                    <option value="">Select...</option>
                                    {field.options?.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type={field.type === 'number' ? 'number' : 'text'}
                                    value={(formData[field.key] as string) || ''}
                                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                    className="input"
                                    required={field.required}
                                    step={field.type === 'number' ? '0.01' : undefined}
                                />
                            )}
                        </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? 'Saving...' : editItem ? 'Update' : 'Create'}
                        </button>
                        <button type="button" onClick={() => setSheetOpen(false)} className="btn-secondary">
                            Cancel
                        </button>
                    </div>
                </form>
            </Sheet>
        </div>
    );
}

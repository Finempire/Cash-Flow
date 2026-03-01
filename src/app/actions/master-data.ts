'use server';

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { hash } from 'bcryptjs';

// ============== VENDOR ACTIONS ==============

const VendorSchema = z.object({
    name: z.string().min(1),
    gstin: z.string().optional(),
    contact_person: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
    is_active: z.boolean().default(true),
});

export async function createVendor(formData: z.infer<typeof VendorSchema>) {
    await requireRole('ACCOUNTANT');
    const data = VendorSchema.parse(formData);

    const vendor = await prisma.vendor.create({
        data: {
            name: data.name,
            gstin: data.gstin || null,
            contact_person: data.contact_person || null,
            phone: data.phone || null,
            address: data.address || null,
            notes: data.notes || null,
            is_active: data.is_active,
        },
    });

    revalidatePath('/dashboard/accountant/master/vendors');
    return { success: true, id: vendor.id };
}

export async function updateVendor(id: string, formData: z.infer<typeof VendorSchema>) {
    await requireRole('ACCOUNTANT');
    const data = VendorSchema.parse(formData);

    await prisma.vendor.update({
        where: { id },
        data: {
            name: data.name,
            gstin: data.gstin || null,
            contact_person: data.contact_person || null,
            phone: data.phone || null,
            address: data.address || null,
            notes: data.notes || null,
            is_active: data.is_active,
        },
    });

    revalidatePath('/dashboard/accountant/master/vendors');
    return { success: true };
}

// ============== BUYER ACTIONS ==============

const BuyerSchema = z.object({
    name: z.string().min(1),
    brand_code: z.string().min(1),
    contact_details: z.string().optional(),
    notes: z.string().optional(),
});

export async function createBuyer(formData: z.infer<typeof BuyerSchema>) {
    await requireRole('ACCOUNTANT');
    const data = BuyerSchema.parse(formData);

    const buyer = await prisma.buyer.create({
        data: {
            name: data.name,
            brand_code: data.brand_code,
            contact_details: data.contact_details || null,
            notes: data.notes || null,
        },
    });

    revalidatePath('/dashboard/accountant/master/buyers');
    return { success: true, id: buyer.id };
}

export async function updateBuyer(id: string, formData: z.infer<typeof BuyerSchema>) {
    await requireRole('ACCOUNTANT');
    const data = BuyerSchema.parse(formData);

    await prisma.buyer.update({
        where: { id },
        data: {
            name: data.name,
            brand_code: data.brand_code,
            contact_details: data.contact_details || null,
            notes: data.notes || null,
        },
    });

    revalidatePath('/dashboard/accountant/master/buyers');
    return { success: true };
}

// ============== ORDER ACTIONS ==============

const OrderSchema = z.object({
    order_reference: z.string().min(1),
    buyer_id: z.string().uuid(),
    style_name: z.string().optional(),
    season: z.string().optional(),
    remarks: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    is_active: z.boolean().default(true),
});

export async function createOrder(formData: z.infer<typeof OrderSchema>) {
    await requireRole('ACCOUNTANT');
    const data = OrderSchema.parse(formData);

    const order = await prisma.order.create({
        data: {
            order_reference: data.order_reference,
            buyer_id: data.buyer_id,
            style_name: data.style_name || null,
            season: data.season || null,
            remarks: data.remarks || null,
            start_date: data.start_date ? new Date(data.start_date) : null,
            end_date: data.end_date ? new Date(data.end_date) : null,
            is_active: data.is_active,
        },
    });

    revalidatePath('/dashboard/accountant/master/orders');
    return { success: true, id: order.id };
}

export async function updateOrder(id: string, formData: z.infer<typeof OrderSchema>) {
    await requireRole('ACCOUNTANT');
    const data = OrderSchema.parse(formData);

    await prisma.order.update({
        where: { id },
        data: {
            order_reference: data.order_reference,
            buyer_id: data.buyer_id,
            style_name: data.style_name || null,
            season: data.season || null,
            remarks: data.remarks || null,
            start_date: data.start_date ? new Date(data.start_date) : null,
            end_date: data.end_date ? new Date(data.end_date) : null,
            is_active: data.is_active,
        },
    });

    revalidatePath('/dashboard/accountant/master/orders');
    return { success: true };
}

// ============== MATERIAL ACTIONS ==============

const MaterialSchema = z.object({
    sku_code: z.string().min(1),
    description: z.string().min(1),
    category: z.string().optional(),
    unit_of_measure: z.string().min(1),
    default_rate: z.number().optional(),
});

export async function createMaterial(formData: z.infer<typeof MaterialSchema>) {
    await requireRole('ACCOUNTANT');
    const data = MaterialSchema.parse(formData);

    const material = await prisma.material.create({
        data: {
            sku_code: data.sku_code,
            description: data.description,
            category: data.category || null,
            unit_of_measure: data.unit_of_measure,
            default_rate: data.default_rate || null,
        },
    });

    revalidatePath('/dashboard/accountant/master/materials');
    return { success: true, id: material.id };
}

export async function updateMaterial(id: string, formData: z.infer<typeof MaterialSchema>) {
    await requireRole('ACCOUNTANT');
    const data = MaterialSchema.parse(formData);

    await prisma.material.update({
        where: { id },
        data: {
            sku_code: data.sku_code,
            description: data.description,
            category: data.category || null,
            unit_of_measure: data.unit_of_measure,
            default_rate: data.default_rate || null,
        },
    });

    revalidatePath('/dashboard/accountant/master/materials');
    return { success: true };
}

// ============== USER ACTIONS ==============

const UserSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    role: z.enum(['STORE_MANAGER', 'RUNNER', 'ACCOUNTANT', 'CEO']),
    password: z.string().min(6).optional(),
    is_active: z.boolean().default(true),
});

export async function createUser(formData: z.infer<typeof UserSchema>) {
    await requireRole('ACCOUNTANT');
    const data = UserSchema.parse(formData);

    if (!data.password) throw new Error('Password is required for new users');

    const passwordHash = await hash(data.password, 12);

    const user = await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            password_hash: passwordHash,
            role: data.role,
            is_active: data.is_active,
            must_change_password: true,
        },
    });

    revalidatePath('/dashboard/accountant/users');
    return { success: true, id: user.id };
}

export async function updateUser(id: string, formData: z.infer<typeof UserSchema>) {
    await requireRole('ACCOUNTANT');
    const data = UserSchema.parse(formData);

    const updateData: Record<string, unknown> = {
        name: data.name,
        email: data.email,
        role: data.role,
        is_active: data.is_active,
    };

    if (data.password) {
        updateData.password_hash = await hash(data.password, 12);
        updateData.must_change_password = true;
    }

    await prisma.user.update({
        where: { id },
        data: updateData as { name: string; email: string; role: 'STORE_MANAGER' | 'RUNNER' | 'ACCOUNTANT' | 'CEO'; is_active: boolean; password_hash?: string; must_change_password?: boolean },
    });

    revalidatePath('/dashboard/accountant/users');
    return { success: true };
}

// ============== PASSWORD CHANGE ==============

export async function changePassword(currentPassword: string, newPassword: string) {
    const { auth } = await import('@/lib/auth');
    const session = await auth();
    if (!session?.user) throw new Error('Not authenticated');

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) throw new Error('User not found');

    const { compare } = await import('bcryptjs');
    const isValid = await compare(currentPassword, user.password_hash);
    if (!isValid) throw new Error('Current password is incorrect');

    const passwordHash = await hash(newPassword, 12);
    await prisma.user.update({
        where: { id: session.user.id },
        data: { password_hash: passwordHash, must_change_password: false },
    });

    return { success: true };
}

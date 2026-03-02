import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const UPLOAD_PERMISSIONS: Record<string, string[]> = {
    PROVISIONAL_INVOICE: ['RUNNER'],
    TAX_INVOICE: ['RUNNER'],
    PAYMENT_PROOF: ['ACCOUNTANT'],
};

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const type = formData.get('type') as string | null;
        const purchaseId = formData.get('purchase_id') as string | null;

        // Validate file presence
        if (!file || file.size === 0) {
            return NextResponse.json({ error: 'Please select a file' }, { status: 400 });
        }

        // Validate type
        if (!type || !UPLOAD_PERMISSIONS[type]) {
            return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
        }

        // Validate role
        const allowedRoles = UPLOAD_PERMISSIONS[type];
        if (!allowedRoles.includes(session.user.role)) {
            return NextResponse.json(
                { error: `Only ${allowedRoles.join(' or ')} can upload ${type}` },
                { status: 403 }
            );
        }

        // Validate mime type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.' },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File size must be under 10MB' }, { status: 400 });
        }

        // Generate file path
        const timestamp = Date.now();
        const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const folder = purchaseId || 'new';
        const typeLower = type.toLowerCase().replace(/_/g, '-');
        const relativePath = `/uploads/${typeLower}/${folder}/${timestamp}_${safeFilename}`;

        // Save to disk
        const uploadDir = join(process.cwd(), 'public', 'uploads', typeLower, folder);
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fullPath = join(uploadDir, `${timestamp}_${safeFilename}`);
        await writeFile(fullPath, buffer);

        // Update DB if purchaseId provided
        if (purchaseId) {
            if (type === 'PROVISIONAL_INVOICE') {
                await prisma.purchase.update({
                    where: { id: purchaseId },
                    data: { provisional_invoice_path: relativePath },
                });
            } else if (type === 'TAX_INVOICE') {
                await prisma.purchase.update({
                    where: { id: purchaseId },
                    data: { tax_invoice_path: relativePath },
                });
            } else if (type === 'PAYMENT_PROOF') {
                // Payment proof is updated when recording payment
                // Just return the path for use in the payment form
            }

            // Write audit log
            await prisma.auditLog.create({
                data: {
                    entity_type: 'Purchase',
                    entity_id: purchaseId,
                    action: `${type}_UPLOADED`,
                    performed_by: session.user.id,
                    new_state: { file_path: relativePath, uploaded_by: session.user.name },
                },
            });
        }

        return NextResponse.json({ success: true, file_path: relativePath });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
    }
}

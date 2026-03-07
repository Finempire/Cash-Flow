import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { saveFile, generateSignedUrl } from '@/lib/fileStorage';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const UPLOAD_PERMISSIONS: Record<string, string[]> = {
    PROVISIONAL_INVOICE: ['RUNNER'],
    TAX_INVOICE: ['RUNNER'],
    PAYMENT_PROOF: ['ACCOUNTANT'],
    EXPENSE_INVOICE: ['STORE_MANAGER', 'RUNNER', 'ACCOUNTANT', 'CEO'],
    EXPENSE_PROOF: ['ACCOUNTANT'],
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
        const expenseId = formData.get('expense_id') as string | null;

        if (!file || file.size === 0) {
            return NextResponse.json({ error: 'Please select a file' }, { status: 400 });
        }

        if (!type || !UPLOAD_PERMISSIONS[type]) {
            return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
        }

        const allowedRoles = UPLOAD_PERMISSIONS[type];
        if (!allowedRoles.includes(session.user.role)) {
            return NextResponse.json(
                { error: `Only ${allowedRoles.join(' or ')} can upload ${type}` },
                { status: 403 }
            );
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.' },
                { status: 400 }
            );
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File size must be under 10MB' }, { status: 400 });
        }

        const targetId = type?.startsWith('EXPENSE') ? expenseId : purchaseId;
        const folder = targetId || 'new';
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Save using secure storage layer
        const relativePath = await saveFile(buffer, type, folder, file.name);

        if (targetId) {
            if (type === 'PROVISIONAL_INVOICE') {
                await prisma.purchase.update({
                    where: { id: targetId },
                    data: { provisional_invoice_path: relativePath },
                });
            } else if (type === 'TAX_INVOICE') {
                await prisma.purchase.update({
                    where: { id: targetId },
                    data: { tax_invoice_path: relativePath },
                });
            } else if (type === 'EXPENSE_INVOICE') {
                await prisma.otherExpense.update({
                    where: { id: targetId },
                    data: { invoice_path: relativePath },
                });
            } else if (type === 'EXPENSE_PROOF') {
                await prisma.otherExpense.update({
                    where: { id: targetId },
                    data: { payment_proof_path: relativePath },
                });
            }

            const entityType = type.startsWith('EXPENSE_') ? 'OtherExpense' : 'Purchase';
            await prisma.auditLog.create({
                data: {
                    entity_type: entityType,
                    entity_id: targetId,
                    action: `${type}_UPLOADED`,
                    performed_by: session.user.id,
                    new_state: { file_path: relativePath, uploaded_by: session.user.name },
                },
            });
        }

        // Return signed URL for immediate preview after uploading
        const signedUrl = generateSignedUrl(relativePath);

        return NextResponse.json({
            success: true,
            file_path: relativePath,
            signed_url: signedUrl
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
    }
}


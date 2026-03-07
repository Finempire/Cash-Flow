import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUploadPresignedUrl, generateFileKey } from '@/lib/s3';

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ACCOUNTANT') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { filename, contentType, expenseId } = body;

        if (!filename || !contentType || !expenseId) {
            return NextResponse.json(
                { error: 'filename, contentType, and expenseId are required' },
                { status: 400 }
            );
        }

        const key = generateFileKey('expense-proofs', expenseId, filename);
        const uploadUrl = await getUploadPresignedUrl(key, contentType);

        return NextResponse.json({ uploadUrl, key });
    } catch (error) {
        console.error('Upload URL generation failed:', error);
        return NextResponse.json(
            { error: 'Failed to generate upload URL' },
            { status: 500 }
        );
    }
}

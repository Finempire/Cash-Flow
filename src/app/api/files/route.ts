import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    const download = searchParams.get('download') === '1';

    if (!filePath) {
        return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    // Security: only serve files under /uploads/
    if (!filePath.startsWith('/uploads/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent path traversal
    if (filePath.includes('..')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const fullPath = join(process.cwd(), 'public', filePath);

    if (!existsSync(fullPath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    try {
        const fileBuffer = await readFile(fullPath);
        const ext = filePath.split('.').pop()?.toLowerCase() || '';

        const contentTypeMap: Record<string, string> = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            webp: 'image/webp',
            pdf: 'application/pdf',
        };

        const contentType = contentTypeMap[ext] || 'application/octet-stream';
        const filename = filePath.split('/').pop() || 'file';

        const headers: Record<string, string> = {
            'Content-Type': contentType,
            'Content-Length': fileBuffer.length.toString(),
        };

        if (download) {
            headers['Content-Disposition'] = `attachment; filename="${filename}"`;
        } else {
            headers['Content-Disposition'] = `inline; filename="${filename}"`;
        }

        return new NextResponse(fileBuffer, { status: 200, headers });
    } catch {
        return NextResponse.json({ error: 'Could not read file' }, { status: 500 });
    }
}

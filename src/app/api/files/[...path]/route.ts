import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createReadStream, statSync } from 'fs';
import { verifySignedToken, getAbsolutePath } from '@/lib/fileStorage';

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const session = await auth();
    if (!session?.user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const expires = searchParams.get('expires');
    const token = searchParams.get('token');
    const download = searchParams.get('download') === '1';

    // Reconstruct the relative path
    const relativePath = params.path.join('/');

    if (!expires || !token) {
        return new NextResponse('Missing signature', { status: 400 });
    }

    if (!verifySignedToken(token, expires, relativePath)) {
        return new NextResponse('Invalid or expired signature', { status: 403 });
    }

    try {
        const fullPath = getAbsolutePath(relativePath);

        try {
            statSync(fullPath); // Check if exists
        } catch {
            return new NextResponse('File not found', { status: 404 });
        }

        const ext = relativePath.split('.').pop()?.toLowerCase() || '';
        const contentTypeMap: Record<string, string> = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            webp: 'image/webp',
            pdf: 'application/pdf',
        };

        const contentType = contentTypeMap[ext] || 'application/octet-stream';
        const filename = relativePath.split('/').pop() || 'file';

        // Read stream for better memory performance
        const fileStream = createReadStream(fullPath);

        // Convert Node.js readable stream to Web API readable stream
        const readableStream = new ReadableStream({
            start(controller) {
                fileStream.on('data', (chunk) => controller.enqueue(chunk));
                fileStream.on('end', () => controller.close());
                fileStream.on('error', (err) => controller.error(err));
            },
            cancel() {
                fileStream.destroy();
            },
        });

        const headers: Record<string, string> = {
            'Content-Type': contentType,
            'Cache-Control': 'private, max-age=3600',
        };

        if (download) {
            headers['Content-Disposition'] = `attachment; filename="${filename}"`;
        } else {
            headers['Content-Disposition'] = `inline; filename="${filename}"`;
        }

        return new NextResponse(readableStream, { status: 200, headers });
    } catch (error) {
        console.error('File serving error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

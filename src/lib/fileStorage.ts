import { createHmac } from 'crypto';
import { writeFile, mkdir, rmdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, isAbsolute, resolve } from 'path';

const SIGNING_SECRET = process.env.FILE_SIGNING_SECRET || 'default_secret_do_not_use_in_prod';
const BASE_PATH = process.env.UPLOAD_BASE_PATH || './uploads';

/**
 * Resolves a relative path to an absolute path within the secure upload directory.
 * Prevents directory traversal attacks.
 */
export function getAbsolutePath(relativePath: string): string {
    // Normalize path and prevent directory traversal
    const safeRelativePath = relativePath.replace(/\.\./g, '');

    // Resolve absolute base path
    const absoluteBasePath = isAbsolute(BASE_PATH)
        ? BASE_PATH
        : resolve(process.cwd(), BASE_PATH);

    const fullPath = join(absoluteBasePath, safeRelativePath);

    // Ensure the resulting path is still within the base directory
    if (!fullPath.startsWith(absoluteBasePath)) {
        throw new Error('Path traversal attempt detected');
    }

    return fullPath;
}

/**
 * Verifies a signed token for a file path.
 */
export function verifySignedToken(token: string, expires: string, path: string): boolean {
    const timestamp = parseInt(expires, 10);
    if (isNaN(timestamp) || Date.now() > timestamp) {
        return false; // Expired or invalid
    }

    const payload = `${path}:${expires}`;
    const expectedToken = createHmac('sha256', SIGNING_SECRET)
        .update(payload)
        .digest('hex');

    return token === expectedToken;
}

/**
 * Generates a signed URL for a file that expires after a defined duration.
 */
export function generateSignedUrl(relativePath: string, expiresInMinutes: number = 15): string {
    const expires = (Date.now() + expiresInMinutes * 60 * 1000).toString();
    const payload = `${relativePath}:${expires}`;

    const token = createHmac('sha256', SIGNING_SECRET)
        .update(payload)
        .digest('hex');

    const searchParams = new URLSearchParams({
        path: relativePath,
        expires,
        token
    });

    return `/api/files?${searchParams.toString()}`;
}

/**
 * Saves a file buffer to the secure storage and returns its relative path.
 */
export async function saveFile(
    buffer: Buffer,
    type: string,
    entityId: string,
    filename: string
): Promise<string> {
    const timestamp = Date.now();
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folder = entityId;
    const typeLower = type.toLowerCase().replace(/_/g, '-');

    const relativePath = `${typeLower}/${folder}/${timestamp}_${safeFilename}`;
    const fullPath = getAbsolutePath(relativePath);

    // Create directory if it doesn't exist
    const dir = join(getAbsolutePath(''), typeLower, folder);
    if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
    }

    await writeFile(fullPath, buffer);
    return relativePath;
}

/**
 * Deletes a file from secure storage given its relative path.
 */
export async function deleteFile(relativePath: string): Promise<void> {
    const fullPath = getAbsolutePath(relativePath);
    if (existsSync(fullPath)) {
        await unlink(fullPath);
    }
}

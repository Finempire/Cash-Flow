import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
    },
    forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET_NAME || 'cashflow-documents';

export async function getUploadPresignedUrl(
    key: string,
    contentType: string
): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
    });

    return getSignedUrl(s3Client, command, { expiresIn: 900 }); // 15 min
}

export async function getDownloadPresignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn: 900 }); // 15 min
}

export function generateFileKey(
    folder: string,
    purchaseId: string,
    filename: string
): string {
    const ext = filename.split('.').pop() || 'pdf';
    const timestamp = Date.now();
    return `${folder}/${purchaseId}/${timestamp}.${ext}`;
}

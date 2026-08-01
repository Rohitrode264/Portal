import { Request, Response } from 'express';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

export const getPresignedUrl = async (req: Request, res: Response): Promise<void> => {
    try {
        const { contentType, fileName } = req.body;

        if (!contentType || !fileName) {
            res.status(400).json({ error: 'contentType and fileName are required' });
            return;
        }

        const region = process.env.AWS_REGION || 'ap-south-1';
        const bucket = process.env.AWS_S3_BUCKET_NAME;

        if (!bucket || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            res.status(500).json({ error: 'AWS S3 configuration is missing on the server' });
            return;
        }

        const s3Client = new S3Client({
            region,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
        });

        // Generate unique key to prevent overwrites
        const fileExtension = fileName.split('.').pop() || 'png';
        const uniqueKey = `diagrams/${crypto.randomUUID()}.${fileExtension}`;

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: uniqueKey,
            ContentType: contentType,
        });

        // URL expires in 5 minutes
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${uniqueKey}`;

        res.json({ presignedUrl, publicUrl });
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
};

// Utility to delete object from S3 using public URL
export const deleteFromS3 = async (publicUrl: string): Promise<void> => {
    try {
        const bucket = process.env.AWS_S3_BUCKET_NAME;
        const region = process.env.AWS_REGION || 'ap-south-1';
        if (!bucket || !publicUrl.includes(bucket)) return;

        // Example URL: https://bucket-name.s3.ap-south-1.amazonaws.com/diagrams/uuid.png
        const baseUrl = `https://${bucket}.s3.${region}.amazonaws.com/`;
        if (!publicUrl.startsWith(baseUrl)) return;

        const key = publicUrl.substring(baseUrl.length);

        const s3Client = new S3Client({
            region,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            }
        });

        await s3Client.send(new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
        }));
        console.log(`Deleted ${key} from S3`);
    } catch (error) {
        console.error('Error deleting from S3:', error);
    }
};

export const deleteImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { url } = req.body;
        if (!url) {
            res.status(400).json({ error: 'url is required' });
            return;
        }
        await deleteFromS3(url);
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete image' });
    }
};


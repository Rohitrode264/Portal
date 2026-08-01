const { S3Client, PutBucketPolicyCommand, DeletePublicAccessBlockCommand } = require('@aws-sdk/client-s3');

require('dotenv').config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const bucketName = process.env.AWS_S3_BUCKET_NAME;

const policy = {
    Version: "2012-10-17",
    Statement: [
        {
            Sid: "PublicReadGetObject",
            Effect: "Allow",
            Principal: "*",
            Action: "s3:GetObject",
            Resource: `arn:aws:s3:::${bucketName}/*`
        }
    ]
};

async function makeBucketPublic() {
    try {
        console.log(`Removing Public Access Block for ${bucketName}...`);
        await s3Client.send(new DeletePublicAccessBlockCommand({ Bucket: bucketName }));
        console.log('Public Access Block removed.');

        console.log(`Applying Bucket Policy to ${bucketName}...`);
        await s3Client.send(new PutBucketPolicyCommand({
            Bucket: bucketName,
            Policy: JSON.stringify(policy)
        }));
        console.log('Bucket Policy applied successfully. Objects are now public!');
    } catch (err) {
        console.error('Error:', err);
    }
}

makeBucketPublic();

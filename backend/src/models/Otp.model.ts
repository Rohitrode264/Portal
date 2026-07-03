import mongoose, { Document, Schema } from 'mongoose';

export interface IOtp extends Document {
    identifier: string; // CP ID of the student
    otp: string;
    expiresAt: Date;
    lastSentAt: Date;
    resendCount: number; // for progressive backoff
    createdAt: Date;
}

const OtpSchema = new Schema<IOtp>(
    {
        identifier: {
            type: String,
            required: true,
            index: true,
        },
        otp: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        lastSentAt: {
            type: Date,
            default: Date.now,
        },
        resendCount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

// Automatically delete expired OTPs (TTL index)
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = mongoose.model<IOtp>('Otp', OtpSchema);

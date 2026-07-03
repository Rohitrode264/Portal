import mongoose, { Document, Schema } from 'mongoose';

export interface ISession extends Document {
    userId: string;       // CP ID (student, teacher, or admin)
    role: string;
    sessionId: string;    // UUID — rotates on every login
    lastSeen: Date;
    isExamLocked: boolean;
    lockedExamId?: string;
    createdAt: Date;
}

const SessionSchema = new Schema<ISession>(
    {
        userId: { type: String, required: true, index: true },
        role: { type: String, required: true },
        sessionId: { type: String, required: true, unique: true },
        lastSeen: { type: Date, default: Date.now },
        isExamLocked: { type: Boolean, default: false },
        lockedExamId: { type: String },
    },
    { timestamps: true, collection: 'portal_sessions' }
);

// Auto-expire sessions after 31 days of inactivity
SessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31 * 24 * 60 * 60 });

export const Session = mongoose.model<ISession>('Session', SessionSchema);

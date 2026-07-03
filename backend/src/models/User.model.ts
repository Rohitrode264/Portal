import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'ADMIN' | 'TEACHER' | 'ASSISTANT';
export type SubjectType = 'PHYSICS' | 'CHEMISTRY' | 'MATHS' | 'BIOLOGY';

export interface IUser extends Document {
    cpId: string;
    email?: string;
    password?: string;
    role: UserRole;
    name: string;
    phone?: string;
    // Teacher-specific fields
    subject?: SubjectType;
    designation?: string; // e.g. "Physics Faculty", "Senior Chemistry Teacher"
    // Auth & session
    isActive: boolean;
    refreshToken?: string; // hashed refresh token
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        cpId: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        email: {
            type: String,
            sparse: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: { type: String },
        role: {
            type: String,
            enum: ['ADMIN', 'TEACHER', 'ASSISTANT'],
            required: true,
        },
        name: { type: String, required: true },
        phone: { type: String },
        subject: {
            type: String,
            enum: ['PHYSICS', 'CHEMISTRY', 'MATHS', 'BIOLOGY'],
        },
        designation: { type: String },
        isActive: { type: Boolean, default: true },
        refreshToken: { type: String },
    },
    { timestamps: true, collection: 'portal_users' }
);

export const User = mongoose.model<IUser>('User', UserSchema);

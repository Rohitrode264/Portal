import mongoose, { Document, Schema, Types } from 'mongoose';

// Read-only model pointing to the same 'students' collection used by the Finance System
export interface IStudent extends Document {
    _id: Types.ObjectId;
    admissionNumber: string; // The CP ID (e.g. CP20264960)
    firstName: string;
    lastName: string;
    phone: string;
    whatsappNumber?: string;
    cetBucket?: 'PCM' | 'PCB';
    status: string;
}

const StudentSchema = new Schema<IStudent>(
    {
        admissionNumber: { type: String, required: true },
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        phone: { type: String, required: true },
        whatsappNumber: { type: String },
        cetBucket: { type: String, enum: ['PCM', 'PCB'] },
        status: { type: String, required: true },
    },
    { collection: 'students' } // Explicitly point to the students collection
);

// We do not want to accidentally modify students from the portal auth service
export const Student = mongoose.model<IStudent>('Student', StudentSchema);

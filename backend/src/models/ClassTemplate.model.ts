import mongoose, { Document, Schema, Types } from 'mongoose';

// Read-only model pointing to FMS ClassTemplate collection
export interface IClassTemplate extends Document {
    _id: Types.ObjectId;
    grade: string;
    stream: string | null;
    board: string;
}

const ClassTemplateSchema = new Schema<IClassTemplate>(
    {
        grade: { type: String, required: true },
        stream: { type: String },
        board: { type: String, required: true },
    },
    { collection: 'classtemplates' } // Mongoose usually pluralizes ClassTemplate -> classtemplates
);

export const ClassTemplate = mongoose.model<IClassTemplate>('ClassTemplate', ClassTemplateSchema);

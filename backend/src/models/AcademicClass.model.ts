import mongoose, { Document, Schema, Types } from 'mongoose';
import { ClassTemplate } from './ClassTemplate.model';

void ClassTemplate; // Ensure Mongoose registers ClassTemplate schema before any populate call


// Read-only model pointing to FMS AcademicClass collection
export interface IAcademicClass extends Document {
    _id: Types.ObjectId;
    templateId: Types.ObjectId | any;
    academicYear: string;
    section: string;
    isActive: boolean;
}

const AcademicClassSchema = new Schema<IAcademicClass>(
    {
        templateId: { type: Schema.Types.ObjectId, ref: 'ClassTemplate' },
        academicYear: { type: String },
        section: { type: String },
        isActive: { type: Boolean },
    },
    { collection: 'academicclasses' } // Mongoose pluralization
);

export const AcademicClass = mongoose.model<IAcademicClass>('AcademicClass', AcademicClassSchema);

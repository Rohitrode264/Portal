import mongoose, { Document, Schema, Types } from 'mongoose';

// Read-only model pointing to FMS Enrollment collection
export interface IEnrollment extends Document {
    _id: Types.ObjectId;
    studentId: Types.ObjectId;
    academicClassId: Types.ObjectId;
    academicYear: string;
    status: string;
}

const EnrollmentSchema = new Schema<IEnrollment>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
        academicClassId: { type: Schema.Types.ObjectId, ref: 'AcademicClass', required: true },
        academicYear: { type: String, required: true },
        status: { type: String, required: true },
    },
    { collection: 'enrollments' }
);

export const Enrollment = mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema);

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IClassConfig extends Document {
    classId: Types.ObjectId;      // AcademicClass ID
    group: 'PCM' | 'PCB';         // Group designation
    examCoordinatorCpId?: string; // CP ID of the Teacher assigned as coordinator
    createdAt: Date;
    updatedAt: Date;
}

const ClassConfigSchema = new Schema<IClassConfig>(
    {
        classId: { type: Schema.Types.ObjectId, required: true },
        group: { type: String, enum: ['PCM', 'PCB'], required: true },
        examCoordinatorCpId: { type: String },
    },
    { timestamps: true, collection: 'portal_class_configs' }
);

// One config per class+group combo
ClassConfigSchema.index({ classId: 1, group: 1 }, { unique: true });

export const ClassConfig = mongoose.model<IClassConfig>('ClassConfig', ClassConfigSchema);

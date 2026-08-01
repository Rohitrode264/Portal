import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISectionConfig {
    sectionName: string;
    coordinatorCpId?: string;
}

export interface IClassConfig extends Document {
    classId: Types.ObjectId;      // AcademicClass ID
    group: 'PCM' | 'PCB';         // Group designation
    classStrength: number;
    sections: ISectionConfig[];
    createdAt: Date;
    updatedAt: Date;
}

const SectionConfigSchema = new Schema<ISectionConfig>({
    sectionName: { type: String, required: true },
    coordinatorCpId: { type: String }
}, { _id: false });

const ClassConfigSchema = new Schema<IClassConfig>(
    {
        classId: { type: Schema.Types.ObjectId, required: true },
        group: { type: String, enum: ['PCM', 'PCB'], required: true },
        classStrength: { type: Number, default: 40 },
        sections: [SectionConfigSchema]
    },
    { timestamps: true, collection: 'portal_class_configs' }
);

// One config per class+group combo
ClassConfigSchema.index({ classId: 1, group: 1 }, { unique: true });

export const ClassConfig = mongoose.model<IClassConfig>('ClassConfig', ClassConfigSchema);

import mongoose, { Document, Schema, Types } from 'mongoose';

export type ExamStatus = 'DRAFT' | 'LOCKED' | 'PUBLISHED' | 'LIVE' | 'COMPLETED' | 'ARCHIVED';
export type GroupType = 'PCM' | 'PCB';
export type SubjectType = 'PHYSICS' | 'CHEMISTRY' | 'MATHS' | 'BIOLOGY';
export type SectionStatus = 'PENDING' | 'IN_PROGRESS' | 'READY';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface IQuestion {
    _id?: Types.ObjectId;
    text: string;
    options: [string, string, string, string];
    correctAnswer: 'A' | 'B' | 'C' | 'D';
    marks: number;
    negativeMarks: number;
    difficulty: Difficulty;
    enteredBy: string; // CP ID of teacher/assistant who entered it
}

export interface IExamSection {
    subject: SubjectType;
    assignedTo?: string; // CP ID of teacher responsible
    status: SectionStatus;
    approvedAt?: Date;
    approvedBy?: string; // CP ID
    questions: IQuestion[];
}

export interface IExam extends Document {
    title: string;
    classId: Types.ObjectId;
    className: string;
    group: GroupType;
    status: ExamStatus;
    createdBy: string;
    scheduledAt?: Date;
    duration: number; // in minutes
    loginWindowMinutes: number; // minutes before exam students can join (default 15)
    defaultMarks: number; // default +marks per question
    defaultNegativeMarks: number; // default -marks per wrong answer
    coordinatorCpId?: string; // CP ID of exam coordinator assigned to this test
    isResultPublished?: boolean;
    sections: IExamSection[];
    createdAt: Date;
    updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
    text: { type: String, required: true },
    options: {
        type: [String],
        required: true,
        validate: [
            (arr: string[]) => arr.length === 4,
            'Exactly 4 options required'
        ]
    },
    correctAnswer: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    marks: { type: Number, required: true, default: 4 },
    negativeMarks: { type: Number, required: true, default: 1 },
    difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'], default: 'MEDIUM' },
    enteredBy: { type: String, required: true }
});

const ExamSectionSchema = new Schema<IExamSection>({
    subject: { type: String, enum: ['PHYSICS', 'CHEMISTRY', 'MATHS', 'BIOLOGY'], required: true },
    assignedTo: { type: String },
    status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'READY'], default: 'PENDING' },
    approvedAt: { type: Date },
    approvedBy: { type: String },
    questions: [QuestionSchema]
});

const ExamSchema = new Schema<IExam>(
    {
        title: { type: String, required: true, trim: true },
        classId: { type: Schema.Types.ObjectId, required: true, index: true },
        className: { type: String, required: true },
        group: { type: String, enum: ['PCM', 'PCB'], required: true },
        status: {
            type: String,
            enum: ['DRAFT', 'LOCKED', 'PUBLISHED', 'LIVE', 'COMPLETED', 'ARCHIVED'],
            default: 'DRAFT'
        },
        createdBy: { type: String, required: true },
        scheduledAt: { type: Date },
        duration: { type: Number, required: true, min: 10 },
        loginWindowMinutes: { type: Number, default: 15, min: 0 },
        defaultMarks: { type: Number, default: 4, min: 0 },
        defaultNegativeMarks: { type: Number, default: 1, min: 0 },
        coordinatorCpId: { type: String, sparse: true },
        isResultPublished: { type: Boolean, default: false },
        sections: [ExamSectionSchema]
    },
    { timestamps: true, collection: 'portal_exams' }
);

export const Exam = mongoose.model<IExam>('Exam', ExamSchema);

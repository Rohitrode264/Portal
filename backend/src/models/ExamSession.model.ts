import mongoose, { Document, Schema, Types } from 'mongoose';

export type SessionStatus = 'ABSENT' | 'PRESENT' | 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED';

export interface ITabSwitch {
    switchedAt: Date;
    returnedAt?: Date;
    reason?: string;
}

export interface IAnswer {
    questionId: Types.ObjectId;
    selectedOption: 'A' | 'B' | 'C' | 'D';
}

export interface IExamSession extends Document {
    examId: Types.ObjectId;
    studentCpId: string; // The user ID of the student
    lockedSessionId?: string; // The session UUID snapshotted at start time
    status: SessionStatus;
    markedPresentAt?: Date;
    startedAt?: Date;
    submittedAt?: Date;
    answers: IAnswer[];
    tabSwitchCount: number; // Max 2 allowed (0, 1, 2)
    tabSwitchLog: ITabSwitch[];
    heartbeatLastSeen?: Date;
}

const TabSwitchSchema = new Schema<ITabSwitch>({
    switchedAt: { type: Date, required: true },
    returnedAt: { type: Date },
    reason: { type: String, default: 'Tab Switch / Lost Focus' }
}, { _id: false });

const AnswerSchema = new Schema<IAnswer>({
    questionId: { type: Schema.Types.ObjectId, required: true },
    selectedOption: { type: String, enum: ['A', 'B', 'C', 'D'], required: true }
}, { _id: false });

const ExamSessionSchema = new Schema<IExamSession>(
    {
        examId: { type: Schema.Types.ObjectId, required: true, index: true },
        studentCpId: { type: String, required: true, index: true },
        lockedSessionId: { type: String },
        status: { 
            type: String, 
            enum: ['ABSENT', 'PRESENT', 'IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED'],
            default: 'ABSENT'
        },
        markedPresentAt: { type: Date },
        startedAt: { type: Date },
        submittedAt: { type: Date },
        answers: [AnswerSchema],
        tabSwitchCount: { type: Number, default: 0 },
        tabSwitchLog: [TabSwitchSchema],
        heartbeatLastSeen: { type: Date }
    },
    { timestamps: true, collection: 'portal_exam_sessions' }
);

// One session per student per exam
ExamSessionSchema.index({ examId: 1, studentCpId: 1 }, { unique: true });

export const ExamSession = mongoose.model<IExamSession>('ExamSession', ExamSessionSchema);

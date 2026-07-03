import mongoose, { Document, Schema } from 'mongoose';

export interface ICounter extends Document<string> {
    _id: string; // The sequence name, e.g., 'portal_admin', 'portal_teacher'
    seq: number;
}

const CounterSchema = new Schema<ICounter>({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

export const Counter = mongoose.model<ICounter>('PortalCounter', CounterSchema, 'portal_counters');

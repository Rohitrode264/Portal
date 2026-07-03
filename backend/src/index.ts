import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/auth.routes';
import setupRoutes from './routes/setup.routes';
import teacherRoutes from './routes/teacher.routes';
import assistantRoutes from './routes/assistant.routes';
import classRoutes from './routes/class.routes';
import examRoutes from './routes/exam.routes';
import studentRoutes from './routes/student.routes';
import liveExamRoutes from './routes/liveExam.routes';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/assistants', assistantRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/live-exams', liveExamRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'Portal API' });
});

const PORT = process.env.PORT || 4000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Portal Backend Server running on port ${PORT}`);
    });
});

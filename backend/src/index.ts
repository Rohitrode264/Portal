import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
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
import uploadRoutes from './routes/upload.routes';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // Log all incoming requests

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/assistants', assistantRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/live-exams', liveExamRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'Portal API' });
});

import { autoEndExams } from './controllers/liveExam.controller';

const PORT = process.env.PORT || 4000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Portal Backend Server running on port ${PORT}`);
        
        // Check for exams that have reached their time limit and end them automatically every 30 seconds
        setInterval(() => {
            autoEndExams();
        }, 30000);
    });
});

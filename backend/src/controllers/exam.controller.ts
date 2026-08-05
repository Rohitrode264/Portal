import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ExamService } from '../services/exam.service';
import { Exam, SubjectType, SectionStatus } from '../models/Exam.model';
import { ClassConfig } from '../models/ClassConfig.model';
import { AcademicClass } from '../models/AcademicClass.model';
import { User } from '../models/User.model';
import { ExamSession } from '../models/ExamSession.model';
import { Student } from '../models/Student.model';
import { Enrollment } from '../models/Enrollment.model';
import { deleteFromS3 } from './upload.controller';

export class ExamController {
    
    // 1. Create Exam Shell
    async createExam(req: Request, res: Response): Promise<void> {
        try {
            const { title, classId, group, duration, scheduledAt, loginWindowMinutes, defaultMarks, defaultNegativeMarks, coordinatorCpId } = req.body;
            const userCpId = (req as any).user.userId;

            if (!title || !classId || !group || !duration) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }

            // Check if duplicate exam exists within 24 hours for the same class/group
            if (scheduledAt) {
                const scheduleDate = new Date(scheduledAt);
                const startOfDay = new Date(scheduleDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(scheduleDate);
                endOfDay.setHours(23, 59, 59, 999);

                const existingExam = await Exam.findOne({
                    classId,
                    group,
                    scheduledAt: { $gte: startOfDay, $lte: endOfDay },
                    status: { $ne: 'ARCHIVED' }
                });

                if (existingExam) {
                    res.status(409).json({ 
                        error: `An exam for this class and group already exists on this date.`,
                        existingExamId: existingExam._id
                    });
                    return;
                }
            }

            const academicClass = await AcademicClass.findById(classId).populate('templateId');
            if (!academicClass) {
                res.status(404).json({ error: 'Class not found' });
                return;
            }
            const template = academicClass.templateId as any;
            const className = `${template.grade}th ${template.stream} - ${academicClass.section}`;

            // Initialize sections based on group
            const subjects: SubjectType[] = group === 'PCM' 
                ? ['PHYSICS', 'CHEMISTRY', 'MATHS']
                : ['PHYSICS', 'CHEMISTRY', 'BIOLOGY'];

            const sections = subjects.map(subject => ({
                subject,
                status: 'PENDING' as SectionStatus,
                questions: []
            }));

            const exam = await Exam.create({
                title,
                classId,
                className,
                group,
                duration,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
                loginWindowMinutes: loginWindowMinutes ?? 15,
                defaultMarks: defaultMarks ?? 4,
                defaultNegativeMarks: defaultNegativeMarks ?? 1,
                coordinatorCpId: coordinatorCpId || undefined,
                createdBy: userCpId,
                sections
            });

            res.status(201).json({ message: 'Exam created successfully', exam });
        } catch (error: any) {
            console.error('Create Exam Error:', error);
            res.status(500).json({ error: 'Failed to create exam' });
        }
    }

    // 1b. Update Exam Metadata (DRAFT only)
    async updateExam(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { title, duration, scheduledAt, loginWindowMinutes, defaultMarks, defaultNegativeMarks, coordinatorCpId } = req.body;

            const exam = await Exam.findById(id);
            if (!exam) {
                res.status(404).json({ error: 'Exam not found' });
                return;
            }
            if (exam.status !== 'DRAFT' && exam.status !== 'LOCKED') {
                res.status(400).json({ error: 'Only DRAFT or LOCKED exams can be edited' });
                return;
            }

            if (title !== undefined) exam.title = title;
            if (duration !== undefined) exam.duration = duration;
            if (scheduledAt !== undefined) exam.scheduledAt = scheduledAt ? new Date(scheduledAt) : undefined;
            if (loginWindowMinutes !== undefined) exam.loginWindowMinutes = loginWindowMinutes;
            if (defaultMarks !== undefined) exam.defaultMarks = defaultMarks;
            if (defaultNegativeMarks !== undefined) exam.defaultNegativeMarks = defaultNegativeMarks;
            if (coordinatorCpId !== undefined) exam.coordinatorCpId = coordinatorCpId || undefined;

            await exam.save();
            res.json({ message: 'Exam updated', exam });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to update exam' });
        }
    }

    // 2. Get Exams (with filters)
    async getExams(req: Request, res: Response): Promise<void> {
        try {
            const { classId, group, status } = req.query;
            const query: any = { status: { $ne: 'ARCHIVED' } };

            if (classId) query.classId = classId;
            if (group) query.group = group;
            if (status) query.status = status;

            const exams = await Exam.find(query).sort({ createdAt: -1 });
            const resolvedExams = await Promise.all(exams.map(async (exam) => {
                const examObj = exam.toObject() as any;
                const creator = await User.findOne({ cpId: exam.createdBy }).select('name');
                examObj.createdByFields = creator ? { name: creator.name, cpId: exam.createdBy } : { name: exam.createdBy, cpId: exam.createdBy };
                return examObj;
            }));

            res.json({ exams: resolvedExams });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to fetch exams' });
        }
    }

    // 3. Get Single Exam
    async getExam(req: Request, res: Response): Promise<void> {
        try {
            const exam = await Exam.findById(req.params.id);
            if (!exam) {
                res.status(404).json({ error: 'Exam not found' });
                return;
            }
            const creator = await User.findOne({ cpId: exam.createdBy }).select('name');
            const examObj = exam.toObject() as any;
            examObj.createdByFields = creator ? { name: creator.name, cpId: exam.createdBy } : { name: exam.createdBy, cpId: exam.createdBy };
            
            const userRole = (req as any).user.role;
            const userCpId = (req as any).user.userId;
            
            let canMonitor = false;
            if (userRole === 'ADMIN') {
                canMonitor = true;
            } else if (userRole === 'TEACHER') {
                const config = await ClassConfig.findOne({ classId: exam.classId, group: exam.group });
                if (config) {
                    canMonitor = config.sections.some(s => s.coordinatorCpId === userCpId);
                }
            }
            examObj.canMonitor = canMonitor;

            res.json({ exam: examObj });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to fetch exam' });
        }
    }

    // 3b. Update Section Metadata
    async updateSectionMetadata(req: Request, res: Response): Promise<void> {
        try {
            const { id, subject } = req.params;
            const { defaultMarks, defaultNegativeMarks } = req.body;

            const exam = await Exam.findById(id);
            if (!exam) {
                res.status(404).json({ error: 'Exam not found' });
                return;
            }

            if (exam.status !== 'DRAFT' && exam.status !== 'LOCKED') {
                res.status(400).json({ error: 'Cannot update section metadata if exam is not DRAFT or LOCKED' });
                return;
            }

            const section = exam.sections.find(s => s.subject === subject);
            if (!section) {
                res.status(404).json({ error: 'Section not found' });
                return;
            }

            if (defaultMarks !== undefined) {
                section.defaultMarks = defaultMarks;
                section.questions.forEach(q => q.marks = defaultMarks);
            }
            if (defaultNegativeMarks !== undefined) {
                section.defaultNegativeMarks = defaultNegativeMarks;
                section.questions.forEach(q => q.negativeMarks = defaultNegativeMarks);
            }

            await exam.save();
            res.json({ message: 'Section metadata updated', section });
        } catch (error: any) {
            console.error('Update Section Error:', error);
            res.status(500).json({ error: 'Failed to update section' });
        }
    }

    // 4. Add Question to Section
    async addQuestion(req: Request, res: Response): Promise<void> {
        try {
            const { id, subject } = req.params;
            const questionData = req.body;
            const userCpId = (req as any).user.userId;
            const userRole = (req as any).user.role;

            const exam = await Exam.findById(id);
            if (!exam) {
                res.status(404).json({ error: 'Exam not found' });
                return;
            }

            if (exam.status !== 'DRAFT') {
                res.status(400).json({ error: 'Cannot add questions to an exam that is not in DRAFT state' });
                return;
            }

            const sectionIndex = exam.sections.findIndex(s => s.subject === subject);
            if (sectionIndex === -1) {
                res.status(400).json({ error: `Section ${subject} not found in this exam` });
                return;
            }

            // Role checks
            if (userRole === 'TEACHER') {
                // Verify this teacher is assigned to this subject
                const teacher = await User.findOne({ cpId: userCpId });
                if (teacher?.subject !== subject) {
                    res.status(403).json({ error: `You can only add questions to ${teacher?.subject} section` });
                    return;
                }
            }

            if (exam.sections[sectionIndex].status === 'READY') {
                res.status(400).json({ error: 'Cannot add questions, section is already approved' });
                return;
            }

            exam.sections[sectionIndex].questions.push({
                ...questionData,
                enteredBy: userCpId
            });
            exam.sections[sectionIndex].status = 'IN_PROGRESS';

            await exam.save();
            res.json({ message: 'Question added successfully', section: exam.sections[sectionIndex] });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to add question' });
        }
    }

    // 5. Remove Question
    async removeQuestion(req: Request, res: Response): Promise<void> {
        try {
            const { id, subject, qId } = req.params;
            const userCpId = (req as any).user.userId;
            const userRole = (req as any).user.role;
            
            const exam = await Exam.findById(id);
            if (!exam || exam.status !== 'DRAFT') {
                res.status(400).json({ error: 'Exam not editable' });
                return;
            }

            const section = exam.sections.find(s => s.subject === subject);
            if (!section || section.status === 'READY') {
                res.status(400).json({ error: 'Section not editable' });
                return;
            }

            // Role checks
            if (userRole === 'TEACHER') {
                const teacher = await User.findOne({ cpId: userCpId });
                if (teacher?.subject !== subject) {
                    res.status(403).json({ error: `You can only modify questions in the ${teacher?.subject} section` });
                    return;
                }
            }

            // Find question to potentially delete its images
            const questionToRemove = section.questions.find(q => q._id?.toString() === qId);

            section.questions = section.questions.filter(q => q._id?.toString() !== qId);
            if (section.questions.length === 0) {
                section.status = 'PENDING';
            }

            await exam.save();

            // Delete images from S3 asynchronously after DB save
            if (questionToRemove) {
                if (questionToRemove.diagramUrl) deleteFromS3(questionToRemove.diagramUrl);
                if (questionToRemove.diagramUrls && questionToRemove.diagramUrls.length > 0) {
                    questionToRemove.diagramUrls.forEach(url => deleteFromS3(url));
                }
            }

            res.json({ message: 'Question removed', section });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to remove question' });
        }
    }

    // 5b. Update Question
    async updateQuestion(req: Request, res: Response): Promise<void> {
        try {
            const { id, subject, qId } = req.params;
            const { text, options, correctAnswer, marks, negativeMarks } = req.body;
            const userCpId = (req as any).user.userId;
            const userRole = (req as any).user.role;

            const exam = await Exam.findById(id);
            if (!exam || exam.status !== 'DRAFT') {
                res.status(400).json({ error: 'Exam not editable' });
                return;
            }

            const section = exam.sections.find(s => s.subject === subject);
            if (!section || section.status === 'READY') {
                res.status(400).json({ error: 'Section is already approved and cannot be edited' });
                return;
            }

            // Role checks
            if (userRole === 'TEACHER') {
                const teacher = await User.findOne({ cpId: userCpId });
                if (teacher?.subject !== subject) {
                    res.status(403).json({ error: `You can only modify questions in the ${teacher?.subject} section` });
                    return;
                }
            }

            const question = section.questions.find((q: any) => q._id?.toString() === qId);
            if (!question) {
                res.status(404).json({ error: 'Question not found' });
                return;
            }

            if (text !== undefined) question.text = text;
            if (options !== undefined) question.options = options;
            if (correctAnswer !== undefined) question.correctAnswer = correctAnswer;
            if (marks !== undefined) question.marks = marks;
            if (negativeMarks !== undefined) question.negativeMarks = negativeMarks;
            
            const oldDiagramUrl = question.diagramUrl;
            const oldDiagramUrls = question.diagramUrls || [];

            if (req.body.diagramUrl !== undefined) {
                question.diagramUrl = req.body.diagramUrl;
            }
            if (req.body.diagramUrls !== undefined) {
                question.diagramUrls = req.body.diagramUrls;
            }

            await exam.save();

            // Cleanup removed images from S3 asynchronously
            if (req.body.diagramUrl !== undefined && oldDiagramUrl && req.body.diagramUrl !== oldDiagramUrl) {
                deleteFromS3(oldDiagramUrl);
            }
            if (req.body.diagramUrls !== undefined) {
                const newUrls = req.body.diagramUrls;
                oldDiagramUrls.forEach(url => {
                    if (!newUrls.includes(url)) {
                        deleteFromS3(url);
                    }
                });
            }

            res.json({ message: 'Question updated', section });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to update question' });
        }
    }

    // 6. Approve Section
    async approveSection(req: Request, res: Response): Promise<void> {
        try {
            const { id, subject } = req.params;
            const userCpId = (req as any).user.userId;

            const exam = await Exam.findById(id);
            if (!exam || exam.status !== 'DRAFT') {
                res.status(400).json({ error: 'Exam not found or not in DRAFT' });
                return;
            }

            const section = exam.sections.find(s => s.subject === subject);
            if (!section) {
                res.status(404).json({ error: 'Section not found' });
                return;
            }

            if (section.questions.length === 0) {
                res.status(400).json({ error: 'Cannot approve an empty section' });
                return;
            }

            section.status = 'READY';
            section.approvedAt = new Date();
            section.approvedBy = userCpId;

            await exam.save();
            res.json({ message: `${subject} section approved`, section });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to approve section' });
        }
    }

    // 7. Lock Exam
    async lockExam(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const exam = await Exam.findById(id);

            if (!exam || exam.status !== 'DRAFT') {
                res.status(400).json({ error: 'Exam not found or not DRAFT' });
                return;
            }

            const allReady = exam.sections.every(s => s.status === 'READY');
            if (!allReady) {
                res.status(400).json({ error: 'Cannot lock exam until ALL sections are APPROVED' });
                return;
            }

            exam.status = 'LOCKED';
            await exam.save();

            res.json({ message: 'Exam locked successfully', exam });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to lock exam' });
        }
    }

    // 7.5 Publish Exam
    async publishExam(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { scheduledAt } = req.body;

            const exam = await Exam.findById(id);

            if (!exam) {
                res.status(404).json({ error: 'Exam not found' });
                return;
            }

            if (exam.status !== 'LOCKED') {
                res.status(400).json({ error: 'Only LOCKED exams can be published' });
                return;
            }

            if (!scheduledAt && !exam.scheduledAt) {
                res.status(400).json({ error: 'A scheduled date/time is required to publish' });
                return;
            }

            exam.status = 'PUBLISHED';
            if (scheduledAt) {
                exam.scheduledAt = new Date(scheduledAt);
            }

            await exam.save();
            res.json({ message: 'Exam published successfully', exam });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to publish exam' });
        }
    }

    // 8. Delete / Archive Guard
    async deleteExam(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const exam = await Exam.findById(id);

            if (!exam) {
                res.status(404).json({ error: 'Exam not found' });
                return;
            }

            // Check if any section has questions
            const hasContent = exam.sections.some(s => s.questions.length > 0);

            if (hasContent) {
                res.status(400).json({ 
                    error: 'Cannot delete: sections have content. Please ARCHIVE this exam instead.',
                    canArchive: true
                });
                return;
            }

            if (exam.status !== 'DRAFT') {
                res.status(400).json({ error: 'Cannot delete exam that is not in DRAFT state' });
                return;
            }

            await Exam.findByIdAndDelete(id);
            res.json({ message: 'Exam deleted successfully' });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to delete exam' });
        }
    }

    async archiveExam(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const exam = await Exam.findByIdAndUpdate(
                id, 
                { status: 'ARCHIVED' },
                { new: true }
            );

            if (!exam) {
                res.status(404).json({ error: 'Exam not found' });
                return;
            }
            res.json({ message: 'Exam archived successfully', exam });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to archive exam' });
        }
    }

    // 6. Get Exam Results & Percentiles (Coordinators / Teachers / Admins)
    async getExamResults(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            const result = await ExamService.calculateExamResult(id);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'Exam not found') {
                res.status(404).json({ error: 'Exam not found' });
            } else {
                res.status(500).json({ error: 'Failed to evaluate results' });
            }
        }
    }

    // 7. Publish / Toggle Result
    async publishResult(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { publish } = req.body; // true or false
            const isPub = publish !== undefined ? Boolean(publish) : true;

            const exam = await Exam.findByIdAndUpdate(
                id,
                { isResultPublished: isPub },
                { new: true }
            );

            if (!exam) {
                res.status(404).json({ error: 'Exam not found' });
                return;
            }

            res.json({ message: isPub ? 'Results published to students!' : 'Results unpublished.', isResultPublished: exam.isResultPublished });
        } catch (error: any) {
            console.error('Publish Result Error:', error);
            res.status(500).json({ error: 'Failed to publish result' });
        }
    }
}

export const examController = new ExamController();

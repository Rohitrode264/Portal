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
import { Session } from '../models/Session.model';
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

            // Check if overlapping exam exists for the same class/group
            if (scheduledAt) {
                const scheduleDate = new Date(scheduledAt);
                const startOfDay = new Date(scheduleDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(scheduleDate);
                endOfDay.setHours(23, 59, 59, 999);

                const existingExams = await Exam.find({
                    classId,
                    group,
                    scheduledAt: { $gte: startOfDay, $lte: endOfDay },
                    status: { $nin: ['ARCHIVED', 'COMPLETED'] }
                });

                const newStart = scheduleDate.getTime();
                const newEnd = newStart + duration * 60 * 1000;

                const overlappingExam = existingExams.find(exam => {
                    if (!exam.scheduledAt) return false;
                    const existingStart = exam.scheduledAt.getTime();
                    const existingEnd = existingStart + exam.duration * 60 * 1000;
                    return newStart < existingEnd && newEnd > existingStart;
                });

                if (overlappingExam) {
                    res.status(409).json({ 
                        error: `An exam for this class and group is already scheduled during this time.`,
                        existingExamId: overlappingExam._id
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

            const newScheduledAt = scheduledAt !== undefined ? (scheduledAt ? new Date(scheduledAt) : undefined) : exam.scheduledAt;
            const newDuration = duration !== undefined ? duration : exam.duration;

            if (newScheduledAt) {
                const scheduleDate = new Date(newScheduledAt);
                const startOfDay = new Date(scheduleDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(scheduleDate);
                endOfDay.setHours(23, 59, 59, 999);

                const existingExams = await Exam.find({
                    _id: { $ne: exam._id },
                    classId: exam.classId,
                    group: exam.group,
                    scheduledAt: { $gte: startOfDay, $lte: endOfDay },
                    status: { $nin: ['ARCHIVED', 'COMPLETED'] }
                });

                const newStart = scheduleDate.getTime();
                const newEnd = newStart + newDuration * 60 * 1000;

                const overlappingExam = existingExams.find(e => {
                    if (!e.scheduledAt) return false;
                    const existingStart = e.scheduledAt.getTime();
                    const existingEnd = existingStart + e.duration * 60 * 1000;
                    return newStart < existingEnd && newEnd > existingStart;
                });

                if (overlappingExam) {
                    res.status(409).json({ 
                        error: `An exam for this class and group is already scheduled during this time.`,
                        existingExamId: overlappingExam._id
                    });
                    return;
                }
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
            } else if (userRole === 'TEACHER' || userRole === 'ASSISTANT') {
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

    // 6b. Unlock Section (Admin Override)
    async unlockSection(req: Request, res: Response): Promise<void> {
        try {
            const { id, subject } = req.params;
            const userRole = (req as any).user.role;

            if (userRole !== 'ADMIN') {
                res.status(403).json({ error: 'Only ADMINs can unlock a section' });
                return;
            }

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

            section.status = 'IN_PROGRESS';
            section.approvedAt = undefined;
            section.approvedBy = undefined;

            await exam.save();
            res.json({ message: `${subject} section unlocked`, section });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to unlock section' });
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

    // 7b. Unlock Exam (Admin Override)
    async unlockExam(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userRole = (req as any).user.role;

            if (userRole !== 'ADMIN') {
                res.status(403).json({ error: 'Only ADMINs can unlock an exam' });
                return;
            }

            const exam = await Exam.findById(id);

            if (!exam) {
                res.status(404).json({ error: 'Exam not found' });
                return;
            }

            if (exam.status !== 'LOCKED' && exam.status !== 'PUBLISHED') {
                res.status(400).json({ error: 'Can only unlock exams that are LOCKED or PUBLISHED' });
                return;
            }

            exam.status = 'DRAFT';
            await exam.save();
            res.json({ message: 'Exam unlocked and reverted to DRAFT', exam });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to unlock exam' });
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
            const userRole = (req as any).user.role;
            const exam = await Exam.findById(id);

            if (!exam) {
                res.status(404).json({ error: 'Exam not found' });
                return;
            }

            // ADMIN Override: Hard Cascade Delete
            if (userRole === 'ADMIN') {
                // Wipe all student attempts
                await ExamSession.deleteMany({ examId: id });
                // Release active student locks bound to this exam
                await Session.updateMany({ lockedExamId: id }, { isExamLocked: false, lockedExamId: null });
                // Delete exam
                await Exam.findByIdAndDelete(id);
                res.json({ message: 'Exam and all associated records permanently deleted' });
                return;
            }

            // Regular Guard (Teachers / Coordinators)
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

    // 8. Get Importable Exams (exams that have questions in the given subject)
    async getImportableExams(req: Request, res: Response): Promise<void> {
        try {
            const { id, subject } = req.params;
            const subjectFilter = subject as string;

            // Find all exams that have at least 1 question in the requested subject, excluding the current exam
            const exams = await Exam.find({
                _id: { $ne: id },
                status: { $ne: 'ARCHIVED' as any },
                'sections.subject': subjectFilter as any,
            }).sort({ createdAt: -1 });

            // Filter to only exams that actually have questions in that subject section
            const importableExams = exams
                .map(exam => {
                    const section = exam.sections.find(s => s.subject === subject);
                    if (!section || section.questions.length === 0) return null;

                    return {
                        _id: exam._id,
                        title: exam.title,
                        className: exam.className,
                        group: exam.group,
                        status: exam.status,
                        scheduledAt: exam.scheduledAt,
                        createdAt: exam.createdAt,
                        questionCount: section.questions.length,
                        questions: section.questions.map(q => ({
                            _id: q._id,
                            text: q.text,
                            marks: q.marks,
                            negativeMarks: q.negativeMarks,
                            difficulty: q.difficulty,
                            correctAnswer: q.correctAnswer,
                            options: q.options,
                            diagramUrl: q.diagramUrl,
                            diagramUrls: q.diagramUrls,
                        })),
                    };
                })
                .filter(Boolean);

            res.json({ exams: importableExams });
        } catch (error: any) {
            console.error('Get Importable Exams Error:', error);
            res.status(500).json({ error: 'Failed to fetch importable exams' });
        }
    }

    // 9. Import Questions from Another Exam
    async importQuestions(req: Request, res: Response): Promise<void> {
        try {
            const { id, subject } = req.params;
            const { sourceExamId, questionIds } = req.body; // questionIds is optional — if omitted, import all
            const userCpId = (req as any).user.userId;
            const userRole = (req as any).user.role;

            if (!sourceExamId) {
                res.status(400).json({ error: 'sourceExamId is required' });
                return;
            }

            // Validate target exam
            const targetExam = await Exam.findById(id);
            if (!targetExam) {
                res.status(404).json({ error: 'Target exam not found' });
                return;
            }
            if (targetExam.status !== 'DRAFT') {
                res.status(400).json({ error: 'Can only import questions into a DRAFT exam' });
                return;
            }

            const targetSection = targetExam.sections.find(s => s.subject === subject);
            if (!targetSection) {
                res.status(400).json({ error: `Section ${subject} not found in target exam` });
                return;
            }
            if (targetSection.status === 'READY') {
                res.status(400).json({ error: 'Cannot import into an approved section' });
                return;
            }

            // Role checks for teachers
            if (userRole === 'TEACHER') {
                const teacher = await User.findOne({ cpId: userCpId });
                if (teacher?.subject !== subject) {
                    res.status(403).json({ error: `You can only import questions into the ${teacher?.subject} section` });
                    return;
                }
            }

            // Fetch source exam
            const sourceExam = await Exam.findById(sourceExamId);
            if (!sourceExam) {
                res.status(404).json({ error: 'Source exam not found' });
                return;
            }

            const sourceSection = sourceExam.sections.find(s => s.subject === subject);
            if (!sourceSection || sourceSection.questions.length === 0) {
                res.status(400).json({ error: `No questions found in ${subject} section of the source exam` });
                return;
            }

            // Determine which questions to import
            let questionsToImport = sourceSection.questions;
            if (questionIds && Array.isArray(questionIds) && questionIds.length > 0) {
                questionsToImport = sourceSection.questions.filter(
                    q => q._id && questionIds.includes(q._id.toString())
                );
                if (questionsToImport.length === 0) {
                    res.status(400).json({ error: 'None of the specified questions were found in the source exam' });
                    return;
                }
            }

            // Copy questions into target section
            const importedQuestions = questionsToImport.map(q => ({
                text: q.text,
                options: [...q.options],
                correctAnswer: q.correctAnswer,
                marks: q.marks,
                negativeMarks: q.negativeMarks,
                difficulty: q.difficulty,
                diagramUrl: q.diagramUrl,
                diagramUrls: q.diagramUrls ? [...q.diagramUrls] : [],
                enteredBy: userCpId,
            }));

            targetSection.questions.push(...importedQuestions as any[]);
            if (targetSection.status === 'PENDING') {
                targetSection.status = 'IN_PROGRESS';
            }

            await targetExam.save();

            res.json({
                message: `${importedQuestions.length} question(s) imported successfully`,
                importedCount: importedQuestions.length,
                section: targetSection,
            });
        } catch (error: any) {
            console.error('Import Questions Error:', error);
            res.status(500).json({ error: 'Failed to import questions' });
        }
    }
}

export const examController = new ExamController();

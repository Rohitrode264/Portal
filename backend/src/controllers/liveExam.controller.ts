import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Exam } from '../models/Exam.model';
import { ExamSession } from '../models/ExamSession.model';
import { Student } from '../models/Student.model';
import { Enrollment } from '../models/Enrollment.model';
import { Session } from '../models/Session.model';

export class LiveExamController {

    // --- TEACHER ACTIONS ---

    // Teacher marks student as PRESENT (allows them to start exam)
    async markAttendance(req: Request, res: Response): Promise<void> {
        try {
            const { examId, studentCpId } = req.body;
            const examObj = await Exam.findById(examId);
            const isLive = examObj && examObj.status === 'LIVE';

            const updateFields: any = { 
                status: isLive ? 'IN_PROGRESS' : 'PRESENT',
                markedPresentAt: new Date()
            };
            if (isLive) {
                updateFields.startedAt = new Date();
            }

            await ExamSession.findOneAndUpdate(
                { examId, studentCpId },
                updateFields,
                { upsert: true, new: true }
            );

            if (isLive) {
                await Session.updateMany(
                    { userId: studentCpId },
                    { isExamLocked: true, lockedExamId: examId as string }
                );
            }

            res.json({ message: isLive ? 'Late student admitted and exam started immediately!' : 'Student marked present' });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to mark attendance' });
        }
    }

    // Coordinator submits attendance list and releases exam for all physically present students
    async releaseAllPresent(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params; // examId
            const now = new Date();
            const examObj = await Exam.findById(id);
            const liveStart = examObj?.scheduledAt ? new Date(examObj.scheduledAt) : now;

            const result = await ExamSession.updateMany(
                { examId: id, status: 'PRESENT' },
                { 
                    status: 'IN_PROGRESS',
                    startedAt: now
                }
            );
            // Also lock all these students in portal_sessions so they cannot get new OTPs!
            const presentSessions = await ExamSession.find({ examId: id, status: 'IN_PROGRESS' });
            const studentCpIds = presentSessions.map(s => s.studentCpId);
            if (studentCpIds.length > 0) {
                await Session.updateMany(
                    { userId: { $in: studentCpIds } },
                    { isExamLocked: true, lockedExamId: id as string }
                );
            }
            // Transition Exam status to LIVE once paper is launched by coordinator
            await Exam.findByIdAndUpdate(id, { status: 'LIVE', scheduledAt: liveStart });
            res.json({ message: 'Attendance submitted. Exam launched for all present students.', releasedCount: result.modifiedCount });
        } catch (error: any) {
            console.error('releaseAllPresent error:', error);
            res.status(500).json({ error: 'Failed to release exam for present students' });
        }
    }

    // Teacher gets live status of all students in exam (complete CET class roster)
    async getLiveStatus(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params; // examId
            const exam = await Exam.findById(id);
            if (!exam) {
                res.status(404).json({ error: 'Exam not found' });
                return;
            }

            // 1. Fetch ongoing enrollments in this class
            const enrollments = await Enrollment.find({
                academicClassId: exam.classId,
                status: 'ONGOING'
            });

            const studentIds = enrollments.map(e => e.studentId);

            // 2. Fetch eligible CET students
            const students = await Student.find({
                _id: { $in: studentIds },
                status: 'ACTIVE',
                cetBucket: exam.group,
                whatsappNumber: { $exists: true, $nin: [null, ''] }
            });

            // 3. Fetch existing exam sessions
            const sessions = await ExamSession.find({ examId: id });

            // 4. Map students to roster list
            const roster = students.map(student => {
                const session = sessions.find(s => s.studentCpId === student.admissionNumber);
                return {
                    studentCpId: student.admissionNumber,
                    name: `${student.firstName} ${student.lastName}`,
                    whatsappNumber: student.whatsappNumber || '',
                    status: session ? session.status : 'ABSENT',
                    markedPresentAt: session?.markedPresentAt || null,
                    startedAt: session?.startedAt || null,
                    submittedAt: session?.submittedAt || null,
                    tabSwitchCount: session?.tabSwitchCount || 0,
                    heartbeatLastSeen: session?.heartbeatLastSeen || null,
                };
            });

            res.json({ roster });
        } catch (error: any) {
            console.error('getLiveStatus error:', error);
            res.status(500).json({ error: 'Failed to fetch live status' });
        }
    }


    // --- STUDENT ACTIONS ---

    // 1. Student requests to start exam
    async startExam(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params; // examId
            const userCpId = (req as any).user.userId;
            const currentSessionId = (req as any).user.sessionId;

            const exam = await Exam.findById(id);
            if (!exam || (exam.status !== 'LIVE' && exam.status !== 'PUBLISHED')) {
                res.status(400).json({ error: 'Exam is not currently published or live' });
                return;
            }

            let session = await ExamSession.findOne({ examId: new Types.ObjectId(id as string), studentCpId: userCpId });
            
            // If student is not present yet, set/update their heartbeat to place them in approval queue
            if (!session || session.status === 'ABSENT') {
                if (!session) {
                    session = await ExamSession.create({
                        examId: new Types.ObjectId(id as string),
                        studentCpId: userCpId,
                        status: 'ABSENT',
                        heartbeatLastSeen: new Date()
                    });
                } else {
                    session.heartbeatLastSeen = new Date();
                    await session.save();
                }
                res.status(202).json({ 
                    waitingApproval: true, 
                    message: 'Exam coordinator is yet to take you in. Please wait.' 
                });
                return;
            }

            if (session.status === 'SUBMITTED' || session.status === 'AUTO_SUBMITTED') {
                res.status(400).json({ error: 'You have already submitted this exam.' });
                return;
            }

            if (session.status === 'PRESENT') {
                // Student is verified present by coordinator. Waiting for coordinator to release test paper!
                session.heartbeatLastSeen = new Date();
                await session.save();
                res.status(202).json({ 
                    waitingApproval: true, 
                    message: 'Verified present! Waiting for coordinator to launch the exam paper.' 
                });
                return;
            } else if (session.status === 'IN_PROGRESS') {
                // If lockedSessionId is not bound yet (e.g., released by coordinator via release-all button), bind it now!
                if (!session.lockedSessionId) {
                    session.lockedSessionId = currentSessionId;
                    session.startedAt = session.startedAt || new Date();
                    session.heartbeatLastSeen = new Date();
                    await session.save();
                } else if (session.lockedSessionId !== currentSessionId) {
                    // Re-joining from a different device/session! Validate session lock!
                    res.status(403).json({ 
                        error: 'SECURITY LOCKOUT: Exam started on another device/session. You cannot resume here.' 
                    });
                    return;
                }
                await Session.updateOne({ userId: userCpId }, { isExamLocked: true, lockedExamId: id as string });
            }

            // Calculate synchronized remaining time for late arrivals or ongoing test
            let remainingSeconds = exam.duration * 60;
            if (exam.status === 'LIVE') {
                const startRef = exam.scheduledAt ? new Date(exam.scheduledAt).getTime() : new Date(exam.updatedAt).getTime();
                const elapsedSeconds = Math.floor((Date.now() - startRef) / 1000);
                if (elapsedSeconds > 0) {
                    remainingSeconds = Math.max(0, (exam.duration * 60) - elapsedSeconds);
                }
            }

            // Strip correct answers before sending
            const sanitizedExam: any = exam.toObject();
            sanitizedExam.remainingSeconds = remainingSeconds;
            sanitizedExam.sections.forEach((sec: any) => {
                sec.questions.forEach((q: any) => {
                    delete q.correctAnswer;
                });
            });

            res.json({ 
                exam: sanitizedExam,
                session: {
                    answers: session.answers,
                    tabSwitchCount: session.tabSwitchCount
                }
            });

        } catch (error: any) {
            console.error('startExam error:', error);
            res.status(500).json({ error: 'Failed to start exam' });
        }
    }

    // 2. Heartbeat (every 10s)
    async heartbeat(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userCpId = (req as any).user.userId;
            const currentSessionId = (req as any).user.sessionId;

            const session = await ExamSession.findOne({ examId: new Types.ObjectId(id as string), studentCpId: userCpId });
            
            if (!session || (session.status !== 'IN_PROGRESS' && session.status !== 'ABSENT')) {
                res.status(400).json({ error: 'No active exam session' });
                return;
            }

            if (session.status === 'IN_PROGRESS' && session.lockedSessionId !== currentSessionId) {
                res.status(403).json({ error: 'Session locked to another device' });
                return;
            }

            session.heartbeatLastSeen = new Date();
            await session.save();

            res.json({ ok: true });
        } catch (error) {
            res.status(500).json({ error: 'Heartbeat failed' });
        }
    }

    // 3. Save Answers (real-time)
    async saveAnswer(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { questionId, selectedOption } = req.body;
            const userCpId = (req as any).user.userId;
            const currentSessionId = (req as any).user.sessionId;

            const session = await ExamSession.findOne({ examId: id, studentCpId: userCpId });
            if (!session || session.status !== 'IN_PROGRESS') {
                res.status(400).json({ error: 'Cannot save: exam not in progress' });
                return;
            }
            if (session.lockedSessionId !== currentSessionId) {
                res.status(403).json({ error: 'Session locked to another device' });
                return;
            }

            // Update or add answer
            const existingIdx = session.answers.findIndex(a => a.questionId.toString() === questionId);
            if (existingIdx >= 0) {
                if (selectedOption) {
                    session.answers[existingIdx].selectedOption = selectedOption;
                } else {
                    // Clear answer if option is null
                    session.answers.splice(existingIdx, 1);
                }
            } else if (selectedOption) {
                session.answers.push({ questionId, selectedOption });
            }

            await session.save();
            res.json({ ok: true });
        } catch (error) {
            res.status(500).json({ error: 'Failed to save answer' });
        }
    }

    // 4. Tab Switch Violation
    async reportTabSwitch(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userCpId = (req as any).user.userId;
            const { reason } = req.body;

            const session = await ExamSession.findOne({ examId: id, studentCpId: userCpId });
            if (!session || session.status !== 'IN_PROGRESS') return;

            session.tabSwitchCount += 1;
            session.tabSwitchLog.push({ 
                switchedAt: new Date(), 
                reason: reason || 'Tab Switch / Screen Blur' 
            });

            if (session.tabSwitchCount >= 3) {
                session.status = 'AUTO_SUBMITTED';
                session.submittedAt = new Date();
                await session.save();
                await Session.updateOne({ userId: userCpId }, { isExamLocked: false, lockedExamId: null });
                res.json({ 
                    autoSubmitted: true, 
                    message: 'Exam auto-submitted due to maximum tab switches (3).' 
                });
                return;
            }

            await session.save();
            res.json({ 
                warningCount: session.tabSwitchCount,
                message: `Warning ${session.tabSwitchCount}/2. Your exam will be auto-submitted on the 3rd violation.`
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to report tab switch' });
        }
    }

    // 5. Final Submit
    async submitExam(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userCpId = (req as any).user.userId;
            const currentSessionId = (req as any).user.sessionId;

            const session = await ExamSession.findOne({ examId: id, studentCpId: userCpId });
            if (!session || session.status !== 'IN_PROGRESS') {
                res.status(400).json({ error: 'Cannot submit' });
                return;
            }
            if (session.lockedSessionId !== currentSessionId) {
                res.status(403).json({ error: 'Session locked' });
                return;
            }

            session.status = 'SUBMITTED';
            session.submittedAt = new Date();
            await session.save();
            await Session.updateOne({ userId: userCpId }, { isExamLocked: false, lockedExamId: null });

            res.json({ message: 'Exam submitted successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to submit exam' });
        }
    }

    // --- COORDINATOR: End Exam ---
    // Marks exam as COMPLETED, auto-submits any still-in-progress sessions, and releases all exam locks
    async endExam(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const exam = await Exam.findById(id);
            if (!exam) {
                res.status(404).json({ error: 'Exam not found' });
                return;
            }
            if (exam.status === 'COMPLETED') {
                res.status(400).json({ error: 'Exam is already completed' });
                return;
            }

            // Auto-submit all still in-progress sessions
            const inProgressSessions = await ExamSession.find({ examId: id, status: 'IN_PROGRESS' });
            const now = new Date();
            for (const s of inProgressSessions) {
                s.status = 'AUTO_SUBMITTED';
                s.submittedAt = now;
                await s.save();
            }

            // Release all exam locks for students of this exam
            const allSessions = await ExamSession.find({ examId: id });
            const studentCpIds = allSessions.map(s => s.studentCpId);
            if (studentCpIds.length > 0) {
                await Session.updateMany(
                    { userId: { $in: studentCpIds } },
                    { isExamLocked: false, lockedExamId: null }
                );
            }

            // Mark exam as COMPLETED
            await Exam.findByIdAndUpdate(id, { status: 'COMPLETED' });

            res.json({ 
                message: 'Exam ended successfully', 
                autoSubmittedCount: inProgressSessions.length 
            });
        } catch (error) {
            console.error('endExam error:', error);
            res.status(500).json({ error: 'Failed to end exam' });
        }
    }
}

export const liveExamController = new LiveExamController();

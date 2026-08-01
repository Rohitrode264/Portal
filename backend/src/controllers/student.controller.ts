import { Request, Response } from 'express';
import { Exam } from '../models/Exam.model';
import { ExamSession } from '../models/ExamSession.model';
import { Student } from '../models/Student.model';
import { Enrollment } from '../models/Enrollment.model';
import { AcademicClass } from '../models/AcademicClass.model';
import { ClassTemplate } from '../models/ClassTemplate.model';
import { ExamService } from '../services/exam.service';

export class StudentController {
    
    // ---------------------------------------------------------
    // ADMIN ENDPOINTS
    // ---------------------------------------------------------
    
    // Search CET Students
    async searchStudents(req: Request, res: Response): Promise<void> {
        try {
            const { q } = req.query;
            
            const query: any = {
                status: 'ACTIVE',
                cetBucket: { $in: ['PCM', 'PCB'] }
            };

            if (q && typeof q === 'string') {
                query.$or = [
                    { firstName: { $regex: q, $options: 'i' } },
                    { lastName: { $regex: q, $options: 'i' } },
                    { admissionNumber: { $regex: q, $options: 'i' } }
                ];
            }

            const students = await Student.find(query).limit(50);

            const studentIds = students.map(s => s._id);
            const enrollments = await Enrollment.find({
                studentId: { $in: studentIds },
                status: 'ONGOING'
            }).populate({
                path: 'academicClassId',
                populate: { path: 'templateId' }
            });

            const results = students.map(student => {
                const enrollment = enrollments.find(e => e.studentId.toString() === student._id.toString());
                let academicDetails = null;

                if (enrollment) {
                    const acClass: any = enrollment.academicClassId;
                    const template: any = acClass?.templateId;
                    
                    academicDetails = {
                        academicYear: enrollment.academicYear,
                        className: template ? `${template.grade}${template.stream ? ` (${template.stream})` : ''} — ${template.board}` : 'Unknown Class',
                        section: acClass?.section || null
                    };
                }

                return {
                    id: student._id,
                    admissionNumber: student.admissionNumber,
                    name: `${student.firstName} ${student.lastName}`,
                    phone: student.phone,
                    cetBucket: student.cetBucket,
                    ...academicDetails
                };
            }).filter(s => s.academicYear); 

            res.json(results);
        } catch (error: any) {
            console.error('Search Students Error:', error);
            res.status(500).json({ error: 'Failed to search students' });
        }
    }

    // Get Student Profile & Exams
    async getStudentProfile(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            
            const student = await Student.findById(id);
            if (!student) {
                res.status(404).json({ error: 'Student not found' });
                return;
            }

            const enrollment = await Enrollment.findOne({
                studentId: student._id,
                status: 'ONGOING'
            }).populate({
                path: 'academicClassId',
                populate: { path: 'templateId' }
            });

            let academicDetails = null;
            if (enrollment) {
                const acClass: any = enrollment.academicClassId;
                const template: any = acClass?.templateId;
                
                academicDetails = {
                    academicYear: enrollment.academicYear,
                    className: template ? `${template.grade}${template.stream ? ` (${template.stream})` : ''} — ${template.board}` : 'Unknown Class',
                    section: acClass?.section || null
                };
            }

            const sessions = await ExamSession.find({ studentCpId: student.admissionNumber });
            
            const examsList = [];

            for (const session of sessions) {
                if (session.status === 'SUBMITTED' || session.status === 'AUTO_SUBMITTED') {
                    try {
                        const result = await ExamService.calculateExamResult(session.examId.toString());
                        const studentResult = result.roster.find(r => r.studentCpId === student.admissionNumber);
                        
                        if (studentResult) {
                            examsList.push({
                                examId: result.exam._id,
                                title: result.exam.title,
                                scheduledAt: result.exam.scheduledAt,
                                maxMarks: result.exam.maxMarks,
                                score: studentResult.totalScore,
                                correct: studentResult.correctCount,
                                wrong: studentResult.wrongCount,
                                unattempted: studentResult.unattemptedCount,
                                rank: studentResult.rank,
                                percentile: studentResult.percentile,
                                totalAttended: result.summary.totalAttended,
                                subjectScores: studentResult.subjectScores
                            });
                        }
                    } catch (e) {
                        console.error(`Failed to calculate result for exam ${session.examId}`, e);
                    }
                }
            }

            res.json({
                profile: {
                    id: student._id,
                    admissionNumber: student.admissionNumber,
                    name: `${student.firstName} ${student.lastName}`,
                    phone: student.phone,
                    whatsappNumber: student.whatsappNumber,
                    cetBucket: student.cetBucket,
                    ...academicDetails
                },
                exams: examsList.sort((a: any, b: any) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
            });

        } catch (error: any) {
            console.error('Get Student Profile Error:', error);
            res.status(500).json({ error: 'Failed to fetch student profile' });
        }
    }

    // ---------------------------------------------------------
    // STUDENT PORTAL ENDPOINTS
    // ---------------------------------------------------------

    async getMyExams(req: Request, res: Response): Promise<void> {
        try {
            const studentCpId = (req as any).user.userId;

            const exams = await Exam.find({
                status: { $in: ['PUBLISHED', 'LIVE', 'COMPLETED'] }
            }).sort({ scheduledAt: 1 });

            // Fetch this student's sessions for all these exams at once
            const examIds = exams.map(e => e._id);
            const sessions = await ExamSession.find({
                examId: { $in: examIds },
                studentCpId
            });
            const sessionMap = new Map(sessions.map(s => [s.examId.toString(), s.status]));

            const sanitizedExams = exams.map(exam => ({
                _id: exam._id,
                title: exam.title,
                className: exam.className,
                group: exam.group,
                status: exam.status,
                scheduledAt: exam.scheduledAt,
                duration: exam.duration,
                loginWindowMinutes: exam.loginWindowMinutes || 15,
                isResultPublished: exam.isResultPublished || false,
                // Student's own session status for this exam
                sessionStatus: sessionMap.get(exam._id.toString()) || null,
            }));

            res.json({ exams: sanitizedExams });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to fetch student exams' });
        }
    }

    async getMyExamResult(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const studentCpId = (req as any).user.userId;

            const exam = await Exam.findById(id);
            if (!exam) {
                res.status(404).json({ error: 'Exam not found' });
                return;
            }

            if (!exam.isResultPublished) {
                res.status(403).json({ error: 'Result yet to be published' });
                return;
            }

            const sessions = await ExamSession.find({ examId: id });
            const mySession = sessions.find(s => s.studentCpId === studentCpId);

            if (!mySession || mySession.status === 'ABSENT') {
                res.status(400).json({ error: 'You did not attend this exam or submit answers.' });
                return;
            }

            // Build all questions map and calculate maxMarks per subject & overall
            const groupSubjects = exam.group === 'PCB'
                ? ['PHYSICS', 'CHEMISTRY', 'BIOLOGY']
                : ['PHYSICS', 'CHEMISTRY', 'MATHS'];

            const questionsList: any[] = [];
            let maxMarks = 0;
            const subjectMaxMarks: Record<string, number> = {};
            groupSubjects.forEach(s => { subjectMaxMarks[s] = 0; });

            for (const sec of exam.sections) {
                for (const q of sec.questions) {
                    if (q._id) {
                        const m = q.marks || exam.defaultMarks || 4;
                        const nm = q.negativeMarks || exam.defaultNegativeMarks || 1;
                        maxMarks += m;
                        if (subjectMaxMarks[sec.subject] !== undefined) {
                            subjectMaxMarks[sec.subject] += m;
                        } else {
                            subjectMaxMarks[sec.subject] = m;
                        }
                        questionsList.push({
                            _id: q._id.toString(),
                            subject: sec.subject,
                            text: q.text,
                            options: q.options,
                            correctAnswer: q.correctAnswer,
                            diagramUrl: q.diagramUrl,
                            diagramUrls: q.diagramUrls || [],
                            marks: m,
                            negativeMarks: nm,
                            difficulty: 'MEDIUM'
                        });
                    }
                }
            }

            // Calculate overall ranking among attended students
            const attendedSessions = sessions.filter(s => s.status !== 'ABSENT');
            const studentScores = attendedSessions.map(s => {
                const ansMap = new Map(s.answers.map(a => [a.questionId.toString(), a.selectedOption]));
                let sc = 0;
                for (const q of questionsList) {
                    const sel = ansMap.get(q._id);
                    if (sel === q.correctAnswer) sc += q.marks;
                    else if (sel) sc -= q.negativeMarks;
                }
                return { studentCpId: s.studentCpId, totalScore: sc };
            }).sort((a, b) => b.totalScore - a.totalScore);

            const myScoreObj = studentScores.find(x => x.studentCpId === studentCpId);
            const myScore = myScoreObj ? myScoreObj.totalScore : 0;
            const totalAttended = studentScores.length;
            const myRankIdx = studentScores.findIndex(x => x.totalScore === myScore);
            const rank = myRankIdx >= 0 ? myRankIdx + 1 : totalAttended;
            const countBelow = studentScores.filter(x => x.totalScore < myScore).length;
            const percentile = totalAttended > 0 ? Number(((countBelow / totalAttended) * 100).toFixed(2)) : 0;

            // Build detailed question analysis for this student
            const myAnsMap = new Map(mySession.answers.map(a => [a.questionId.toString(), a.selectedOption]));
            let correctCount = 0;
            let wrongCount = 0;
            let unattemptedCount = 0;
            const subjectScores: Record<string, { score: number; correct: number; wrong: number; unattempted: number; maxMarks: number }> = {};
            groupSubjects.forEach(s => {
                subjectScores[s] = { score: 0, correct: 0, wrong: 0, unattempted: 0, maxMarks: subjectMaxMarks[s] || 0 };
            });

            const detailedQuestions = questionsList.map(q => {
                const sel = myAnsMap.get(q._id) || null;
                const subj = q.subject || 'PHYSICS';
                if (!subjectScores[subj]) {
                    subjectScores[subj] = { score: 0, correct: 0, wrong: 0, unattempted: 0, maxMarks: subjectMaxMarks[subj] || 0 };
                }

                let marksAwarded = 0;
                if (!sel) {
                    unattemptedCount++;
                    subjectScores[subj].unattempted++;
                } else if (sel === q.correctAnswer) {
                    correctCount++;
                    marksAwarded = q.marks;
                    subjectScores[subj].correct++;
                    subjectScores[subj].score += q.marks;
                } else {
                    wrongCount++;
                    marksAwarded = -q.negativeMarks;
                    subjectScores[subj].wrong++;
                    subjectScores[subj].score -= q.negativeMarks;
                }

                return {
                    _id: q._id,
                    subject: q.subject,
                    text: q.text,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    selectedOption: sel,
                    marksAwarded,
                    maxMarks: q.marks,
                    difficulty: q.difficulty,
                    diagramUrl: q.diagramUrl,
                    diagramUrls: q.diagramUrls
                };
            });

            const percentage = maxMarks > 0 ? Number(((myScore / maxMarks) * 100).toFixed(2)) : 0;

            res.json({
                exam: {
                    _id: exam._id,
                    title: exam.title,
                    className: exam.className,
                    group: exam.group,
                    duration: exam.duration,
                    scheduledAt: exam.scheduledAt,
                    maxMarks
                },
                summary: {
                    status: mySession.status,
                    totalScore: myScore,
                    maxMarks,
                    percentage,
                    rank,
                    totalAttended,
                    percentile,
                    correctCount,
                    wrongCount,
                    unattemptedCount,
                    subjectScores
                },
                questions: detailedQuestions
            });
        } catch (error: any) {
            console.error('Get Student Exam Result Error:', error);
            res.status(500).json({ error: 'Failed to fetch exam result' });
        }
    }
}

export const studentController = new StudentController();

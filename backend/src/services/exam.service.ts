import { Exam } from '../models/Exam.model';
import { ExamSession } from '../models/ExamSession.model';
import { Enrollment } from '../models/Enrollment.model';
import { Student } from '../models/Student.model';
import mongoose from 'mongoose';

export class ExamService {
    /**
     * Calculates the results (score, rank, percentile) for an exam.
     * Returns the exam info, summary stats, and the full evaluated roster.
     */
    static async calculateExamResult(examId: string) {
        const exam = await Exam.findById(examId);
        if (!exam) {
            throw new Error('Exam not found');
        }

        // Build Question map
        const questionMap = new Map<string, {
            subject: string;
            correctAnswer: string;
            marks: number;
            negativeMarks: number;
            text: string;
        }>();
        let maxMarks = 0;

        for (const sec of exam.sections) {
            for (const q of sec.questions) {
                if (q._id) {
                    const m = q.marks ?? sec.defaultMarks ?? exam.defaultMarks ?? 4;
                    const nm = q.negativeMarks ?? sec.defaultNegativeMarks ?? exam.defaultNegativeMarks ?? 1;
                    questionMap.set(q._id.toString(), {
                        subject: sec.subject,
                        correctAnswer: q.correctAnswer,
                        marks: m,
                        negativeMarks: nm,
                        text: q.text
                    });
                    maxMarks += m;
                }
            }
        }

        // Fetch students enrolled in class & group
        const enrollments = await Enrollment.find({ academicClassId: exam.classId, status: 'ONGOING' });
        const studentIds = enrollments.map(e => e.studentId);
        const students = await Student.find({
            _id: { $in: studentIds },
            status: 'ACTIVE',
            cetBucket: exam.group
        });

        // Fetch exam sessions
        const sessions = await ExamSession.find({ examId });

        const groupSubjects = exam.group === 'PCB'
            ? ['PHYSICS', 'CHEMISTRY', 'BIOLOGY']
            : ['PHYSICS', 'CHEMISTRY', 'MATHS'];

        // Evaluate scores for each student
        const rawRoster = students.map(student => {
            const session = sessions.find(s => s.studentCpId === student.admissionNumber);
            const attended = session ? (session.status !== 'ABSENT') : false;
            
            let totalScore = 0;
            let correctCount = 0;
            let wrongCount = 0;
            let unattemptedCount = 0;
            const subjectScores: Record<string, { score: number; correct: number; wrong: number; unattempted: number }> = {};
            groupSubjects.forEach(s => {
                subjectScores[s] = { score: 0, correct: 0, wrong: 0, unattempted: 0 };
            });

            if (attended && session) {
                const answerMap = new Map(session.answers.map(a => [a.questionId.toString(), a.selectedOption]));
                
                for (const [qId, q] of questionMap.entries()) {
                    const subj = q.subject || 'PHYSICS';
                    if (!subjectScores[subj]) {
                        subjectScores[subj] = { score: 0, correct: 0, wrong: 0, unattempted: 0 };
                    }

                    const selected = answerMap.get(qId);
                    if (!selected) {
                        unattemptedCount++;
                        subjectScores[subj].unattempted++;
                    } else if (selected === q.correctAnswer) {
                        correctCount++;
                        totalScore += q.marks;
                        subjectScores[subj].correct++;
                        subjectScores[subj].score += q.marks;
                    } else {
                        wrongCount++;
                        totalScore -= q.negativeMarks;
                        subjectScores[subj].wrong++;
                        subjectScores[subj].score -= q.negativeMarks;
                    }
                }
            }

            return {
                studentCpId: student.admissionNumber,
                name: `${student.firstName} ${student.lastName}`,
                status: session ? session.status : 'ABSENT',
                attended,
                totalScore,
                maxMarks,
                correctCount,
                wrongCount,
                unattemptedCount,
                subjectScores,
                submittedAt: session?.submittedAt || null
            };
        });

        // Calculate Ranks and Percentiles among attended students
        const attendedList = rawRoster.filter(r => r.attended).sort((a, b) => b.totalScore - a.totalScore);
        const totalAttended = attendedList.length;

        const scoreToRankAndPercentile = new Map<number, { rank: number; percentile: number }>();
        for (let i = 0; i < attendedList.length; i++) {
            const item = attendedList[i];
            if (!scoreToRankAndPercentile.has(item.totalScore)) {
                const countEqualOrBelow = attendedList.filter(x => x.totalScore <= item.totalScore).length;
                const percentile = totalAttended > 0 ? Number(((countEqualOrBelow / totalAttended) * 100).toFixed(2)) : 0;
                scoreToRankAndPercentile.set(item.totalScore, {
                    rank: i + 1,
                    percentile
                });
            }
        }

        const roster = rawRoster.map(item => {
            if (!item.attended) {
                return { ...item, rank: null, percentile: null };
            }
            const rp = scoreToRankAndPercentile.get(item.totalScore) || { rank: totalAttended, percentile: 0 };
            return {
                ...item,
                rank: rp.rank,
                percentile: rp.percentile
            };
        });

        const highestScore = totalAttended > 0 ? attendedList[0].totalScore : 0;
        const avgScore = totalAttended > 0 
            ? Number((attendedList.reduce((acc, curr) => acc + curr.totalScore, 0) / totalAttended).toFixed(1))
            : 0;

        return {
            exam: {
                _id: exam._id,
                title: exam.title,
                className: exam.className,
                group: exam.group,
                status: exam.status,
                isResultPublished: exam.isResultPublished || false,
                maxMarks,
                scheduledAt: exam.scheduledAt
            },
            summary: {
                totalStudents: roster.length,
                totalAttended,
                highestScore,
                avgScore
            },
            roster
        };
    }
}

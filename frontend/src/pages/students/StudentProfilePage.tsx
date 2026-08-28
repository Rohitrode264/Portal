import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, FileText, BarChart2, Award, BookOpen, Users, Calendar, UserRound } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { api } from '../../lib/api';
import { DashboardLayout } from '../../components/layout/DashboardLayout';

interface StudentProfile {
    id: string;
    admissionNumber: string;
    name: string;
    phone: string;
    whatsappNumber: string;
    cetBucket: string;
    academicYear: string;
    className: string;
    section: string | null;
}

interface ExamSummary {
    examId: string;
    title: string;
    scheduledAt: string;
    maxMarks: number;
    score: number;
    correct: number;
    wrong: number;
    unattempted: number;
    rank: number;
    percentile: number;
    totalAttended: number;
    subjectScores: Record<string, { score: number; correct: number; wrong: number; unattempted: number }>;
}

export function StudentProfilePage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [exams, setExams] = useState<ExamSummary[]>([]);
    const [loading, setLoading] = useState(true);

    const printRef = useRef<HTMLDivElement>(null);
    const [printingExam, setPrintingExam] = useState<ExamSummary | null>(null);
    const isPrintingSingle = printingExam !== null;

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get(`/student/${id}/profile`);
                setProfile(res.data.profile);
                setExams(res.data.exams);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [id]);

    const handlePrintAction = useReactToPrint({
        contentRef: printRef,
        documentTitle: `ReportCard_${profile?.name || 'Student'}`,
        onAfterPrint: () => setPrintingExam(null)
    });

    const triggerCumulativePrint = () => {
        setPrintingExam(null);
        setTimeout(handlePrintAction, 50);
    };

    const triggerExamPrint = (exam: ExamSummary) => {
        setPrintingExam(exam);
        setTimeout(handlePrintAction, 50);
    };

    if (loading) {
        return <DashboardLayout><div className="p-8 text-center text-gray-500">Loading Profile...</div></DashboardLayout>;
    }

    if (!profile) {
        return <DashboardLayout><div className="p-8 text-center text-red-500">Student not found</div></DashboardLayout>;
    }

    const avgScore = exams.length > 0 ? (exams.reduce((a, b) => a + (b.score / b.maxMarks * 100), 0) / exams.length).toFixed(1) : '0.0';
    const bestRank = exams.length > 0 ? Math.min(...exams.map(e => e.rank)) : 'N/A';
    
    const totalAttempted = exams.reduce((a, b) => a + b.correct + b.wrong, 0);
    const totalCorrect = exams.reduce((a, b) => a + b.correct, 0);
    const accuracy = totalAttempted > 0 ? ((totalCorrect / totalAttempted) * 100).toFixed(1) : '0.0';

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {/* Header Banner */}
                <div className="relative rounded-[2rem] bg-blue-50 h-48 w-full shadow-sm overflow-hidden border border-blue-100/50">
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-blue-100/50 blur-3xl"></div>
                    <div className="absolute bottom-0 left-20 -mb-20 w-56 h-56 rounded-full bg-indigo-100/40 blur-2xl"></div>
                    
                    <button onClick={() => navigate('/students')} className="absolute top-6 left-6 p-2.5 bg-white/60 hover:bg-white backdrop-blur-md border border-white/40 rounded-full text-gray-700 hover:text-gray-900 shadow-sm transition-all">
                        <ArrowLeft size={20} />
                    </button>
                    
                    <div className="absolute top-6 right-6">
                        <button 
                            onClick={triggerCumulativePrint} 
                            className="flex items-center gap-2 px-5 py-2.5 bg-white/80 backdrop-blur-md text-blue-700 font-bold rounded-2xl shadow-sm border border-white hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                        >
                            <Printer size={18} /> Print Cumulative (A5)
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 -mt-16 px-4 mb-12">
                    
                    {/* Left Column - Profile Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100/80 relative mt-2 hover:shadow-md transition-shadow">
                            <div className="absolute -top-14 left-6 w-28 h-28 rounded-full bg-white p-2 shadow-sm border border-gray-50">
                                <div className="w-full h-full bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                                    <UserRound size={48} strokeWidth={2.5} />
                                </div>
                            </div>
                            
                            <div className="pt-16 pb-2">
                                <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">{profile.name}</h1>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 mt-2 mb-6 border border-green-100/50">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    <span className="text-[11px] font-bold uppercase tracking-wider">ID: {profile.admissionNumber}</span>
                                </div>
                                
                                <div className="space-y-1 pt-2">
                                    <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                            <BookOpen size={18} />
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Class & Group</div>
                                            <div className="font-bold text-gray-900 text-sm">{profile.className} <span className="text-gray-300 mx-1">•</span> <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-xs">{profile.cetBucket}</span></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                                            <Users size={18} />
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Batch / Section</div>
                                            <div className="font-bold text-gray-900 text-sm">{profile.section || 'Not assigned'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                                            <Calendar size={18} />
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Academic Year</div>
                                            <div className="font-bold text-gray-900 text-sm">{profile.academicYear}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Right Column - Stats & History */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-16 lg:pt-2">
                            <div className="bg-gradient-to-br from-blue-50/80 to-blue-100/50 rounded-3xl p-5 flex flex-col justify-between border border-blue-100/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 text-blue-600">
                                    <BarChart2 size={100} />
                                </div>
                                <div className="flex items-center gap-3 mb-4 relative z-10">
                                    <div className="w-9 h-9 rounded-2xl bg-white text-blue-600 flex items-center justify-center shadow-sm">
                                        <BarChart2 size={18} />
                                    </div>
                                    <div className="text-[10px] font-extrabold text-blue-800/80 uppercase tracking-widest leading-tight">Exams<br/>Taken</div>
                                </div>
                                <div className="text-3xl font-black text-blue-950 tracking-tight relative z-10">{exams.length}</div>
                            </div>

                            <div className="bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 rounded-3xl p-5 flex flex-col justify-between border border-emerald-100/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 text-emerald-600">
                                    <FileText size={100} />
                                </div>
                                <div className="flex items-center gap-3 mb-4 relative z-10">
                                    <div className="w-9 h-9 rounded-2xl bg-white text-emerald-600 flex items-center justify-center shadow-sm">
                                        <FileText size={18} />
                                    </div>
                                    <div className="text-[10px] font-extrabold text-emerald-800/80 uppercase tracking-widest leading-tight">Avg<br/>Score</div>
                                </div>
                                <div className="text-3xl font-black text-emerald-950 tracking-tight relative z-10">{avgScore}%</div>
                            </div>

                            <div className="bg-gradient-to-br from-purple-50/80 to-purple-100/50 rounded-3xl p-5 flex flex-col justify-between border border-purple-100/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 text-purple-600">
                                    <Award size={100} />
                                </div>
                                <div className="flex items-center gap-3 mb-4 relative z-10">
                                    <div className="w-9 h-9 rounded-2xl bg-white text-purple-600 flex items-center justify-center shadow-sm">
                                        <Award size={18} />
                                    </div>
                                    <div className="text-[10px] font-extrabold text-purple-800/80 uppercase tracking-widest leading-tight">Best<br/>Rank</div>
                                </div>
                                <div className="text-3xl font-black text-purple-950 tracking-tight relative z-10">#{bestRank}</div>
                            </div>

                            <div className="bg-gradient-to-br from-amber-50/80 to-amber-100/50 rounded-3xl p-5 flex flex-col justify-between border border-amber-100/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 text-amber-600">
                                    <BarChart2 size={100} />
                                </div>
                                <div className="flex items-center gap-3 mb-4 relative z-10">
                                    <div className="w-9 h-9 rounded-2xl bg-white text-amber-600 flex items-center justify-center shadow-sm">
                                        <BarChart2 size={18} />
                                    </div>
                                    <div className="text-[10px] font-extrabold text-amber-800/80 uppercase tracking-widest leading-tight">Overall<br/>Accuracy</div>
                                </div>
                                <div className="text-3xl font-black text-amber-950 tracking-tight relative z-10">{accuracy}%</div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100/80">
                            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                                <h2 className="text-lg font-black text-gray-900 tracking-tight">Exam History</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="px-6 py-4 text-[11px] font-bold tracking-wider text-gray-500 uppercase">Exam Title</th>
                                            <th className="px-6 py-4 text-[11px] font-bold tracking-wider text-gray-500 uppercase">Score</th>
                                            <th className="px-6 py-4 text-[11px] font-bold tracking-wider text-gray-500 uppercase">Rank / Total</th>
                                            <th className="px-6 py-4 text-[11px] font-bold tracking-wider text-gray-500 uppercase">Accuracy</th>
                                            <th className="px-6 py-4 text-[11px] font-bold tracking-wider text-gray-500 uppercase text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {exams.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium text-sm">No exams taken yet.</td>
                                            </tr>
                                        ) : exams.map((exam) => (
                                            <tr key={exam.examId} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900 text-sm">{exam.title}</div>
                                                    <div className="text-xs text-gray-500 font-medium mt-0.5">{new Date(exam.scheduledAt).toLocaleDateString()}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-black text-gray-900 text-sm">{exam.score} <span className="text-gray-400 font-medium text-xs">/ {exam.maxMarks}</span></div>
                                                    <div className="text-[10px] text-gray-500 font-bold tracking-wide mt-0.5 flex gap-1.5">
                                                        <span className="text-emerald-600">C:{exam.correct}</span>
                                                        <span className="text-red-500">W:{exam.wrong}</span>
                                                        <span className="text-gray-400">U:{exam.unattempted}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-black text-gray-900 text-sm">#{exam.rank}</span>
                                                    <span className="text-gray-400 font-medium text-xs ml-1">/ {exam.totalAttended}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-black">
                                                        {((exam.correct / (exam.correct + exam.wrong) * 100) || 0).toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => triggerExamPrint(exam)}
                                                        className="py-2 px-4 text-xs inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 transition-all"
                                                    >
                                                        <Printer size={14} className="text-gray-500" /> Print
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden Print Container */}
            <div className="hidden">
                <div ref={printRef} className="print-container" style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>
                    <style>{`
                        @page { size: A5 portrait; margin: 10mm 12mm 12mm 12mm; }
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
                        body { font-family: "Inter", sans-serif; font-size: 11px; line-height: 1.5; color: #1e293b; background: white; }
                        h1, h2, h3, h4 { margin: 0; color: #0f172a; }
                        
                        /* Premium Header */
                        .header-box { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; position: relative; }
                        .header-box::after { content: ''; position: absolute; bottom: -5px; left: 0; width: 100%; height: 1px; background: #bfdbfe; }
                        .org-name { font-size: 20px; font-weight: 900; letter-spacing: -0.02em; color: #1e3a8a; }
                        .org-sub { font-size: 10px; color: #64748b; font-weight: 500; margin-top: 2px; }
                        
                        /* Titles */
                        .title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; text-align: center; color: #1e40af; background: #eff6ff; padding: 6px 12px; border-radius: 6px; display: inline-block; position: relative; left: 50%; transform: translateX(-50%); }
                        
                        /* Student Info Card */
                        .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; background: #f8fafc; padding: 12px 16px; border-radius: 10px; border: 1px solid #e2e8f0; }
                        .info-item { font-size: 10.5px; }
                        .info-item span { font-weight: 700; color: #475569; margin-right: 6px; text-transform: uppercase; font-size: 9px; letter-spacing: 0.02em; }
                        .info-item strong { color: #0f172a; font-weight: 600; }
                        
                        /* Summary Stats */
                        .summary-boxes { display: flex; gap: 12px; margin-bottom: 20px; }
                        .s-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 8px; text-align: center; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.02); border-bottom: 2px solid #cbd5e1; }
                        .s-box .label { font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.02em; }
                        .s-box .val { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 4px; }
                        
                        /* Tables */
                        table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 5px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
                        th { background-color: #f1f5f9; text-align: left; padding: 8px 10px; font-weight: 700; font-size: 9.5px; color: #475569; text-transform: uppercase; letter-spacing: 0.02em; border-bottom: 1px solid #cbd5e1; }
                        td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 10.5px; color: #1e293b; }
                        tr:last-child td { border-bottom: none; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .font-bold { font-weight: 700; }
                        
                        /* Subject Cards */
                        .subject-scores { display: flex; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
                        .subj-card { flex: 1; min-width: 30%; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; background: #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
                        .subj-card h4 { font-size: 10px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; margin-bottom: 8px; color: #334155; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
                        .subj-score { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
                        .subj-stats { display: flex; justify-content: space-between; font-size: 9.5px; font-weight: 600; color: #64748b; background: #f8fafc; padding: 4px 6px; border-radius: 4px; }
                        .stat-c { color: #16a34a; }
                        .stat-w { color: #dc2626; }
                        .stat-u { color: #94a3b8; }
                        
                        /* Footer signatures */
                        .signatures { margin-top: 40px; display: flex; justify-content: space-between; padding: 0 30px; }
                        .sig-line { border-top: 1px dashed #94a3b8; padding-top: 6px; width: 100px; text-align: center; font-size: 9.5px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }
                    `}</style>

                    <div className="header-box">
                        <div>
                            <div className="org-name">NEW CAREER POINT</div>
                            <div className="org-sub">Quality Education & Guidance Center</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 10, fontWeight: 600 }}>{new Date().toLocaleDateString('en-GB')}</div>
                            <div className="org-sub">UDYAM-MH-20-0026811</div>
                        </div>
                    </div>

                    <div className="title">
                        {isPrintingSingle ? 'EXAM REPORT CARD' : 'CUMULATIVE REPORT CARD'}
                    </div>

                    <div className="student-info">
                        <div className="info-item"><span>Name:</span> <strong>{profile.name}</strong></div>
                        <div className="info-item"><span>ID:</span> <strong>{profile.admissionNumber}</strong></div>
                        <div className="info-item"><span>Class:</span> <strong>{profile.className}</strong></div>
                        <div className="info-item"><span>Group:</span> <strong>{profile.cetBucket}</strong></div>
                        {profile.section && <div className="info-item"><span>Batch:</span> <strong>{profile.section}</strong></div>}
                        <div className="info-item"><span>Session:</span> <strong>{profile.academicYear}</strong></div>
                    </div>

                    {isPrintingSingle && printingExam ? (
                        <>
                            <div style={{ marginBottom: 15 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{printingExam.title}</div>
                                <div style={{ fontSize: 10, color: '#4b5563' }}>Conducted on: {new Date(printingExam.scheduledAt).toLocaleDateString('en-GB')}</div>
                            </div>
                            
                            <div className="summary-boxes">
                                <div className="s-box"><div className="label">Total Score</div><div className="val">{printingExam.score} <span style={{fontSize: 10, fontWeight: 600, color: '#64748b'}}>/ {printingExam.maxMarks}</span></div></div>
                                <div className="s-box"><div className="label">Class Rank</div><div className="val">#{printingExam.rank} <span style={{fontSize: 10, fontWeight: 600, color: '#64748b'}}>/ {printingExam.totalAttended}</span></div></div>
                                <div className="s-box"><div className="label">Accuracy</div><div className="val">{((printingExam.correct / (printingExam.correct + printingExam.wrong) * 100) || 0).toFixed(1)}%</div></div>
                            </div>

                            <div style={{ fontSize: 11, fontWeight: 800, marginTop: 20, marginBottom: 8, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject-wise Breakdown</div>
                            <div className="subject-scores">
                                {Object.entries(printingExam.subjectScores).map(([subj, s]) => (
                                    <div key={subj} className="subj-card">
                                        <h4>{subj}</h4>
                                        <div className="subj-score">{s.score} <span style={{fontSize: 10, fontWeight: 600, color: '#64748b'}}>marks</span></div>
                                        <div className="subj-stats">
                                            <span className="stat-c">✓ {s.correct}</span>
                                            <span className="stat-w">✗ {s.wrong}</span>
                                            <span className="stat-u">O {s.unattempted}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="summary-boxes">
                                <div className="s-box"><div className="label">Exams Taken</div><div className="val">{exams.length}</div></div>
                                <div className="s-box"><div className="label">Avg Score</div><div className="val">{avgScore}%</div></div>
                                <div className="s-box"><div className="label">Accuracy</div><div className="val">{accuracy}%</div></div>
                            </div>

                            <div>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                        <th>Exam Title</th>
                                        <th className="text-right">Score</th>
                                        <th className="text-center">Rank</th>
                                        <th className="text-right">Acc.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {exams.map(e => (
                                        <tr key={e.examId}>
                                            <td style={{ color: '#64748b', fontWeight: 500 }}>{new Date(e.scheduledAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' })}</td>
                                            <td className="font-bold">{e.title}</td>
                                            <td className="text-right font-bold">{e.score}<span style={{fontSize: 9, fontWeight: 500, color: '#94a3b8'}}>/{e.maxMarks}</span></td>
                                            <td className="text-center font-bold">#{e.rank}<span style={{fontSize: 9, fontWeight: 500, color: '#94a3b8'}}>/{e.totalAttended}</span></td>
                                            <td className="text-right font-bold" style={{ color: '#0369a1' }}>{((e.correct / (e.correct + e.wrong) * 100) || 0).toFixed(0)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        </>
                    )}

                    <div className="signatures">
                        <div>
                            <div className="sig-line">Student Sign</div>
                        </div>
                        <div>
                            <div className="sig-line">Admin Sign</div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

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
    const bestPercentile = exams.length > 0 ? Math.max(...exams.map(e => e.percentile)) : 'N/A';

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
                                    <div className="text-[10px] font-extrabold text-amber-800/80 uppercase tracking-widest leading-tight">Top<br/>Percentile</div>
                                </div>
                                <div className="text-3xl font-black text-amber-950 tracking-tight relative z-10">{bestPercentile}</div>
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
                                            <th className="px-6 py-4 text-[11px] font-bold tracking-wider text-gray-500 uppercase">Percentile</th>
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
                                                    <span className="inline-flex px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-black">
                                                        {exam.percentile}
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
                        @page { size: A5 portrait; margin: 10mm 10mm 12mm 14mm; }
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        body { font-family: "Inter", sans-serif; font-size: 11px; line-height: 1.4; color: #111; }
                        h1, h2, h3, h4 { margin: 0; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                        th { background-color: #f3f4f6; text-align: left; padding: 6px 8px; font-weight: 600; font-size: 10px; border-bottom: 2px solid #e5e7eb; }
                        td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .font-bold { font-weight: 700; }
                        .header-box { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 15px; }
                        .org-name { font-size: 18px; font-weight: 800; letter-spacing: -0.02em; }
                        .org-sub { font-size: 10px; color: #4b5563; }
                        .title { font-size: 14px; font-weight: 700; text-transform: uppercase; margin-bottom: 10px; text-align: center; text-decoration: underline; }
                        .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 15px; background: #f9fafb; padding: 10px; border-radius: 6px; border: 1px solid #e5e7eb; }
                        .info-item span { font-weight: 600; margin-right: 5px; }
                        .summary-boxes { display: flex; gap: 10px; margin-bottom: 15px; }
                        .s-box { flex: 1; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; text-align: center; background: #fff; }
                        .s-box .label { font-size: 9px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
                        .s-box .val { font-size: 14px; font-weight: 700; color: #111; margin-top: 2px; }
                        .subject-scores { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
                        .subj-card { flex: 1; min-width: 30%; border: 1px dashed #d1d5db; padding: 8px; border-radius: 4px; }
                        .subj-card h4 { font-size: 10px; text-transform: uppercase; margin-bottom: 4px; color: #374151; }
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
                        <div className="info-item"><span>Name:</span> {profile.name}</div>
                        <div className="info-item"><span>ID:</span> {profile.admissionNumber}</div>
                        <div className="info-item"><span>Class:</span> {profile.className}</div>
                        <div className="info-item"><span>Group:</span> {profile.cetBucket}</div>
                        {profile.section && <div className="info-item"><span>Batch:</span> {profile.section}</div>}
                        <div className="info-item"><span>Session:</span> {profile.academicYear}</div>
                    </div>

                    {isPrintingSingle && printingExam ? (
                        <>
                            <div style={{ marginBottom: 15 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{printingExam.title}</div>
                                <div style={{ fontSize: 10, color: '#4b5563' }}>Conducted on: {new Date(printingExam.scheduledAt).toLocaleDateString('en-GB')}</div>
                            </div>
                            
                            <div className="summary-boxes">
                                <div className="s-box"><div className="label">Total Score</div><div className="val">{printingExam.score} / {printingExam.maxMarks}</div></div>
                                <div className="s-box"><div className="label">Class Rank</div><div className="val">#{printingExam.rank} <span style={{fontSize: 10, fontWeight: 400}}>/ {printingExam.totalAttended}</span></div></div>
                                <div className="s-box"><div className="label">Percentile</div><div className="val">{printingExam.percentile}</div></div>
                            </div>

                            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 15, marginBottom: 5 }}>Subject-wise Breakdown</div>
                            <div className="subject-scores">
                                {Object.entries(printingExam.subjectScores).map(([subj, s]) => (
                                    <div key={subj} className="subj-card">
                                        <h4>{subj}</h4>
                                        <div style={{ fontSize: 12, fontWeight: 700 }}>{s.score} marks</div>
                                        <div style={{ fontSize: 9, color: '#4b5563', marginTop: 4 }}>
                                            ✓ {s.correct} &nbsp; ✗ {s.wrong} &nbsp; O {s.unattempted}
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
                                <div className="s-box"><div className="label">Top Rank</div><div className="val">#{bestRank}</div></div>
                            </div>

                            <div className="overflow-x-auto">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                        <th>Exam Title</th>
                                        <th className="text-right">Score</th>
                                        <th className="text-center">Rank</th>
                                        <th className="text-right">PR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {exams.map(e => (
                                        <tr key={e.examId}>
                                            <td>{new Date(e.scheduledAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })}</td>
                                            <td className="font-bold">{e.title}</td>
                                            <td className="text-right">{e.score}/{e.maxMarks}</td>
                                            <td className="text-center">#{e.rank}/{e.totalAttended}</td>
                                            <td className="text-right font-bold">{e.percentile}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        </>
                    )}

                    <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', padding: '0 20px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ borderTop: '1px solid #111', paddingTop: 5, width: 80, fontSize: 9 }}>Student Sign</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ borderTop: '1px solid #111', paddingTop: 5, width: 80, fontSize: 9 }}>Admin Sign</div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

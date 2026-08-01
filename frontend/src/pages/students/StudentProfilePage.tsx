import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, FileText, BarChart2, Award, BookOpen, Users, Calendar } from 'lucide-react';
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
                <div className="relative rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 h-48 w-full shadow-lg overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white opacity-10"></div>
                    <div className="absolute bottom-0 right-40 -mb-20 w-40 h-40 rounded-full bg-white opacity-10"></div>
                    
                    <button onClick={() => navigate('/students')} className="absolute top-6 left-6 p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-white transition-all">
                        <ArrowLeft size={20} />
                    </button>
                    
                    <div className="absolute top-6 right-6">
                        <button 
                            onClick={triggerCumulativePrint} 
                            className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 font-bold rounded-xl shadow-[0_4px_14px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_20px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 transition-all duration-200"
                        >
                            <Printer size={18} /> Print Cumulative (A5)
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 -mt-16 px-4 mb-12">
                    
                    {/* Left Column - Profile Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="card p-6 shadow-xl relative bg-white border border-gray-100">
                            <div className="absolute -top-12 left-6 w-24 h-24 rounded-2xl bg-white p-1.5 shadow-lg">
                                <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-blue-50 rounded-xl flex items-center justify-center text-indigo-600 text-3xl font-extrabold tracking-tight">
                                    {profile.name.charAt(0)}
                                </div>
                            </div>
                            
                            <div className="pt-14 pb-2">
                                <h1 className="text-2xl font-bold text-gray-900 leading-tight">{profile.name}</h1>
                                <p className="text-sm font-semibold text-indigo-600 mt-1 mb-6 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    ID: {profile.admissionNumber}
                                </p>
                                
                                <div className="space-y-4 pt-4 border-t border-gray-100">
                                    <div className="flex items-center gap-3.5 text-sm">
                                        <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                            <BookOpen size={16} />
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-0.5">Class & Group</div>
                                            <div className="font-semibold text-gray-900">{profile.className} <span className="text-gray-300 mx-1">•</span> <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{profile.cetBucket}</span></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3.5 text-sm">
                                        <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                            <Users size={16} />
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-0.5">Batch / Section</div>
                                            <div className="font-semibold text-gray-900">{profile.section || 'Not assigned'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3.5 text-sm">
                                        <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                            <Calendar size={16} />
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-0.5">Academic Year</div>
                                            <div className="font-semibold text-gray-900">{profile.academicYear}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Right Column - Stats & History */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-20 lg:pt-0">
                            <div className="card p-5 flex flex-col items-center justify-center bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 group">
                                <BarChart2 className="mb-2 text-blue-500 group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300" size={26} />
                                <div className="text-2xl font-bold text-gray-900">{exams.length}</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Exams Taken</div>
                            </div>
                            <div className="card p-5 flex flex-col items-center justify-center bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all duration-300 group">
                                <FileText className="mb-2 text-green-500 group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300" size={26} />
                                <div className="text-2xl font-bold text-gray-900">{avgScore}%</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Avg Score</div>
                            </div>
                            <div className="card p-5 flex flex-col items-center justify-center bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all duration-300 group">
                                <Award className="mb-2 text-purple-500 group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300" size={26} />
                                <div className="text-2xl font-bold text-gray-900">#{bestRank}</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Best Rank</div>
                            </div>
                            <div className="card p-5 flex flex-col items-center justify-center bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all duration-300 group">
                                <BarChart2 className="mb-2 text-amber-500 group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300" size={26} />
                                <div className="text-2xl font-bold text-gray-900">{bestPercentile}</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Top Percentile</div>
                            </div>
                        </div>

                        <div className="card overflow-hidden shadow-sm border border-gray-100">
                            <div className="px-6 py-4 border-b border-gray-100 bg-white">
                                <h2 className="text-lg font-bold text-gray-900">Exam History</h2>
                            </div>
                            <div className="overflow-x-auto bg-white">
                                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-label">Exam Title</th>
                            <th className="px-6 py-4 text-label">Score</th>
                            <th className="px-6 py-4 text-label">Rank / Total</th>
                            <th className="px-6 py-4 text-label">Percentile</th>
                            <th className="px-6 py-4 text-label text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {exams.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No exams taken yet.</td>
                            </tr>
                        ) : exams.map((exam) => (
                            <tr key={exam.examId} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{exam.title}</div>
                                    <div className="text-xs text-gray-500">{new Date(exam.scheduledAt).toLocaleDateString()}</div>
                                </td>
                                <td className="px-6 py-4 font-semibold">
                                    {exam.score} / {exam.maxMarks}
                                    <div className="text-xs text-gray-500 font-normal">
                                        C:{exam.correct} W:{exam.wrong} U:{exam.unattempted}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-medium">#{exam.rank} <span className="text-gray-400 font-normal">/ {exam.totalAttended}</span></td>
                                <td className="px-6 py-4 font-semibold text-blue-600">{exam.percentile}</td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => triggerExamPrint(exam)}
                                        className="py-1.5 px-3 text-sm flex items-center gap-1.5 ml-auto bg-white border border-gray-200 text-gray-700 font-medium rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <Printer size={14} className="text-gray-500" /> Print Exam A5
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

import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { api } from '../../lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy, Users, Award, CheckCircle2, AlertCircle, Share2, EyeOff, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

type RosterItem = {
  studentCpId: string;
  name: string;
  status: string;
  attended: boolean;
  totalScore: number;
  maxMarks: number;
  rank: number | null;
  percentile: number | null;
  correctCount: number;
  wrongCount: number;
  unattemptedCount: number;
  subjectScores: Record<string, { score: number; correct: number; wrong: number; unattempted: number }>;
  submittedAt?: string;
};

type ResultData = {
  exam: {
    _id: string;
    title: string;
    className: string;
    group: string;
    status: string;
    isResultPublished: boolean;
    maxMarks: number;
  };
  summary: {
    totalStudents: number;
    totalAttended: number;
    averageScore: number;
    highestScore: number;
  };
  roster: RosterItem[];
};

function StatCard({ label, value, sub, icon, color }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-medium text-gray-400">{label}</span>
        <span className={color}>{icon}</span>
      </div>
      <p className="text-[22px] font-bold text-gray-900 leading-none">
        {value}
        {sub && <span className="text-[13px] font-normal text-gray-400 ml-1.5">{sub}</span>}
      </p>
    </div>
  );
}

export function ExamResultsView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [filterSubj, setFilterSubj] = useState<string>('ALL');
  const [filterSort, setFilterSort] = useState<string>('highest');
  const [filterAttendance, setFilterAttendance] = useState<string>('ALL');

  useEffect(() => { fetchResults(); }, [id]);

  const fetchResults = async () => {
    try {
      const res = await api.get(`/exams/${id}/results`);
      setData(res.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load exam results');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!data) return;
    const nextState = !data.exam.isResultPublished;
    const msg = nextState
      ? 'Publish results? Students will immediately see scores, ranks, and mistakes.'
      : 'Unpublish results? Students will no longer see their scores.';
    if (!window.confirm(msg)) return;

    setPublishing(true);
    try {
      const res = await api.post(`/exams/${id}/publish-result`, { publish: nextState });
      toast.success(res.data.message || 'Updated result publication status');
      setData({ ...data, exam: { ...data.exam, isResultPublished: nextState } });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update result publication');
    } finally {
      setPublishing(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!data) return;
    const headers = ['Rank', 'Student Name', 'Student ID', 'Status', 'Total Score', 'Correct', 'Wrong', 'Unattempted', 'Percentile'];
    const subjects = ['PHYSICS', 'CHEMISTRY', data.exam.group === 'PCM' ? 'MATHS' : 'BIOLOGY'];
    subjects.forEach(s => {
      headers.push(`${s} Score`, `${s} Correct`, `${s} Wrong`, `${s} Unattempted`);
    });

    const rows = processedRoster.map(r => {
      const row = [
        r.attended && r.rank ? r.rank : 'N/A',
        r.name,
        r.studentCpId,
        r.attended ? 'Present' : 'Absent',
        r.attended ? r.totalScore : 0,
        r.attended ? r.correctCount : 0,
        r.attended ? r.wrongCount : 0,
        r.attended ? r.unattemptedCount : 0,
        r.attended && r.percentile !== null ? r.percentile : 'N/A',
      ];
      subjects.forEach(s => {
        const sData = r.subjectScores[s];
        if (sData) {
          row.push(sData.score, sData.correct, sData.wrong, sData.unattempted);
        } else {
          row.push(0, 0, 0, 0);
        }
      });
      return row;
    });

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Auto-adjust column widths based on headers
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length, 10) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    
    // Ensure filename is safe
    const safeTitle = data.exam.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    XLSX.writeFile(wb, `${safeTitle}_results.xlsx`);
  };

  if (loading || !data) {
    return <DashboardLayout><LoadingSpinner fullPage /></DashboardLayout>;
  }

  const { exam, summary, roster } = data;
  const subjects = ['PHYSICS', 'CHEMISTRY', exam.group === 'PCM' ? 'MATHS' : 'BIOLOGY'];

  const processedRoster = [...roster].filter(r => {
    if (filterAttendance === 'PRESENT') return r.attended;
    if (filterAttendance === 'ABSENT') return !r.attended;
    return true;
  }).sort((a, b) => {
    if (filterSort === 'highest') return b.totalScore - a.totalScore;
    if (filterSort === 'lowest') return a.totalScore - b.totalScore;
    if (filterSort === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-5xl">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate(-1)}
              className="mt-0.5 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[20px] font-bold text-gray-900 tracking-tight leading-none">
                  {exam.title}
                </h1>
                <Badge variant="purple" size="sm">{exam.group}</Badge>
              </div>
              <p className="text-[13px] text-gray-400 mt-1.5">{exam.className} · Results</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              leftIcon={<Download size={14} />}
              onClick={handleDownloadExcel}
            >
              Export Excel
            </Button>
            <Button
              variant={exam.isResultPublished ? 'outline' : 'success'}
              size="md"
              isLoading={publishing}
              leftIcon={exam.isResultPublished ? <EyeOff size={14} /> : <Share2 size={14} />}
              onClick={handleTogglePublish}
            >
              {exam.isResultPublished ? 'Unpublish Results' : 'Publish Results'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Attendance"
            value={summary.totalAttended}
            sub={`/ ${summary.totalStudents}`}
            icon={<Users size={15} />}
            color="text-blue-500"
          />
          <StatCard
            label="Highest Score"
            value={summary.highestScore}
            sub={`/ ${exam.maxMarks}`}
            icon={<Trophy size={15} />}
            color="text-amber-500"
          />
          <StatCard
            label="Class Average"
            value={summary.averageScore}
            sub="marks"
            icon={<Award size={15} />}
            color="text-purple-500"
          />
          <StatCard
            label="Publication"
            value={exam.isResultPublished ? 'Published' : 'Hidden'}
            icon={exam.isResultPublished ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            color={exam.isResultPublished ? 'text-emerald-500' : 'text-amber-500'}
          />
        </div>

        {/* Action Bar (Filters & Sorting) */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex flex-wrap items-center gap-2 p-1 bg-white border border-gray-100 rounded-lg shadow-sm">
            <button
              onClick={() => setFilterSubj('ALL')}
              className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${filterSubj === 'ALL' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              Overall
            </button>
            {subjects.map(s => (
              <button
                key={s}
                onClick={() => setFilterSubj(s)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${filterSubj === s ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterAttendance}
              onChange={e => setFilterAttendance(e.target.value)}
              className="text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 font-medium focus:outline-none focus:border-blue-300"
            >
              <option value="ALL">All Students</option>
              <option value="PRESENT">Present Only</option>
              <option value="ABSENT">Absent Only</option>
            </select>
            <select
              value={filterSort}
              onChange={e => setFilterSort(e.target.value)}
              className="text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 font-medium focus:outline-none focus:border-blue-300"
            >
              <option value="highest">Sort: Highest Marks</option>
              <option value="lowest">Sort: Lowest Marks</option>
              <option value="name">Sort: Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center w-14">Rank</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Student</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">
                    {filterSubj === 'ALL' ? 'Score' : `${filterSubj.charAt(0) + filterSubj.slice(1).toLowerCase()}`}
                  </th>
                  {filterSubj === 'ALL' && (
                    <th className="py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">
                      %ile
                    </th>
                  )}
                  <th className="py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center">
                    ✓ / ✗ / —
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {processedRoster.map((r) => {
                  const subjData = filterSubj === 'ALL' ? null : r.subjectScores[filterSubj];
                  const score = filterSubj === 'ALL' ? r.totalScore : (subjData?.score ?? 0);
                  const correct = filterSubj === 'ALL' ? r.correctCount : (subjData?.correct ?? 0);
                  const wrong = filterSubj === 'ALL' ? r.wrongCount : (subjData?.wrong ?? 0);
                  const unatt = filterSubj === 'ALL' ? r.unattemptedCount : (subjData?.unattempted ?? 0);

                  return (
                    <tr
                      key={r.studentCpId}
                      className={[
                        'hover:bg-gray-50/50 transition-colors',
                        !r.attended ? 'opacity-50' : '',
                      ].join(' ')}
                    >
                      {/* Rank */}
                      <td className="py-3.5 px-4 text-center">
                        {r.attended && r.rank ? (
                          <span className={[
                            'inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold',
                            r.rank === 1 ? 'bg-amber-100 text-amber-800' :
                            r.rank === 2 ? 'bg-slate-100 text-slate-700' :
                            r.rank === 3 ? 'bg-orange-100 text-orange-800' :
                            'text-gray-500 bg-gray-50',
                          ].join(' ')}>
                            {r.rank}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-[13px]">—</span>
                        )}
                      </td>

                      {/* Student */}
                      <td className="py-3.5 px-4">
                        <p className="text-[13px] font-semibold text-gray-900">{r.name}</p>
                        <p className="text-[11px] text-gray-400 font-mono">{r.studentCpId}</p>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {r.attended
                          ? <Badge variant="green" size="sm">Attended</Badge>
                          : <Badge variant="default" size="sm">Absent</Badge>
                        }
                      </td>

                      {/* Score */}
                      <td className="py-3.5 px-4 text-right">
                        {r.attended ? (
                          <span className="text-[15px] font-bold text-gray-900 font-mono">
                            {score}
                            {filterSubj === 'ALL' && (
                              <span className="text-[11px] font-normal text-gray-400 ml-1">/{r.maxMarks}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-300 font-mono text-[13px]">0</span>
                        )}
                      </td>

                      {/* Percentile */}
                      {filterSubj === 'ALL' && (
                        <td className="py-3.5 px-4 text-right">
                          {r.attended && r.percentile !== null ? (
                            <Badge variant="blue" size="sm">{r.percentile.toFixed(1)}%ile</Badge>
                          ) : (
                            <span className="text-gray-300 text-[12px]">—</span>
                          )}
                        </td>
                      )}

                      {/* Stats */}
                      <td className="py-3.5 px-4 text-center">
                        {r.attended ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-100">
                              <CheckCircle2 size={12} /> {correct}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded font-medium border border-red-100">
                              <AlertCircle size={12} /> {wrong}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-medium border border-gray-200">
                              <span className="w-1.5 h-0.5 bg-gray-400 rounded-full" /> {unatt}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-[12px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

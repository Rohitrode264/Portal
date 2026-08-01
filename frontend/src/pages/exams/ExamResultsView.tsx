import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { api } from '../../lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy, Users, Award, CheckCircle2, AlertCircle, Share2, EyeOff } from 'lucide-react';
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

  if (loading || !data) {
    return <DashboardLayout><LoadingSpinner fullPage /></DashboardLayout>;
  }

  const { exam, summary, roster } = data;
  const subjects = ['PHYSICS', 'CHEMISTRY', exam.group === 'PCM' ? 'MATHS' : 'BIOLOGY'];

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

        {/* Subject Filter Tabs */}
        <div className="bg-white border border-gray-100 rounded-xl p-1.5 flex items-center gap-1 overflow-x-auto shadow-sm">
          {['ALL', ...subjects].map(subj => (
            <button
              key={subj}
              onClick={() => setFilterSubj(subj)}
              className={[
                'px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all',
                filterSubj === subj
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
              ].join(' ')}
            >
              {subj === 'ALL' ? 'Overall' : subj.charAt(0) + subj.slice(1).toLowerCase()}
            </button>
          ))}
          <div className="ml-auto pl-3 shrink-0">
            <span className="text-[12px] text-gray-400 font-mono">{roster.length} students</span>
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
                {roster.map((r) => {
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
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-mono bg-gray-50 px-2.5 py-1 rounded-lg">
                            <span className="text-emerald-600 font-bold">+{correct}</span>
                            <span className="text-gray-200">/</span>
                            <span className="text-red-500 font-bold">−{wrong}</span>
                            <span className="text-gray-200">/</span>
                            <span className="text-gray-400">{unatt}</span>
                          </span>
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

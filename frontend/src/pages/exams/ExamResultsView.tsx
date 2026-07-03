import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { api } from '../../lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Trophy, Users, Award, CheckCircle2, AlertCircle, Share2, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

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

export function ExamResultsView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [filterSubj, setFilterSubj] = useState<string>('ALL');

  useEffect(() => {
    fetchResults();
  }, [id]);

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
    const promptMsg = nextState
      ? 'Are you sure you want to PUBLISH these results? Students will immediately be able to view their scores, ranks, percentiles, and detailed question mistakes.'
      : 'Are you sure you want to UNPUBLISH these results? Students will no longer see their scores.';

    if (!window.confirm(promptMsg)) return;

    setPublishing(true);
    try {
      const res = await api.post(`/exams/${id}/publish-result`, { publish: nextState });
      toast.success(res.data.message || 'Updated result publication status');
      setData({
        ...data,
        exam: {
          ...data.exam,
          isResultPublished: nextState
        }
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update result publication');
    } finally {
      setPublishing(false);
    }
  };

  if (loading || !data) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-gray-300" size={28} />
        </div>
      </DashboardLayout>
    );
  }

  const { exam, summary, roster } = data;
  const subjects = ['PHYSICS', 'CHEMISTRY', exam.group === 'PCM' ? 'MATHS' : 'BIOLOGY'];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={16} className="text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900">{exam.title} — Results</h1>
                <span className="text-xs font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md">
                  {exam.group}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{exam.className}</p>
            </div>
          </div>

          {/* Publish Result Button */}
          <button
            onClick={handleTogglePublish}
            disabled={publishing}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm ${
              exam.isResultPublished
                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {publishing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : exam.isResultPublished ? (
              <>
                <EyeOff size={15} />
                <span>Result Published (Click to Unpublish)</span>
              </>
            ) : (
              <>
                <Share2 size={15} />
                <span>Publish Result to Students</span>
              </>
            )}
          </button>
        </div>

        {/* Summary Stats Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-medium">Total Attended</span>
              <Users size={16} className="text-blue-500" />
            </div>
            <p className="text-xl font-bold text-gray-900">
              {summary.totalAttended} <span className="text-xs font-normal text-gray-400">/ {summary.totalStudents}</span>
            </p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-medium">Highest Score</span>
              <Trophy size={16} className="text-amber-500" />
            </div>
            <p className="text-xl font-bold text-gray-900">
              {summary.highestScore} <span className="text-xs font-normal text-gray-400">/ {exam.maxMarks}</span>
            </p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-medium">Class Average</span>
              <Award size={16} className="text-purple-500" />
            </div>
            <p className="text-xl font-bold text-gray-900">
              {summary.averageScore} <span className="text-xs font-normal text-gray-400">marks</span>
            </p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-medium">Publication Status</span>
              {exam.isResultPublished ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-amber-500" />}
            </div>
            <p className="text-sm font-bold mt-1">
              {exam.isResultPublished ? (
                <span className="text-emerald-600">Visible to Students</span>
              ) : (
                <span className="text-amber-600">Hidden (Draft)</span>
              )}
            </p>
          </div>
        </div>

        {/* Filter subject tab if needed */}
        <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setFilterSubj('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterSubj === 'ALL' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Overall Ranking & Percentiles
            </button>
            {subjects.map(s => (
              <button
                key={s}
                onClick={() => setFilterSubj(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterSubj === s ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {s.charAt(0) + s.slice(1).toLowerCase()} Only
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400 px-2 font-mono">{roster.length} students listed</span>
        </div>

        {/* Roster Table */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">
                    {filterSubj === 'ALL' ? 'Total Score' : `${filterSubj} Score`}
                  </th>
                  {filterSubj === 'ALL' && <th className="py-3.5 px-4 text-right">Percentile</th>}
                  <th className="py-3.5 px-4 text-center">Correct / Wrong / Unattempted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {roster.map((r) => {
                  const subjData = filterSubj === 'ALL' ? null : r.subjectScores[filterSubj];
                  const displayScore = filterSubj === 'ALL' ? r.totalScore : (subjData?.score ?? 0);
                  const displayCorrect = filterSubj === 'ALL' ? r.correctCount : (subjData?.correct ?? 0);
                  const displayWrong = filterSubj === 'ALL' ? r.wrongCount : (subjData?.wrong ?? 0);
                  const displayUnattempted = filterSubj === 'ALL' ? r.unattemptedCount : (subjData?.unattempted ?? 0);

                  return (
                    <tr
                      key={r.studentCpId}
                      className={`hover:bg-gray-50/50 transition-colors ${!r.attended ? 'opacity-50 bg-gray-50/20' : ''}`}
                    >
                      {/* Rank */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold">
                        {r.attended && r.rank ? (
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs ${
                              r.rank === 1 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              r.rank === 2 ? 'bg-slate-100 text-slate-700 border border-slate-300' :
                              r.rank === 3 ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                              'text-gray-600'
                            }`}
                          >
                            {r.rank}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Student */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-gray-900">{r.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{r.studentCpId}</p>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {r.attended ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 size={13} /> Attended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                            Unattended
                          </span>
                        )}
                      </td>

                      {/* Score */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        {r.attended ? (
                          <span className="font-bold text-gray-900 text-base">
                            {displayScore} <span className="text-xs font-normal text-gray-400">/ {filterSubj === 'ALL' ? r.maxMarks : '—'}</span>
                          </span>
                        ) : (
                          <span className="text-gray-300 font-mono">0</span>
                        )}
                      </td>

                      {/* Percentile */}
                      {filterSubj === 'ALL' && (
                        <td className="py-3.5 px-4 text-right font-mono">
                          {r.attended && r.percentile !== null ? (
                            <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg text-xs">
                              {r.percentile.toFixed(2)}%ile
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      )}

                      {/* Stats */}
                      <td className="py-3.5 px-4 text-center">
                        {r.attended ? (
                          <div className="inline-flex items-center gap-2 text-xs font-mono bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                            <span className="text-emerald-600 font-bold">+{displayCorrect}</span>
                            <span className="text-gray-300">/</span>
                            <span className="text-red-500 font-bold">-{displayWrong}</span>
                            <span className="text-gray-300">/</span>
                            <span className="text-gray-400">○{displayUnattempted}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
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

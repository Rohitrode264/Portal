import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { api } from '../../lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Trophy, CheckCircle2, XCircle, HelpCircle, Filter, Atom, FlaskConical, Calculator, Leaf } from 'lucide-react';
import toast from 'react-hot-toast';

type DetailedQuestion = {
  _id: string;
  subject: string;
  text: string;
  options: string[];
  correctAnswer: string;
  selectedOption: string | null;
  marksAwarded: number;
  maxMarks: number;
  difficulty: string;
  diagramUrl?: string;
  diagramUrls?: string[];
};

type ResultData = {
  exam: {
    _id: string;
    title: string;
    className: string;
    group: string;
    duration: number;
    scheduledAt: string;
    maxMarks: number;
  };
  summary: {
    status: string;
    totalScore: number;
    maxMarks: number;
    percentage: number;
    rank: number;
    totalAttended: number;
    percentile: number;
    correctCount: number;
    wrongCount: number;
    unattemptedCount: number;
    subjectScores: Record<string, { score: number; correct: number; wrong: number; unattempted: number; maxMarks: number }>;
  };
  questions: DetailedQuestion[];
};

const SUBJECT_ICON: Record<string, ReactNode> = {
  PHYSICS: <Atom size={16} />,
  CHEMISTRY: <FlaskConical size={16} />,
  MATHS: <Calculator size={16} />,
  BIOLOGY: <Leaf size={16} />,
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export function StudentResultView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterSubj, setFilterSubj] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CORRECT' | 'WRONG' | 'UNATTEMPTED'>('ALL');

  useEffect(() => {
    fetchResult();
  }, [id]);

  const fetchResult = async () => {
    try {
      const res = await api.get(`/student/exams/${id}/result`);
      setData(res.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load test result');
      navigate('/dashboard');
    } finally {
      setLoading(false);
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

  const { exam, summary, questions } = data;
  const subjects = Object.keys(summary.subjectScores);

  const filteredQuestions = questions.filter(q => {
    if (filterSubj !== 'ALL' && q.subject !== filterSubj) return false;
    if (filterStatus === 'CORRECT' && q.selectedOption !== q.correctAnswer) return false;
    if (filterStatus === 'WRONG' && (q.selectedOption === null || q.selectedOption === q.correctAnswer)) return false;
    if (filterStatus === 'UNATTEMPTED' && q.selectedOption !== null) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Top navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={16} className="text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">{exam.title} — Performance Report</h1>
              <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">
                Result Published ✓
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {exam.group} · {exam.className}
            </p>
          </div>
        </div>

        {/* Score Banner */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            {/* Total Score */}
            <div className="md:pr-6">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Score</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-4xl font-extrabold text-gray-900 font-mono">{summary.totalScore}</span>
                <span className="text-sm font-medium text-gray-400 font-mono">/ {summary.maxMarks}</span>
              </div>
              <p className="text-xs font-medium text-emerald-600 mt-1">{summary.percentage}% Accuracy</p>
            </div>

            {/* Rank & Percentile */}
            <div className="pt-4 md:pt-0 md:px-6">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Class Rank</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold text-gray-900 font-mono">#{summary.rank}</span>
                <span className="text-xs text-gray-400 font-mono">of {summary.totalAttended} students</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-semibold font-mono">
                <Trophy size={13} /> {summary.percentile.toFixed(2)}%ile
              </div>
            </div>

            {/* Attempt Summary */}
            <div className="pt-4 md:pt-0 md:px-6 col-span-1 md:col-span-2 flex flex-col justify-center">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Question Breakdown</span>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-emerald-600 text-xs font-semibold">
                    <CheckCircle2 size={14} /> Correct
                  </div>
                  <p className="text-lg font-bold text-emerald-700 font-mono mt-0.5">{summary.correctCount}</p>
                </div>

                <div className="bg-red-50/60 border border-red-100 rounded-xl p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-red-600 text-xs font-semibold">
                    <XCircle size={14} /> Incorrect
                  </div>
                  <p className="text-lg font-bold text-red-700 font-mono mt-0.5">{summary.wrongCount}</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-600 text-xs font-semibold">
                    <HelpCircle size={14} /> Skipped
                  </div>
                  <p className="text-lg font-bold text-gray-700 font-mono mt-0.5">{summary.unattemptedCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subject Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subjects.map(s => {
            const sc = summary.subjectScores[s] || { score: 0, correct: 0, wrong: 0, unattempted: 0, maxMarks: 0 };
            return (
              <div key={s} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wide">
                    <span className="p-1.5 bg-gray-50 rounded-lg text-gray-600">{SUBJECT_ICON[s]}</span>
                    <span>{s}</span>
                  </div>
                  <span className="text-sm font-extrabold font-mono text-gray-900">
                    {sc.score} <span className="text-xs font-normal text-gray-400">/ {sc.maxMarks}</span>
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-600 font-medium">✓ {sc.correct}</span>
                  <span className="text-red-500 font-medium">✗ {sc.wrong}</span>
                  <span className="text-gray-400">○ {sc.unattempted}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Questions Header & Filters */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Filter size={15} className="text-gray-400" /> Question-by-Question Analysis
            </h2>
            <span className="text-xs text-gray-400 font-mono">Showing {filteredQuestions.length} of {questions.length}</span>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-gray-50">
            {/* Subject Filter */}
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                onClick={() => setFilterSubj('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  filterSubj === 'ALL' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                All Subjects
              </button>
              {subjects.map(s => (
                <button
                  key={s}
                  onClick={() => setFilterSubj(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    filterSubj === s ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  filterStatus === 'ALL' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('CORRECT')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  filterStatus === 'CORRECT' ? 'bg-emerald-100 text-emerald-800' : 'text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                Correct
              </button>
              <button
                onClick={() => setFilterStatus('WRONG')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  filterStatus === 'WRONG' ? 'bg-red-100 text-red-800' : 'text-red-600 hover:bg-red-50'
                }`}
              >
                Incorrect
              </button>
              <button
                onClick={() => setFilterStatus('UNATTEMPTED')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  filterStatus === 'UNATTEMPTED' ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                Skipped
              </button>
            </div>
          </div>
        </div>

        {/* Question Cards List */}
        <div className="space-y-4">
          {filteredQuestions.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center text-sm text-gray-400">
              No questions match the selected filters.
            </div>
          ) : (
            filteredQuestions.map((q, idx) => {
              const isCorrect = q.selectedOption === q.correctAnswer;
              const isUnattempted = q.selectedOption === null;
              const isWrong = !isCorrect && !isUnattempted;

              return (
                <div
                  key={q._id}
                  className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${
                    isCorrect ? 'border-emerald-200/80 bg-emerald-50/10' :
                    isWrong ? 'border-red-200/80 bg-red-50/10' :
                    'border-gray-100'
                  }`}
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        Q{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                        {q.subject}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-400 uppercase">
                        {q.difficulty}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold">
                        {isCorrect ? (
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            +{q.marksAwarded} marks
                          </span>
                        ) : isWrong ? (
                          <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            {q.marksAwarded} marks
                          </span>
                        ) : (
                          <span className="text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                            0 marks (Skipped)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Question Text */}
                  <p className="text-sm font-medium text-gray-900 leading-relaxed whitespace-pre-wrap mb-4">
                    {q.text}
                  </p>

                  {q.diagramUrl && !(q.diagramUrls && q.diagramUrls.includes(q.diagramUrl)) && (
                    <div className="mb-4 flex justify-center">
                      <img src={q.diagramUrl} alt="Question diagram" className="max-h-48 object-contain rounded-lg border border-gray-100 shadow-sm bg-white" />
                    </div>
                  )}
                  {q.diagramUrls && q.diagramUrls.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-4 justify-center">
                      {q.diagramUrls.map(url => (
                        <img key={url} src={url} alt="Question diagram" className="max-h-48 object-contain rounded-lg border border-gray-100 shadow-sm bg-white" />
                      ))}
                    </div>
                  )}

                  {/* Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.options.map((opt, oIdx) => {
                      const letter = OPTION_LETTERS[oIdx];
                      const isThisCorrect = letter === q.correctAnswer;
                      const isThisSelected = letter === q.selectedOption;

                      let optCls = "bg-gray-50/80 border-gray-200/80 text-gray-700";
                      let badge = null;

                      if (isThisCorrect && isThisSelected) {
                        optCls = "bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold ring-1 ring-emerald-400";
                        badge = <span className="text-[10px] font-bold bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded">Your Answer ✓</span>;
                      } else if (isThisCorrect) {
                        optCls = "bg-emerald-50/60 border-emerald-300 text-emerald-900 font-semibold";
                        badge = <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Correct Answer</span>;
                      } else if (isThisSelected) {
                        optCls = "bg-red-50 border-red-400 text-red-900 font-semibold ring-1 ring-red-400";
                        badge = <span className="text-[10px] font-bold bg-red-200 text-red-800 px-1.5 py-0.5 rounded">Your Answer ✗</span>;
                      }

                      return (
                        <div
                          key={letter}
                          className={`border rounded-xl p-3 flex items-start justify-between gap-2 text-xs transition-all ${optCls}`}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="font-mono font-bold shrink-0 mt-0.5">{letter}.</span>
                            <span className="leading-relaxed">{opt || `Option ${letter}`}</span>
                          </div>
                          {badge && <div className="shrink-0">{badge}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

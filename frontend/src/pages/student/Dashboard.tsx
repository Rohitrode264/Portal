import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { api } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { Loader2, Clock, CheckCircle2, ChevronRight, Radio, Award, AlertCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

type Exam = {
  _id: string;
  title: string;
  className: string;
  group: string;
  status: 'PUBLISHED' | 'LIVE' | 'COMPLETED';
  duration: number;
  scheduledAt: string;
  loginWindowMinutes?: number;
  isResultPublished?: boolean;
  sessionStatus: 'ABSENT' | 'PRESENT' | 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED' | null;
};

function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date(targetDate).getTime() - new Date().getTime();
      if (diff <= 0) { setTimeLeft(null); clearInterval(timer); return; }
      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / 1000 / 60) % 60),
        s: Math.floor((diff / 1000) % 60)
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return <span className="text-xs text-green-600 font-medium">Starting soon</span>;

  return (
    <span className="text-xs text-gray-500 font-mono tabular-nums">
      {timeLeft.d > 0 && `${timeLeft.d}d `}{String(timeLeft.h).padStart(2,'0')}:{String(timeLeft.m).padStart(2,'0')}:{String(timeLeft.s).padStart(2,'0')}
    </span>
  );
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function StudentDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const navigate = useNavigate();

  useEffect(() => { fetchExams(); }, []);

  const fetchExams = async () => {
    try {
      const res = await api.get('/student/exams');
      setExams(res.data.exams);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-gray-300" size={24} />
        </div>
      </DashboardLayout>
    );
  }

  const upcoming = exams.filter(e => e.status === 'PUBLISHED');
  const live = exams.filter(e => e.status === 'LIVE');
  const completed = exams.filter(e => e.status === 'COMPLETED');

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">

        {/* Page header & tabs */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">My Exams</h1>
            <p className="text-xs text-gray-400 mt-0.5">Your test sessions, schedules, and past performance reports.</p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'active'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <span>Active & Scheduled</span>
              {(live.length + upcoming.length) > 0 && (
                <span className="bg-red-500 text-white px-1.5 py-0.2 rounded-full text-[10px]">
                  {live.length + upcoming.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'past'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <span>Past Exams</span>
              <span className="bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded-full text-[10px]">
                {completed.length}
              </span>
            </button>
          </div>
        </div>

        {/* TAB 1: ACTIVE & SCHEDULED */}
        {activeTab === 'active' && (
          <div className="space-y-8">
            {/* ── LIVE EXAMS ── */}
            {live.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Live now</h2>
                </div>
                <div className="space-y-2.5">
                  {live.map(exam => (
                    <div
                      key={exam._id}
                      onClick={() => exam.sessionStatus !== 'SUBMITTED' && exam.sessionStatus !== 'AUTO_SUBMITTED' && navigate(`/live-exam/${exam._id}`)}
                      className={`bg-white border rounded-2xl p-4 flex items-center justify-between gap-4 transition-all group ${
                        exam.sessionStatus === 'SUBMITTED' || exam.sessionStatus === 'AUTO_SUBMITTED'
                          ? 'border-gray-100 cursor-default opacity-75'
                          : 'border-red-200 cursor-pointer hover:border-red-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          exam.sessionStatus === 'SUBMITTED' || exam.sessionStatus === 'AUTO_SUBMITTED' ? 'bg-gray-50' : 'bg-red-50'
                        }`}>
                          {exam.sessionStatus === 'SUBMITTED' ? (
                            <CheckCircle2 size={18} className="text-green-500" />
                          ) : exam.sessionStatus === 'AUTO_SUBMITTED' ? (
                            <CheckCircle2 size={18} className="text-gray-400" />
                          ) : (
                            <Radio size={18} className="text-red-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{exam.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5 font-mono">
                            {exam.group} · {exam.duration} min
                            {exam.scheduledAt && ` · Ends ${formatTime(new Date(new Date(exam.scheduledAt).getTime() + exam.duration * 60000).toISOString())}`}
                          </p>
                        </div>
                      </div>
                      {exam.sessionStatus === 'SUBMITTED' ? (
                        <span className="shrink-0 text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-xl border border-green-200">Submitted ✓</span>
                      ) : exam.sessionStatus === 'AUTO_SUBMITTED' ? (
                        <span className="shrink-0 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-xl">Auto-submitted</span>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/live-exam/${exam._id}`); }}
                          className="shrink-0 bg-red-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-red-700 transition-colors shadow-sm"
                        >
                          Join Now
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── UPCOMING EXAMS ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Scheduled & Upcoming</h2>
              </div>
              {upcoming.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
                  <Clock size={28} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-500">No upcoming exams scheduled right now.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcoming.map(exam => {
                    const lobbyOpen = exam.scheduledAt
                      ? new Date(new Date(exam.scheduledAt).getTime() - (exam.loginWindowMinutes || 15) * 60000)
                      : null;
                    return (
                      <div
                        key={exam._id}
                        onClick={() => navigate(`/live-exam/${exam._id}`)}
                        className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between gap-4 cursor-pointer hover:border-gray-200 hover:shadow-sm transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                            <Clock size={18} className="text-blue-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{exam.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5 font-mono">
                              {exam.group} · {exam.duration} min
                              {lobbyOpen && ` · Lobby opens ${formatTime(lobbyOpen.toISOString())}`}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <Countdown targetDate={exam.scheduledAt} />
                          <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors ml-auto mt-0.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: PAST EXAMS */}
        {activeTab === 'past' && (
          <section className="space-y-3">
            {completed.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
                <Award size={32} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500">No past exams found.</p>
                <p className="text-xs text-gray-400 mt-0.5">Completed exams will appear here once finished.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completed.map(exam => {
                  const attended = exam.sessionStatus !== null && exam.sessionStatus !== 'ABSENT';

                  return (
                    <div
                      key={exam._id}
                      onClick={() => {
                        if (attended && exam.isResultPublished) {
                          navigate(`/student/result/${exam._id}`);
                        } else if (attended && !exam.isResultPublished) {
                          toast('Result is yet to be published by the coordinator.', { icon: '⏳' });
                        }
                      }}
                      className={`bg-white border rounded-2xl p-4 flex items-center justify-between gap-4 transition-all ${
                        attended && exam.isResultPublished
                          ? 'border-gray-200/80 hover:border-emerald-300 hover:shadow-md cursor-pointer group'
                          : 'border-gray-100 opacity-90 cursor-default'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          attended ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {attended ? <CheckCircle2 size={18} /> : <Calendar size={18} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-gray-900 truncate">{exam.title}</p>
                            <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                              {exam.group}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 font-mono flex items-center gap-2">
                            <span>{exam.duration} min</span>
                            <span>·</span>
                            <span>Completed {new Date(exam.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </p>
                        </div>
                      </div>

                      {/* Status Badges & Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        {attended ? (
                          <>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                              Attended ✓
                            </span>
                            {exam.isResultPublished ? (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  navigate(`/student/result/${exam._id}`);
                                }}
                                className="bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-600 transition-colors shadow-sm flex items-center gap-1.5"
                              >
                                <span>View Result</span>
                                <ChevronRight size={14} />
                              </button>
                            ) : (
                              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                <AlertCircle size={14} className="text-amber-500" />
                                <span>Result yet to be published</span>
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-xl">
                            Unattended
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

      </div>
    </DashboardLayout>
  );
}

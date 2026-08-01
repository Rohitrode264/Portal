import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { api } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { EmptyExamsIllustration, TrophyIllustration } from '../../components/ui/Illustrations';

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

/* ── Countdown ────────────────────────────────────────────────────────────── */
function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft(null); clearInterval(timer); return; }
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff / 3600000) % 24),
        m: Math.floor((diff / 60000) % 60),
        s: Math.floor((diff / 1000) % 60),
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);
  if (!timeLeft) return <span style={{ color: 'var(--success)' }} className="text-[12px] font-semibold">Starting soon</span>;
  return (
    <span style={{ color: 'var(--text-muted)' }} className="text-[12px] font-mono tabular-nums">
      {timeLeft.d > 0 && `${timeLeft.d}d `}{String(timeLeft.h).padStart(2, '0')}:{String(timeLeft.m).padStart(2, '0')}:{String(timeLeft.s).padStart(2, '0')}
    </span>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */
const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const formatTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const getGreeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

/* ── Section label ────────────────────────────────────────────────────────── */
function SectionLabel({ label, icon }: { label: string; icon?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon && <Icon name={icon} size={14} style={{ color: 'var(--text-muted)' }} />}
      <p style={{ color: 'var(--text-muted)' }} className="text-[11px] font-semibold uppercase tracking-widest">{label}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export function StudentDashboard() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const navigate = useNavigate();

  useEffect(() => { fetchExams(); }, []);

  const fetchExams = async () => {
    try {
      const res = await api.get('/student/exams');
      setExams(res.data.exams);
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  };

  const upcoming  = exams.filter(e => e.status === 'PUBLISHED');
  const live      = exams.filter(e => e.status === 'LIVE');
  const completed = exams.filter(e => e.status === 'COMPLETED');
  const firstName = user?.name?.split(' ')[0] || 'Student';
  const todayStr  = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <img src="/images/studying.webp" alt="Studying" className="w-48 opacity-40 object-contain" />
          <p style={{ color: 'var(--text-muted)' }} className="text-[14px]">Loading your dashboard…</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">

        {/* ── Hero Card ───────────────────────────────────────────────── */}
        <div
          className="card overflow-hidden relative"
          style={{ background: 'var(--surface)' }}
        >
          {/* subtle grid pattern */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              opacity: 0.4,
            }}
          />
          <div className="relative flex flex-col sm:flex-row items-center gap-0">
            {/* Text */}
            <div className="flex-1 px-6 py-7">
              <p style={{ color: 'var(--accent)' }} className="text-[12px] font-semibold mb-1 uppercase tracking-wider">{todayStr}</p>
              <h1 style={{ color: 'var(--text)' }} className="text-[24px] font-bold leading-snug">
                {getGreeting()}, {firstName}! 👋
              </h1>
              <p style={{ color: 'var(--text-muted)' }} className="text-[14px] mt-1.5">
                {live.length > 0
                  ? `🔴 You have ${live.length} live exam${live.length > 1 ? 's' : ''} right now!`
                  : upcoming.length > 0
                    ? `📅 ${upcoming.length} exam${upcoming.length > 1 ? 's' : ''} scheduled ahead.`
                    : `✅ No upcoming exams. Great time to review your past results!`}
              </p>
              {/* Stats row */}
              <div className="flex flex-wrap gap-2 mt-5">
                <StatChip icon="task_alt" label={`${completed.length} Completed`} color="var(--success)" bgColor="var(--success-light)" />
                <StatChip icon="schedule" label={`${upcoming.length} Upcoming`} color="var(--accent)" bgColor="var(--accent-light)" />
                {live.length > 0 && <LiveChip count={live.length} />}
              </div>
            </div>
            {/* Illustration */}
            <div className="shrink-0 w-72 h-56 p-3 hidden sm:block" style={{ color: 'var(--text)' }}>
              <img src="/images/studying.jpg" alt="Studying" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        {/* ── Tab Bar ─────────────────────────────────────────────────── */}
        <div
          style={{ background: 'var(--surface-sub)' }}
          className="flex items-center gap-0.5 p-0.5 rounded-xl w-fit"
        >
          {(['active', 'past'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={activeTab === tab
                ? { background: 'var(--surface)', color: 'var(--text)', boxShadow: '0 1px 3px rgb(0 0 0/.08)' }
                : { color: 'var(--text-muted)' }
              }
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all"
            >
              {tab === 'active' ? 'Active' : 'Past'}
              {tab === 'active' && (live.length + upcoming.length) > 0 && (
                <span style={{ background: 'var(--accent)', color: 'white' }}
                  className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center leading-none">
                  {live.length + upcoming.length}
                </span>
              )}
              {tab === 'past' && completed.length > 0 && (
                <span style={{ color: 'var(--text-muted)' }} className="text-[11px]">({completed.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* ── ACTIVE TAB ────────────────────────────────────────────── */}
        {activeTab === 'active' && (
          <div className="space-y-5 stagger">

            {/* Live exams */}
            {live.length > 0 && (
              <section>
                <SectionLabel label="Live now" icon="sensors" />
                <div className="space-y-2">
                  {live.map(exam => {
                    const submitted = exam.sessionStatus === 'SUBMITTED' || exam.sessionStatus === 'AUTO_SUBMITTED';
                    return (
                      <ExamCard
                        key={exam._id}
                        title={exam.title}
                        sub={`${exam.group} · ${exam.duration} min${exam.scheduledAt ? ` · Ends ${formatTime(new Date(new Date(exam.scheduledAt).getTime() + exam.duration * 60000).toISOString())}` : ''}`}
                        icon={submitted ? 'task_alt' : 'sensors'}
                        iconBg={submitted ? 'var(--success-light)' : 'var(--danger-light)'}
                        iconColor={submitted ? 'var(--success)' : 'var(--danger)'}
                        borderColor={submitted ? 'var(--border)' : 'var(--danger-muted)'}
                        onClick={() => !submitted && navigate(`/live-exam/${exam._id}`)}
                        disabled={submitted}
                        right={
                          submitted
                            ? <Badge variant="green" size="sm" dot>Submitted</Badge>
                            : <Button variant="danger" size="sm" onClick={e => { e.stopPropagation(); navigate(`/live-exam/${exam._id}`); }}>Join Now</Button>
                        }
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* Upcoming */}
            <section>
              <SectionLabel label="Scheduled & Upcoming" icon="event" />
              {upcoming.length === 0 ? (
                <EmptyCard
                  illustration={<EmptyExamsIllustration className="w-28 h-28 mx-auto mb-3" />}
                  title="No upcoming exams"
                  sub="Your scheduled exams will appear here."
                />
              ) : (
                <div className="space-y-2">
                  {upcoming.map(exam => {
                    const lobbyOpen = exam.scheduledAt
                      ? new Date(new Date(exam.scheduledAt).getTime() - (exam.loginWindowMinutes || 15) * 60000)
                      : null;
                    return (
                      <ExamCard
                        key={exam._id}
                        title={exam.title}
                        sub={`${exam.group} · ${exam.duration} min${lobbyOpen ? ` · Lobby ${formatTime(lobbyOpen.toISOString())}` : ''}`}
                        icon="event"
                        iconBg="var(--accent-light)"
                        iconColor="var(--accent)"
                        borderColor="var(--border)"
                        onClick={() => navigate(`/live-exam/${exam._id}`)}
                        right={
                          <div className="text-right">
                            <p style={{ color: 'var(--text-sub)' }} className="text-[12px] font-medium">{formatDate(exam.scheduledAt)}</p>
                            <Countdown targetDate={exam.scheduledAt} />
                          </div>
                        }
                      />
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── PAST TAB ─────────────────────────────────────────────── */}
        {activeTab === 'past' && (
          <section>
            {completed.length === 0 ? (
              <EmptyCard
                illustration={<TrophyIllustration className="w-28 h-28 mx-auto mb-3" />}
                title="No past exams yet"
                sub="Completed exams and results will appear here."
              />
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="data-table">
                  <thead>
                    <tr>
                      <th>Exam</th>
                      <th>Group</th>
                      <th>Date</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completed.map(exam => {
                      const attended = exam.sessionStatus !== null && exam.sessionStatus !== 'ABSENT';
                      const canView  = attended && exam.isResultPublished;
                      return (
                        <tr
                          key={exam._id}
                          onClick={() => {
                            if (canView) navigate(`/student/result/${exam._id}`);
                            else if (attended && !exam.isResultPublished) toast('Result not yet published.', { icon: '⏳' });
                          }}
                          className={canView ? 'cursor-pointer' : 'cursor-default'}
                        >
                          <td>
                            <div className="flex items-center gap-2.5">
                              <div style={{ background: attended ? 'var(--success-light)' : 'var(--surface-sub)' }}
                                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
                                <Icon name={attended ? 'task_alt' : 'event_busy'} size={15}
                                  style={{ color: attended ? 'var(--success)' : 'var(--text-muted)' }} />
                              </div>
                              <span style={{ color: 'var(--text)' }} className="font-semibold">{exam.title}</span>
                            </div>
                          </td>
                          <td><Badge variant="indigo" size="sm">{exam.group}</Badge></td>
                          <td style={{ color: 'var(--text-muted)' }} className="font-mono text-[12px]">{formatDate(exam.scheduledAt)}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{exam.duration} min</td>
                          <td>
                            {attended
                              ? <Badge variant="green" size="sm" dot>Attended</Badge>
                              : <Badge variant="default" size="sm">Absent</Badge>}
                          </td>
                          <td>
                            {attended ? (
                              exam.isResultPublished
                                ? <Button variant="outline" size="sm" rightIcon={<Icon name="chevron_right" size={14} />}
                                    onClick={e => { e.stopPropagation(); navigate(`/student/result/${exam._id}`); }}>View</Button>
                                : <Badge variant="amber" size="sm" dot>Pending</Badge>
                            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function StatChip({ icon, label, color, bgColor }: { icon: string; label: string; color: string; bgColor: string }) {
  return (
    <div style={{ background: bgColor, border: `1px solid ${color}22` }}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold">
      <Icon name={icon} size={14} style={{ color }} />
      <span style={{ color }}>{label}</span>
    </div>
  );
}

function LiveChip({ count }: { count: number }) {
  return (
    <div style={{ background: 'var(--danger-light)', border: '1px solid var(--danger-muted)' }}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" style={{ animationName: 'pulse-dot' }} />
      <span style={{ color: 'var(--danger)' }}>{count} Live Now</span>
    </div>
  );
}

function ExamCard({
  title, sub, icon, iconBg, iconColor, borderColor, onClick, disabled, right,
}: {
  title: string; sub: string; icon: string; iconBg: string; iconColor: string;
  borderColor: string; onClick: () => void; disabled?: boolean; right: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      style={{ background: 'var(--surface)', borderColor }}
      className={[
        'card flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 transition-all',
        !disabled && 'cursor-pointer card-hover',
        disabled && 'opacity-65',
      ].join(' ')}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div style={{ background: iconBg }} className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0">
          <Icon name={icon} size={18} style={{ color: iconColor }} />
        </div>
        <div className="min-w-0">
          <p style={{ color: 'var(--text)' }} className="text-[14px] font-semibold truncate">{title}</p>
          <p style={{ color: 'var(--text-muted)' }} className="text-[12px] mt-0.5">{sub}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 justify-end pt-3 sm:pt-0 border-t sm:border-0 border-[var(--border)] w-full sm:w-auto">
        {right}
      </div>
    </div>
  );
}

function EmptyCard({ illustration, title, sub }: { illustration: React.ReactNode; title: string; sub: string }) {
  return (
    <div style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }} className="card py-14 text-center">
      <div style={{ color: 'var(--text)' }}>{illustration}</div>
      <p style={{ color: 'var(--text-sub)' }} className="text-[14px] font-semibold">{title}</p>
      <p style={{ color: 'var(--text-muted)' }} className="text-[13px] mt-1">{sub}</p>
    </div>
  );
}

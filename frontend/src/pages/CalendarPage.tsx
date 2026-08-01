import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/ui/Icon';
import { Badge } from '../components/ui/Badge';
import { CalendarEmptyIllustration } from '../components/ui/Illustrations';
import toast from 'react-hot-toast';

type CalExam = {
  _id: string;
  title: string;
  className: string;
  group: string;
  status: 'DRAFT' | 'LOCKED' | 'PUBLISHED' | 'LIVE' | 'COMPLETED' | 'ARCHIVED';
  duration: number;
  scheduledAt?: string;
};

const STATUS_STYLE: Record<string, { event: string; badge: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'default' }> = {
  PUBLISHED: { event: 'cal-event-blue',   badge: 'blue' },
  LIVE:      { event: 'cal-event-green',  badge: 'green' },
  COMPLETED: { event: 'cal-event-purple', badge: 'purple' },
  LOCKED:    { event: 'cal-event-amber',  badge: 'amber' },
  DRAFT:     { event: 'cal-event-amber',  badge: 'amber' },
  ARCHIVED:  { event: 'cal-event-amber',  badge: 'default' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function CalendarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<CalExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'M' | 'W' | 'D'>('M');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => { fetchExams(); }, []);

  const fetchExams = async () => {
    try {
      const endpoint = user?.role === 'STUDENT' ? '/student/exams' : '/exams';
      const res = await api.get(endpoint);
      const raw = user?.role === 'STUDENT' ? res.data.exams : res.data.exams;
      setExams((raw || []).filter((e: CalExam) => e.scheduledAt));
    } catch {
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  // ── Month grid helpers ──
  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const gridCells: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  // Pad to 6 rows
  while (gridCells.length < 42) gridCells.push(null);

  const getExamsForDay = (day: Date) =>
    exams.filter(e => e.scheduledAt && isSameDay(new Date(e.scheduledAt), day));

  const today = new Date();

  // ── Week view helpers ──
  const getWeekStart = (d: Date) => {
    const s = new Date(d);
    s.setDate(s.getDate() - s.getDay());
    s.setHours(0, 0, 0, 0);
    return s;
  };
  const weekStart = getWeekStart(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  // ── Day view ──
  const dayExams = exams.filter(e => e.scheduledAt && isSameDay(new Date(e.scheduledAt), currentDate));

  const navigate_ = (dir: 1 | -1) => {
    const d = new Date(currentDate);
    if (view === 'M') d.setMonth(d.getMonth() + dir);
    else if (view === 'W') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const handleExamClick = (exam: CalExam) => {
    if (user?.role === 'STUDENT') navigate(`/live-exam/${exam._id}`);
    else navigate(`/exams/${exam._id}`);
  };

  const upcomingExams = exams
    .filter(e => e.scheduledAt && new Date(e.scheduledAt) >= today)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
    .slice(0, 8);

  // ── Title ──
  const viewTitle = view === 'M'
    ? `${MONTHS[month]} ${year}`
    : view === 'W'
      ? `${formatDateLabel(weekDays[0])} — ${formatDateLabel(weekDays[6])}`
      : formatDateLabel(currentDate);

  return (
    <DashboardLayout>
      <div className="space-y-5 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-page-title">Calendar</h1>
            <p className="text-secondary mt-1">Scheduled exams and upcoming sessions.</p>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl p-0.5" style={{ background: 'var(--surface-sub)' }}>
              {(['M', 'W', 'D'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    background: view === v ? 'var(--surface)' : 'transparent',
                    color: view === v ? 'var(--text)' : 'var(--text-muted)',
                    boxShadow: view === v ? 'var(--card-shadow)' : 'none'
                  }}
                  className="w-8 h-7 rounded-lg text-[13px] font-semibold transition-all hover:opacity-80"
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate_(-1)}
                style={{ color: 'var(--text-muted)' }}
                className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors hover:bg-[var(--surface-sub)]"
              >
                <Icon name="chevron_left" size={18} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                style={{ color: 'var(--text-sub)' }}
                className="px-3 h-8 text-[12px] font-medium rounded-xl transition-colors hover:bg-[var(--surface-sub)]"
              >
                Today
              </button>
              <button
                onClick={() => navigate_(1)}
                style={{ color: 'var(--text-muted)' }}
                className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors hover:bg-[var(--surface-sub)]"
              >
                <Icon name="chevron_right" size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-5 items-start">

          {/* ── Calendar Grid ── */}
          <div className="flex-1 min-w-0">
            {/* Period label */}
            <p className="text-[14px] font-semibold mb-3" style={{ color: 'var(--text)' }}>{viewTitle}</p>

            {loading ? (
              <div
                style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}
                className="card p-20 flex items-center justify-center"
              >
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: 28, color: 'var(--text-muted)' }}>progress_activity</span>
              </div>
            ) : view === 'M' ? (
              /* ── MONTH VIEW ── */
              <div className="card overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}>
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border)' }}>
                  {DAYS.map(d => (
                    <div key={d} style={{ color: 'var(--text-muted)' }} className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide">
                      {d}
                    </div>
                  ))}
                </div>
                {/* Cells */}
                <div className="grid grid-cols-7 divide-x divide-y" style={{ borderColor: 'var(--border)' }}>
                  {gridCells.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} className="h-28" style={{ background: 'var(--surface-sub)', opacity: 0.5 }} />;
                    const dayExamsList = getExamsForDay(day);
                    const isToday = isSameDay(day, today);
                    const isSelected = isSameDay(day, currentDate);
                    const isCurrentMonth = day.getMonth() === month;
                    return (
                      <div
                        key={idx}
                        onClick={() => { setCurrentDate(day); setView('D'); }}
                        className="h-28 p-2 cursor-pointer transition-colors hover:bg-[var(--surface-sub)]"
                        style={{ background: !isCurrentMonth ? 'var(--bg)' : 'transparent' }}
                      >
                        <div className={[
                          'w-6 h-6 flex items-center justify-center rounded-full text-[12px] font-semibold mb-1.5'
                        ].join(' ')}
                        style={{
                          background: isToday ? 'var(--accent)' : isSelected ? 'var(--accent-light)' : 'transparent',
                          color: isToday ? 'white' : isSelected ? 'var(--accent)' : isCurrentMonth ? 'var(--text)' : 'var(--text-muted)'
                        }}>
                          {day.getDate()}
                        </div>
                        <div className="space-y-0.5 overflow-hidden">
                          {dayExamsList.slice(0, 2).map(e => (
                            <div
                              key={e._id}
                              onClick={ev => { ev.stopPropagation(); handleExamClick(e); }}
                              className={`cal-event ${STATUS_STYLE[e.status]?.event || 'cal-event-blue'}`}
                              title={e.title}
                            >
                              {formatTime(e.scheduledAt!)} {e.title}
                            </div>
                          ))}
                          {dayExamsList.length > 2 && (
                            <p className="text-[10px] pl-1" style={{ color: 'var(--text-muted)' }}>+{dayExamsList.length - 2} more</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : view === 'W' ? (
              /* ── WEEK VIEW ── */
              <div className="card overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}>
                <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border)' }}>
                  {weekDays.map((d, i) => {
                    const isToday = isSameDay(d, today);
                    return (
                      <div key={i} className="py-3 text-center border-r last:border-r-0" style={{ borderColor: 'var(--border)' }}>
                        <p className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{DAYS[d.getDay()]}</p>
                        <div className="w-7 h-7 mx-auto mt-1 flex items-center justify-center rounded-full text-[13px] font-semibold"
                          style={{
                            background: isToday ? 'var(--accent)' : 'transparent',
                            color: isToday ? 'white' : 'var(--text)'
                          }}>
                          {d.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-7 divide-x min-h-[280px]" style={{ borderColor: 'var(--border)' }}>
                  {weekDays.map((d, i) => {
                    const dayList = getExamsForDay(d);
                    return (
                      <div key={i} className="p-2 space-y-1.5" style={{ background: dayList.length === 0 ? 'var(--bg)' : 'transparent' }}>
                        {dayList.map(e => (
                          <div
                            key={e._id}
                            onClick={() => handleExamClick(e)}
                            className={`cal-event py-1.5 px-2 rounded-lg text-[11px] leading-snug cursor-pointer ${STATUS_STYLE[e.status]?.event || 'cal-event-blue'}`}
                          >
                            <p className="font-semibold truncate">{e.title}</p>
                            <p className="opacity-75">{formatTime(e.scheduledAt!)}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ── DAY VIEW ── */
              <div className="card" style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>{formatDateLabel(currentDate)}</p>
                </div>
                {dayExams.length === 0 ? (
                  <div className="card p-12 text-center border-0" style={{ background: 'transparent' }}>
                    <CalendarEmptyIllustration className="w-24 h-24 mx-auto mb-3" />
                    <p style={{ color: 'var(--text-sub)' }} className="text-[14px] font-medium">No exams scheduled</p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {dayExams.map(e => {
                      const st = STATUS_STYLE[e.status] || STATUS_STYLE.DRAFT;
                      return (
                        <div
                          key={e._id}
                          onClick={() => handleExamClick(e)}
                          className="px-5 py-4 flex items-center gap-4 cursor-pointer transition-colors hover:bg-[var(--surface-sub)]"
                        >
                          <div className={`w-1 h-10 rounded-full ${st.event.replace('cal-event-', 'bg-').replace('blue','indigo-400').replace('green','emerald-400').replace('purple','purple-400').replace('amber','amber-400').replace('red','red-400')}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--text)' }}>{e.title}</p>
                            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{e.className} · {e.group} · {e.duration} min</p>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            <p className="text-[13px] font-medium" style={{ color: 'var(--text-sub)' }}>{formatTime(e.scheduledAt!)}</p>
                            <Badge variant={st.badge} size="sm">{e.status}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Sidebar: Upcoming ── */}
          <div className="hidden xl:block w-64 shrink-0 space-y-3">
            <p className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Upcoming</p>
            {upcomingExams.length === 0 ? (
              <div className="card p-5 text-center" style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}>
                <CalendarEmptyIllustration className="w-20 h-20 mx-auto mb-2" />
                <p style={{ color: 'var(--text-muted)' }} className="text-[13px]">No upcoming exams</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingExams.map(e => {
                  const st = STATUS_STYLE[e.status] || STATUS_STYLE.DRAFT;
                  const d = new Date(e.scheduledAt!);
                  return (
                    <div
                      key={e._id}
                      onClick={() => handleExamClick(e)}
                      className="card p-3.5 cursor-pointer card-hover"
                      style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-bold ${st.event}`}>
                          {d.getDate()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>{e.title}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {MONTHS[d.getMonth()].slice(0,3)} {d.getDate()} · {formatTime(e.scheduledAt!)}
                          </p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{e.group} · {e.duration} min</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

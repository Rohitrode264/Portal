import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { api } from '../../lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

type RosterItem = {
  studentCpId: string;
  name: string;
  whatsappNumber: string;
  status: 'ABSENT' | 'PRESENT' | 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED';
  markedPresentAt?: string;
  startedAt?: string;
  submittedAt?: string;
  tabSwitchCount: number;
  heartbeatLastSeen?: string;
};

const STATUS_BADGE: Record<string, { variant: any; label: string }> = {
  ABSENT:       { variant: 'default', label: 'Absent' },
  PRESENT:      { variant: 'blue',    label: 'Verified' },
  IN_PROGRESS:  { variant: 'green',   label: 'Answering' },
  SUBMITTED:    { variant: 'green',   label: 'Submitted' },
  AUTO_SUBMITTED: { variant: 'amber', label: 'Auto-out' },
};

export function LiveMonitor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [roster, setRoster] = useState<RosterItem[]>([]);
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [studentIdInput, setStudentIdInput] = useState('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchData = async () => {
    try {
      if (!exam) {
        const examRes = await api.get(`/exams/${id}`);
        setExam(examRes.data.exam);
      }
      const sessionRes = await api.get(`/live-exams/${id}/status`);
      setRoster(sessionRes.data.roster || []);
      setLoading(false);
    } catch {
      console.error('Failed to load monitor data');
    }
  };

  const handleMarkPresentDirect = async (studentCpId: string) => {
    try {
      await api.post(`/live-exams/attendance`, { examId: id, studentCpId });
      toast.success(`Approved ${studentCpId}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to mark attendance');
    }
  };

  const handleMarkPresent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentIdInput.trim()) return;
    await handleMarkPresentDirect(studentIdInput.trim());
    setStudentIdInput('');
  };

  const handleApproveAllOnline = async () => {
    const onlineWaiting = roster.filter(s => s.status === 'ABSENT' && isOnline(s.heartbeatLastSeen));
    if (onlineWaiting.length === 0) { toast.error('No students currently online & waiting.'); return; }
    try {
      await Promise.all(onlineWaiting.map(s => api.post(`/live-exams/attendance`, { examId: id, studentCpId: s.studentCpId })));
      toast.success(`Approved ${onlineWaiting.length} student(s)`);
      fetchData();
    } catch {
      toast.error('Failed to approve some students.');
    }
  };

  const handleReleaseAllPresent = async () => {
    try {
      const res = await api.post(`/live-exams/${id}/release-all`);
      toast.success(res.data.message || 'Released test papers!');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to release papers');
    }
  };

  const handleEndExam = async () => {
    if (!window.confirm('End this exam for ALL students? Students still answering will be auto-submitted. This cannot be undone.')) return;
    try {
      const res = await api.post(`/live-exams/${id}/end-exam`);
      toast.success(res.data.message || 'Exam ended');
      navigate(-1);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to end exam');
    }
  };

  const isOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    return new Date().getTime() - new Date(lastSeen).getTime() < 15000;
  };

  if (loading || !exam) {
    return <DashboardLayout><LoadingSpinner fullPage /></DashboardLayout>;
  }

  const presentCount = roster.filter(s => s.status !== 'ABSENT').length;
  const inProgress = roster.filter(s => s.status === 'IN_PROGRESS').length;
  const submitted = roster.filter(s => s.status === 'SUBMITTED').length;
  const autoSubmitted = roster.filter(s => s.status === 'AUTO_SUBMITTED').length;
  const waitingApproval = roster.filter(s => s.status === 'ABSENT' && isOnline(s.heartbeatLastSeen));
  const waitingRelease = roster.filter(s => s.status === 'PRESENT');

  return (
    <DashboardLayout>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-bold text-gray-900 leading-none">Live Monitor</h1>
              <span className="relative flex h-2 w-2 mt-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            </div>
            <p className="text-[13px] text-gray-400 mt-1">{exam.title} · {exam.className} · {exam.group}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Total',     value: roster.length, color: 'text-gray-900' },
            { label: 'Present',   value: presentCount,  color: 'text-emerald-600' },
            { label: 'Answering', value: inProgress,    color: 'text-blue-600' },
            { label: 'Submitted', value: submitted,     color: 'text-emerald-600' },
            { label: 'Auto-out',  value: autoSubmitted, color: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm">
              <p className={['text-[20px] font-bold leading-none', s.color].join(' ')}>{s.value}</p>
              <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Control Panel */}
          <div className="lg:col-span-1 space-y-3">

            {/* Manual attendance */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-3">
                <Users size={14} className="text-gray-400" />
                <p className="text-[13px] font-semibold text-gray-900">Mark Attendance</p>
              </div>
              <form onSubmit={handleMarkPresent} className="flex gap-2">
                <input
                  type="text"
                  value={studentIdInput}
                  onChange={e => setStudentIdInput(e.target.value)}
                  placeholder="CP ID or scan…"
                  className="flex-1 h-9 bg-gray-50 border border-gray-200 rounded-lg px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <Button type="submit" size="sm" variant="primary">Allow</Button>
              </form>
              <p className="text-[11px] text-gray-400 mt-2.5 leading-relaxed">
                Verify physically, then scan/enter to allow paper release.
              </p>
            </div>

            {/* Approve all online */}
            {waitingApproval.length > 0 && (
              <button
                onClick={handleApproveAllOnline}
                className="w-full bg-white border border-emerald-200 text-emerald-700 p-3.5 rounded-xl text-[13px] font-semibold hover:bg-emerald-50 transition-colors flex items-center justify-between"
              >
                <span>Approve all waiting</span>
                <Badge variant="green" size="sm">{waitingApproval.length} online</Badge>
              </button>
            )}

            {/* Release papers */}
            {waitingRelease.length > 0 && (
              <button
                onClick={handleReleaseAllPresent}
                className="w-full bg-blue-600 text-white p-3.5 rounded-xl text-[13px] font-semibold hover:bg-blue-700 transition-colors flex items-center justify-between"
              >
                <span>Launch papers</span>
                <Badge variant="blue" size="sm">{waitingRelease.length} ready</Badge>
              </button>
            )}

            {/* End exam */}
            {exam?.status === 'LIVE' && (
              <div className="pt-1">
                <button
                  onClick={handleEndExam}
                  className="w-full bg-white border border-red-200 text-red-600 p-3.5 rounded-xl text-[13px] font-semibold hover:bg-red-50 transition-colors flex items-center justify-between"
                >
                  <span>End exam for all</span>
                  <AlertTriangle size={14} className="text-red-400" />
                </button>
              </div>
            )}
          </div>

          {/* Roster */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">Roster</p>
                <p className="text-[12px] text-gray-400">{roster.length} students</p>
              </div>
              <div className="divide-y divide-gray-50">
                {roster.length === 0 ? (
                  <div className="px-4 py-12 text-center">
                    <p className="text-[14px] text-gray-400">No students found for this class.</p>
                  </div>
                ) : roster.map(s => {
                  const online = isOnline(s.heartbeatLastSeen);
                  const st = STATUS_BADGE[s.status] || STATUS_BADGE.ABSENT;
                  return (
                    <div
                      key={s.studentCpId}
                      className={[
                        'px-4 py-3 flex items-center justify-between transition-colors',
                        s.status === 'ABSENT' && online ? 'bg-amber-50/40' : 'hover:bg-gray-50/60',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={[
                          'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                          s.status === 'SUBMITTED' || s.status === 'AUTO_SUBMITTED'
                            ? 'bg-gray-100 text-gray-400'
                            : s.status === 'IN_PROGRESS'
                            ? 'bg-blue-50 text-blue-600'
                            : s.status === 'ABSENT' && online
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-400',
                        ].join(' ')}>
                          {s.studentCpId.slice(-3)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-gray-900 truncate">{s.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-gray-400 font-mono">{s.studentCpId}</span>
                            {s.status === 'ABSENT' && online && (
                              <span className="text-[11px] text-amber-500 font-medium">· waiting</span>
                            )}
                            {s.status === 'IN_PROGRESS' && (
                              <span className={['text-[11px] font-medium', online ? 'text-emerald-500' : 'text-amber-500'].join(' ')}>
                                · {online ? 'online' : 'offline'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {s.tabSwitchCount > 0 && (
                          <Badge variant={s.tabSwitchCount >= 3 ? 'red' : 'amber'} size="sm">
                            {s.tabSwitchCount} strike{s.tabSwitchCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {s.status === 'ABSENT' ? (
                          <button
                            onClick={() => handleMarkPresentDirect(s.studentCpId)}
                            className={[
                              'h-7 px-2.5 rounded-lg text-[12px] font-semibold transition-colors',
                              online
                                ? 'bg-gray-900 text-white hover:bg-black'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                            ].join(' ')}
                          >
                            Allow
                          </button>
                        ) : (
                          <>
                            {s.status === 'SUBMITTED' && <CheckCircle2 size={16} className="text-emerald-500" />}
                            {s.status === 'AUTO_SUBMITTED' && <AlertTriangle size={16} className="text-red-400" />}
                            {(s.status === 'PRESENT' || s.status === 'IN_PROGRESS') && (
                              <Badge variant={st.variant} size="sm">{st.label}</Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

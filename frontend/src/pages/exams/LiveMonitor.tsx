import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { api } from '../../lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

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

export function LiveMonitor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [roster, setRoster] = useState<RosterItem[]>([]);
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [studentIdInput, setStudentIdInput] = useState('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5s
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
    } catch (error) {
      console.error('Failed to load monitor data');
    }
  };

  const handleMarkPresentDirect = async (studentCpId: string) => {
    try {
      await api.post(`/live-exams/attendance`, { examId: id, studentCpId });
      toast.success(`Approved entrance for ${studentCpId}`);
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
    if (onlineWaiting.length === 0) {
      toast.error('No students currently online & waiting.');
      return;
    }
    try {
      await Promise.all(
        onlineWaiting.map(s => api.post(`/live-exams/attendance`, { examId: id, studentCpId: s.studentCpId }))
      );
      toast.success(`Approved ${onlineWaiting.length} student(s) successfully!`);
      fetchData();
    } catch {
      toast.error('Failed to approve some students.');
    }
  };

  const handleReleaseAllPresent = async () => {
    try {
      const res = await api.post(`/live-exams/${id}/release-all`);
      toast.success(res.data.message || 'Released test papers to present students!');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to release test papers');
    }
  };

  const handleEndExam = async () => {
    if (!window.confirm('End this exam for ALL students? Students still answering will be auto-submitted. This cannot be undone.')) return;
    try {
      const res = await api.post(`/live-exams/${id}/end-exam`);
      toast.success(res.data.message || 'Exam ended successfully');
      navigate(-1);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to end exam');
    }
  };

  const isOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    const diff = new Date().getTime() - new Date(lastSeen).getTime();
    return diff < 15000; // Heartbeat should be every 10s. If > 15s, offline.
  };

  if (loading || !exam) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-gray-300" size={24} />
        </div>
      </DashboardLayout>
    );
  }

  const presentCount = roster.filter(s => s.status !== 'ABSENT').length;
  const inProgress = roster.filter(s => s.status === 'IN_PROGRESS').length;
  const submitted = roster.filter(s => s.status === 'SUBMITTED').length;
  const autoSubmitted = roster.filter(s => s.status === 'AUTO_SUBMITTED').length;
  const waitingApprovalCount = roster.filter(s => s.status === 'ABSENT' && isOnline(s.heartbeatLastSeen)).length;
  const waitingReleaseCount = roster.filter(s => s.status === 'PRESENT').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">Live Monitor</h1>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{exam.title} · {exam.className} · {exam.group}</p>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Total', value: roster.length, color: 'text-gray-900' },
            { label: 'Present', value: presentCount, color: 'text-green-600' },
            { label: 'Testing', value: inProgress, color: 'text-blue-600' },
            { label: 'Submitted', value: submitted, color: 'text-green-600' },
            { label: 'Auto-out', value: autoSubmitted, color: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-3 text-center">
              <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Attendance Panel */}
          <div className="lg:col-span-1 space-y-3">
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Users size={15} className="text-gray-400" /> Mark Attendance
              </h2>
              <form onSubmit={handleMarkPresent} className="space-y-2.5">
                <input
                  type="text"
                  value={studentIdInput}
                  onChange={e => setStudentIdInput(e.target.value)}
                  placeholder="Enter or scan CP ID..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white transition-colors font-mono"
                />
                <button type="submit" className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-black transition-colors">
                  Allow Entry
                </button>
              </form>
              <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
                Students must be physically verified and marked present before their paper is released.
              </p>
            </div>

            {waitingApprovalCount > 0 && (
              <button
                onClick={handleApproveAllOnline}
                className="w-full bg-white border border-green-200 text-green-700 p-3.5 rounded-xl text-sm font-medium hover:bg-green-50 transition-colors flex items-center justify-between"
              >
                <span>Approve all waiting</span>
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-semibold">{waitingApprovalCount} online</span>
              </button>
            )}

            {waitingReleaseCount > 0 && (
              <button
                onClick={handleReleaseAllPresent}
                className="w-full bg-blue-600 text-white p-3.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-between"
              >
                <span>Submit attendance & launch</span>
                <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-xs font-semibold">{waitingReleaseCount} ready</span>
              </button>
            )}

            {/* End Exam — only shown when exam is LIVE */}
            {exam?.status === 'LIVE' && (
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={handleEndExam}
                  className="w-full bg-white border border-red-200 text-red-600 p-3.5 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-between"
                >
                  <span>End exam for all students</span>
                  <AlertTriangle size={15} className="text-red-400" />
                </button>
              </div>
            )}
          </div>

          {/* Roster */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Class Roster</p>
                <p className="text-xs text-gray-400">{roster.length} students</p>
              </div>
              <div className="divide-y divide-gray-50">
                {roster.map(s => {
                  const online = isOnline(s.heartbeatLastSeen);
                  return (
                    <div key={s.studentCpId} className={`px-4 py-3 flex items-center justify-between transition-colors ${
                      s.status === 'ABSENT' && online ? 'bg-amber-50/60' : 'hover:bg-gray-50/60'
                    }`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${
                          s.status === 'ABSENT'
                            ? (online ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400')
                            : s.status === 'SUBMITTED' || s.status === 'AUTO_SUBMITTED' ? 'bg-gray-100 text-gray-400'
                            : 'bg-blue-50 text-blue-600'
                        }`}>
                          {s.studentCpId.slice(-3)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">
                            {s.studentCpId}
                            {s.status === 'IN_PROGRESS' && (
                              <span className={`ml-2 ${online ? 'text-green-500' : 'text-amber-500'}`}>
                                · {online ? 'online' : 'offline'}
                              </span>
                            )}
                            {s.status === 'ABSENT' && online && <span className="ml-2 text-amber-500">· waiting approval</span>}
                            {s.status === 'ABSENT' && !online && <span className="ml-2 text-gray-300">· absent</span>}
                            {s.status === 'PRESENT' && <span className="ml-2 text-blue-500">· approved, waiting launch</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {s.tabSwitchCount > 0 && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            s.tabSwitchCount >= 3 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {s.tabSwitchCount} strikes
                          </span>
                        )}

                        {s.status === 'ABSENT' ? (
                          <button
                            onClick={() => handleMarkPresentDirect(s.studentCpId)}
                            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                              online
                                ? 'bg-gray-900 text-white hover:bg-black'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            Allow
                          </button>
                        ) : (
                          <>
                            {s.status === 'SUBMITTED' && <CheckCircle2 className="text-green-500" size={18} />}
                            {s.status === 'AUTO_SUBMITTED' && <AlertTriangle className="text-red-500" size={18} />}
                            {s.status === 'PRESENT' && <span className="text-xs text-blue-500 font-medium">Verified</span>}
                            {s.status === 'IN_PROGRESS' && <span className="text-xs text-gray-400">Answering</span>}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {roster.length === 0 && (
                  <div className="px-4 py-12 text-center">
                    <p className="text-sm text-gray-400">No students found for this class and group.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}

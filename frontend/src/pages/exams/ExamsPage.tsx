import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { api } from '../../lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Loader2, Plus, Calendar, Lock, FileEdit,
  CheckCircle2, Radio, ChevronRight, BookOpen, Users, Trophy
} from 'lucide-react';
import toast from 'react-hot-toast';

type Exam = {
  _id: string;
  title: string;
  className: string;
  group: string;
  status: 'DRAFT' | 'LOCKED' | 'PUBLISHED' | 'LIVE' | 'COMPLETED' | 'ARCHIVED';
  duration: number;
  scheduledAt?: string;
  sections?: { subject: string; questions: any[] }[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  DRAFT:     { label: 'Draft',     color: 'text-gray-500',   dot: 'bg-gray-400' },
  LOCKED:    { label: 'Locked',    color: 'text-amber-600',  dot: 'bg-amber-400' },
  PUBLISHED: { label: 'Scheduled', color: 'text-blue-600',   dot: 'bg-blue-400' },
  LIVE:      { label: 'Live',      color: 'text-green-600',  dot: 'bg-green-500' },
  COMPLETED: { label: 'Done',      color: 'text-gray-400',   dot: 'bg-gray-300' },
  ARCHIVED:  { label: 'Archived',  color: 'text-gray-300',   dot: 'bg-gray-200' },
};

const EXAM_ICON: Record<string, ReactNode> = {
  LIVE:      <Radio size={16} className="text-green-500" />,
  COMPLETED: <CheckCircle2 size={16} className="text-gray-400" />,
  LOCKED:    <Lock size={16} className="text-amber-500" />,
  PUBLISHED: <Calendar size={16} className="text-blue-500" />,
  DRAFT:     <FileEdit size={16} className="text-gray-400" />,
  ARCHIVED:  <FileEdit size={16} className="text-gray-300" />,
};

export function ExamsPage() {
  const { classId, group } = useParams<{ classId: string; group: string }>();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'exams' | 'students'>('exams');
  const [students, setStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'STUDENT') { navigate('/dashboard', { replace: true }); return; }
    fetchExams();
    if (activeTab === 'students' && classId && group) fetchStudents();
  }, [classId, group, activeTab, user]);

  const fetchExams = async () => {
    try {
      const url = classId && group ? `/exams?classId=${classId}&group=${group}` : '/exams';
      const res = await api.get(url);
      setExams(res.data.exams);
    } catch {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!classId || !group) return;
    setStudentsLoading(true);
    try {
      const res = await api.get(`/classes/${classId}/students?group=${group}`);
      setStudents(res.data.students || []);
    } catch {
      toast.error('Failed to load student roster');
    } finally {
      setStudentsLoading(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const canCreate = user?.role === 'ADMIN' || user?.role === 'TEACHER' || user?.role === 'ASSISTANT';

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {group ? `${group} Group` : 'Exams'}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {classId ? 'Schedule, students, and active tests.' : 'All question papers and schedules.'}
            </p>
          </div>
          {canCreate && activeTab === 'exams' && (
            <button
              onClick={() => navigate('/exams/create')}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
            >
              <Plus size={15} />
              New exam
            </button>
          )}
        </div>

        {/* Tabs */}
        {classId && group && (
          <div className="flex border-b border-gray-100 -mb-2">
            {(['exams', 'students'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-4 text-sm font-medium transition-colors relative capitalize ${
                  activeTab === tab ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {activeTab === 'students' ? (
          studentsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-gray-300" size={24} />
            </div>
          ) : students.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl p-12 flex flex-col items-center text-center gap-2">
              <Users size={28} className="text-gray-200 mb-1" />
              <p className="text-sm font-medium text-gray-600">No students found</p>
              <p className="text-xs text-gray-400">No verified CET students registered in this group.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 flex justify-between items-center">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Enrolled · {students.length}</p>
              </div>
              <div className="divide-y divide-gray-50">
                {students.map((student) => (
                  <div key={student.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 shrink-0">
                        {student.name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{student.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{student.admissionNumber}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400 font-mono">{student.whatsappNumber}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-gray-300" size={24} />
            </div>
          ) : exams.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl p-12 flex flex-col items-center text-center gap-2">
              <BookOpen size={28} className="text-gray-200 mb-1" />
              <p className="text-sm font-medium text-gray-600">No exams yet</p>
              <p className="text-xs text-gray-400">Create the first question paper for this group.</p>
              {canCreate && (
                <button
                  onClick={() => navigate('/exams/create')}
                  className="mt-3 flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
                >
                  <Plus size={15} /> Create exam
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="divide-y divide-gray-50">
                {exams.map((exam) => {
                  const st = STATUS_CONFIG[exam.status] || STATUS_CONFIG.DRAFT;
                  const totalQ = exam.sections?.reduce((sum, s) => sum + s.questions.length, 0) ?? 0;
                  return (
                    <div
                      key={exam._id}
                      onClick={() => navigate(`/exams/${exam._id}`)}
                      className="px-4 py-3.5 flex items-center gap-3.5 hover:bg-gray-50/60 transition-colors cursor-pointer group"
                    >
                      {/* Status Icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        exam.status === 'LIVE' ? 'bg-green-50' :
                        exam.status === 'PUBLISHED' ? 'bg-blue-50' :
                        exam.status === 'COMPLETED' ? 'bg-gray-50' :
                        'bg-gray-50'
                      }`}>
                        {EXAM_ICON[exam.status] || EXAM_ICON.DRAFT}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">{exam.title}</p>
                          {exam.status === 'LIVE' && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>{exam.className}</span>
                          <span>·</span>
                          <span className="font-medium text-gray-500">{exam.group}</span>
                          <span>·</span>
                          <span>{exam.duration} min</span>
                          {totalQ > 0 && <><span>·</span><span>{totalQ} questions</span></>}
                          {exam.scheduledAt && <><span>·</span><span>{formatDate(exam.scheduledAt)}</span></>}
                        </p>
                      </div>

                      {/* Status badge + Arrow */}
                      <div className="flex items-center gap-3 shrink-0">
                        {exam.status === 'COMPLETED' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/exams/${exam._id}/results`);
                            }}
                            className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
                          >
                            <Trophy size={13} /> Results
                          </button>
                        ) : (
                          <span className={`text-xs font-medium ${st.color} hidden sm:block`}>{st.label}</span>
                        )}
                        <ChevronRight size={15} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
}

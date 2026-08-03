import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { api } from '../../lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Pencil, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyExamsIllustration } from '../../components/ui/Illustrations';

type Exam = {
  _id: string;
  title: string;
  className: string;
  group: string;
  status: 'DRAFT' | 'LOCKED' | 'PUBLISHED' | 'LIVE' | 'COMPLETED' | 'ARCHIVED';
  duration: number;
  scheduledAt?: string;
  sections?: { subject: string; questions: any[] }[];
  createdByFields?: { name: string; cpId: string };
};

type PortalSection = {
  sectionName: string;
  coordinatorCpId: string | null;
  students: any[];
};

const STATUS_CONFIG: Record<string, {
  label: string;
  badge: 'default' | 'amber' | 'blue' | 'green' | 'purple';
  icon: string;
  iconColor: string;
  bg: string;
}> = {
  DRAFT:     { label: 'Draft',     badge: 'default', icon: 'draft',       iconColor: 'var(--text-muted)',  bg: 'var(--surface-sub)' },
  LOCKED:    { label: 'Locked',    badge: 'amber',   icon: 'lock',        iconColor: 'var(--warning)',     bg: 'var(--warning-light)' },
  PUBLISHED: { label: 'Scheduled', badge: 'blue',    icon: 'event',       iconColor: 'var(--accent)',      bg: 'var(--accent-light)' },
  LIVE:      { label: 'Live',      badge: 'green',   icon: 'sensors',     iconColor: 'var(--success)',     bg: 'var(--success-light)' },
  COMPLETED: { label: 'Done',      badge: 'purple',  icon: 'task_alt',    iconColor: 'var(--accent)',      bg: 'var(--accent-light)' }, // Use accent for purple fallback
  ARCHIVED:  { label: 'Archived',  badge: 'default', icon: 'archive',     iconColor: 'var(--text-muted)',  bg: 'var(--surface-sub)' },
};

function EmptyExams({ canCreate, onCreateClick }: { canCreate: boolean; onCreateClick: () => void }) {
  return (
    <div className="card py-14 text-center" style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}>
      <EmptyExamsIllustration className="w-28 h-28 mx-auto mb-4" />
      <p style={{ color: 'var(--text-sub)' }} className="text-[15px] font-semibold">No exams yet</p>
      <p style={{ color: 'var(--text-muted)' }} className="text-[13px] mt-1">
        {canCreate ? 'Create the first question paper for this group.' : 'No exams have been scheduled yet.'}
      </p>
      {canCreate && (
        <div className="mt-5">
          <Button size="sm" variant="primary" onClick={onCreateClick}>
            <Icon name="add" size={16} />
            Create Exam
          </Button>
        </div>
      )}
    </div>
  );
}

function SubjectDots({ sections }: { sections?: { subject: string; questions: any[] }[] }) {
  if (!sections?.length) return null;
  const colors: Record<string, string> = {
    PHYSICS:   'bg-blue-400',
    CHEMISTRY: 'bg-emerald-400',
    MATHS:     'bg-purple-400',
    BIOLOGY:   'bg-teal-400',
  };
  return (
    <div className="flex items-center gap-1">
      {sections.map(s => (
        <span
          key={s.subject}
          title={s.subject}
          className={`w-2 h-2 rounded-full ${colors[s.subject] || 'bg-zinc-300'}`}
        />
      ))}
    </div>
  );
}

export function ExamsPage() {
  const { classId, group } = useParams<{ classId: string; group: string }>();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'exams' | 'sections'>('sections');
  const [sections, setSections] = useState<PortalSection[]>([]);
  const [classStrength, setClassStrength] = useState<number>(40);
  const [isEditingStrength, setIsEditingStrength] = useState(false);
  const [tempStrength, setTempStrength] = useState<number>(40);
  const [staff, setStaff] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [className, setClassName] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'STUDENT') { navigate('/dashboard', { replace: true }); return; }
    fetchExams();
    fetchStaff();
    if (classId && group) fetchSections();
  }, [classId, group, user]);

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

  const fetchStaff = async () => {
    try {
      const res = await api.get('/teachers/staff');
      setStaff(res.data.staff || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSections = async () => {
    if (!classId || !group) return;
    setStudentsLoading(true);
    try {
      const res = await api.get(`/classes/${classId}/students?group=${group}`);
      setSections(res.data.sections || []);
      setClassStrength(res.data.classStrength || 40);
      setTempStrength(res.data.classStrength || 40);
      setClassName(res.data.className || '');
      setAcademicYear(res.data.academicYear || '');
    } catch {
      toast.error('Failed to load sections roster');
    } finally {
      setStudentsLoading(false);
    }
  };

  const updateClassConfig = async (strength?: number, sectionName?: string, coordinatorCpId?: string | null) => {
    try {
      await api.patch(`/classes/${classId}/config`, { group, classStrength: strength, sectionName, coordinatorCpId });
      toast.success('Configuration updated');
      fetchSections();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update config');
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const canCreate = user?.role === 'ADMIN' || user?.role === 'TEACHER' || user?.role === 'ASSISTANT';

  return (
    <DashboardLayout>
      <div className="space-y-5 animate-fade-in">

        {/* Header */}
        <div className="flex items-center gap-3 justify-between flex-wrap">
          <div className="flex items-center gap-3">
            {classId && (
              <button
                onClick={() => navigate('/classes')}
                className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-black hover:border-gray-200 transition-all shrink-0"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h1 className="text-page-title">
                {className ? `${className} (${group})` : (group ? `${group} Group` : 'Exams')}
              </h1>
              <p className="text-secondary mt-1">
                {academicYear ? `Session: ${academicYear} · ` : ''}
                {classId ? 'Manage sections, students, and exam schedules.' : 'All exams and question papers.'}
              </p>
            </div>
          </div>
          {canCreate && activeTab === 'exams' && (
            <Button variant="primary" size="md" onClick={() => navigate('/exams/create')}>
              <Icon name="add" size={16} />
              New Exam
            </Button>
          )}
        </div>

        {/* Tabs */}
        {classId && group && (
          <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
            {(['sections', 'exams'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{ color: activeTab === tab ? 'var(--text)' : 'var(--text-muted)' }}
                className="px-4 pb-3 pt-0.5 text-[13px] font-medium transition-colors relative capitalize hover:opacity-80"
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: 'var(--text)' }} />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Sections Tab */}
        {activeTab === 'sections' ? (
          studentsLoading ? (
            <LoadingSpinner fullPage />
          ) : sections.length === 0 ? (
            <div className="card py-16 text-center" style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}>
              <Icon name="group" size={36} style={{ color: 'var(--text-muted)', opacity: 0.4, margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-sub)' }} className="text-[14px] font-semibold">No students found</p>
              <p style={{ color: 'var(--text-muted)' }} className="text-[12px] mt-1">No verified CET students registered in this group.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Class Config Card */}
              <div className="card p-4 flex items-center justify-between" style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}>
                <div>
                  <p style={{ color: 'var(--text)' }} className="text-[14px] font-semibold">Class Capacity</p>
                  <p style={{ color: 'var(--text-muted)' }} className="text-[13px] mt-0.5">
                    Physical seating capacity for automatic student partitioning.
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  {isEditingStrength ? (
                    <>
                      <input
                        type="number"
                        value={tempStrength}
                        onChange={e => setTempStrength(parseInt(e.target.value) || 0)}
                        className="form-input w-20 text-center"
                        min={1}
                      />
                      <Button size="sm" variant="primary" onClick={() => { setIsEditingStrength(false); updateClassConfig(tempStrength); }}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setIsEditingStrength(false)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <span style={{ background: 'var(--surface-sub)', color: 'var(--text)' }}
                        className="font-mono text-[13px] px-2.5 py-1 rounded-lg font-semibold">
                        {classStrength} seats
                      </span>
                      {canCreate && (
                        <button
                          onClick={() => setIsEditingStrength(true)}
                          style={{ color: 'var(--text-muted)' }}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Section Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sections.map(section => {
                  const coordinatorName = section.coordinatorCpId
                    ? staff.find(s => s.cpId === section.coordinatorCpId)?.name || section.coordinatorCpId
                    : null;

                  return (
                    <div
                      key={section.sectionName}
                      onClick={() => navigate(`/classes/${classId}/group/${group}/section/${section.sectionName}`)}
                      className="card cursor-pointer transition-all group card-hover overflow-hidden"
                      style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}
                    >
                      {/* Section Header */}
                      <div
                        className="px-4 py-3 border-b flex items-center justify-between transition-colors"
                        style={{ background: 'var(--surface-sub)', borderColor: 'var(--border)' }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
                            style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                          >
                            {section.sectionName}
                          </div>
                          <div>
                            <p style={{ color: 'var(--text)' }} className="text-[14px] font-semibold">Section {section.sectionName}</p>
                            <p style={{ color: 'var(--text-muted)' }} className="text-[12px]">{section.students.length} students</p>
                          </div>
                        </div>
                        <Icon name="chevron_right" size={16} style={{ color: 'var(--text-muted)' }} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>

                      <div className="p-4">
                        <p style={{ color: 'var(--text-muted)' }} className="text-[11px] font-semibold uppercase tracking-wider mb-2">
                          Invigilator / Coordinator
                        </p>
                        {canCreate ? (
                          <select
                            value={section.coordinatorCpId || ''}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateClassConfig(undefined, section.sectionName, e.target.value || null)}
                            className="form-select"
                          >
                            <option value="">— Unassigned —</option>
                            {staff.map(s => (
                              <option key={s.cpId} value={s.cpId}>{s.name} ({s.cpId})</option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-2 text-[14px] font-medium" style={{ color: 'var(--text)' }}>
                            <Icon
                              name="verified_user"
                              size={15}
                              style={{ color: coordinatorName ? 'var(--success)' : 'var(--text-muted)' }}
                            />
                            {coordinatorName || 'Not Assigned'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : (
          /* ── Exams Tab ── */
          loading ? (
            <LoadingSpinner fullPage />
          ) : exams.length === 0 ? (
            <EmptyExams canCreate={canCreate} onCreateClick={() => navigate('/exams/create')} />
          ) : (
            <div className="card overflow-hidden stagger" style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}>
              {/* Fix: Added horizontal scroll wrapper */}
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Exam</th>
                      <th>Class · Group</th>
                      <th>Subjects</th>
                      <th>Scheduled</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map(exam => {
                      const st = STATUS_CONFIG[exam.status] || STATUS_CONFIG.DRAFT;
                      const totalQ = exam.sections?.reduce((sum, s) => sum + s.questions.length, 0) ?? 0;
                      return (
                        <tr
                          key={exam._id}
                          onClick={() => navigate(`/exams/${exam._id}`)}
                          className="cursor-pointer"
                        >
                          <td>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: st.bg }}>
                                <Icon name={st.icon} size={16} style={{ color: st.iconColor }} />
                              </div>
                              <div>
                                <p style={{ color: 'var(--text)' }} className="font-semibold text-[13px]">{exam.title}</p>
                                <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-secondary mt-0.5 opacity-85">
                                  {totalQ > 0 && <span>{totalQ} questions</span>}
                                  {totalQ > 0 && exam.createdByFields && <span>·</span>}
                                  {exam.createdByFields && (
                                    <span title={`CP ID: ${exam.createdByFields.cpId}`} className="font-normal text-gray-500">
                                      Created by: {exam.createdByFields.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ color: 'var(--text-sub)' }}>{exam.className}</span>
                            {exam.group && <Badge variant="indigo" size="sm" className="ml-2">{exam.group}</Badge>}
                          </td>
                          <td>
                            <SubjectDots sections={exam.sections} />
                          </td>
                          <td className="font-mono text-[12px]">
                            {exam.scheduledAt ? (
                              <span style={{ color: 'var(--text)' }}>{formatDate(exam.scheduledAt)}</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>—</span>
                            )}
                          </td>
                          <td style={{ color: 'var(--text-sub)' }}>{exam.duration} min</td>
                          <td>
                            {exam.status === 'LIVE' ? (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full"
                                style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                Live
                              </span>
                            ) : (
                              <Badge variant={st.badge} size="sm">{st.label}</Badge>
                            )}
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              {exam.status === 'COMPLETED' && (
                                <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); navigate(`/exams/${exam._id}/results`); }}>
                                  <Icon name="leaderboard" size={14} />
                                  Results
                                </Button>
                              )}
                              <Icon name="chevron_right" size={16} style={{ color: 'var(--text-muted)' }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
}

import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { api } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, ArrowLeft, Clock, Calendar, Users, ChevronRight,
  BookOpen, Info, Plus, Minus, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

type AcademicClass = {
  id: string;
  name: string;
  academicYear: string;
  pcm: { classStrength: number; sections: { sectionName: string; coordinatorCpId?: string }[] };
  pcb: { classStrength: number; sections: { sectionName: string; coordinatorCpId?: string }[] };
};

const DURATION_PRESETS = [
  { label: '1 hr', value: 60 },
  { label: '1.5 hr', value: 90 },
  { label: '2 hr', value: 120 },
  { label: '3 hr', value: 180 },
];

export function CreateExam() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    classId: '',
    group: 'PCM' as 'PCM' | 'PCB',
    duration: 180,
    scheduledAt: '',
    loginWindowMinutes: 15,
    defaultMarks: 4,
    defaultNegativeMarks: 1,
    coordinatorCpId: '',
  });

  useEffect(() => {
    Promise.all([
      api.get('/classes'),
      api.get('/teachers/staff')
    ])
      .then(([classesRes, staffRes]) => {
        setClasses(classesRes.data.classes);
        if (classesRes.data.classes.length > 0) {
          setForm(p => ({ ...p, classId: classesRes.data.classes[0].id }));
        }
        setStaff(staffRes.data.staff || []);
      })
      .catch(() => toast.error('Failed to load initial data'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof typeof form, value: any) => setForm(p => ({ ...p, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.classId) { toast.error('Please select a class'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
      };
      const res = await api.post('/exams', payload);
      toast.success('Exam created!');
      navigate(`/exams/${res.data.exam._id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create exam');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="animate-spin text-gray-300" size={28} />
          <span className="text-sm text-gray-400 font-medium">Loading classes…</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto">

        {/* Back + Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-black hover:border-gray-200 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Create Exam</h1>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Set up a new question paper</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Title ─────────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              Exam Title
            </label>
            <input
              required
              autoFocus
              type="text"
              placeholder="e.g. Major Test 1, CET Mock 2, Practice Test 3"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className="w-full text-gray-900 text-base font-medium placeholder-gray-300 outline-none border-b border-gray-100 focus:border-gray-900 pb-2 transition-colors bg-transparent"
            />
          </div>

          {/* ── Class + Group ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                <Users size={11} className="inline mr-1.5" />Target Class
              </label>
              {classes.length === 0 ? (
                <div className="text-sm text-gray-400 bg-gray-50 rounded-xl px-4 py-3 font-medium">
                  No CET classes found in the Finance System.
                </div>
              ) : (
                <div className="space-y-2">
                  {classes.map(cls => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => set('classId', cls.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                        form.classId === cls.id
                          ? 'bg-gray-900 border-gray-900 text-white'
                          : 'bg-gray-50 border-gray-100 text-gray-700 hover:border-gray-200'
                      }`}
                    >
                      <div>
                        <span className="font-semibold text-sm">{cls.name}</span>
                        <span className={`block text-xs mt-0.5 ${form.classId === cls.id ? 'text-gray-400' : 'text-gray-400'}`}>
                          AY {cls.academicYear}
                        </span>
                      </div>
                      {form.classId === cls.id && (
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-50 pt-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                <BookOpen size={11} className="inline mr-1.5" />Group
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['PCM', 'PCB'] as const).map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => set('group', g)}
                    className={`py-3 rounded-xl font-bold text-sm transition-all border ${
                      form.group === g
                        ? 'bg-gray-900 border-gray-900 text-white'
                        : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200'
                    }`}
                  >
                    {g}
                    <span className={`block text-[10px] font-medium mt-0.5 ${form.group === g ? 'text-gray-400' : 'text-gray-400'}`}>
                      {g === 'PCM' ? 'Physics · Chem · Maths' : 'Physics · Chem · Bio'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Duration ─────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              <Clock size={11} className="inline mr-1.5" />Duration
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {DURATION_PRESETS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set('duration', p.value)}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-all border ${
                    form.duration === p.value
                      ? 'bg-gray-900 border-gray-900 text-white'
                      : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Custom</span>
              <input
                type="number"
                min={10}
                max={600}
                value={form.duration}
                onChange={e => set('duration', Number(e.target.value))}
                className="flex-1 bg-transparent outline-none text-right font-bold text-gray-900 text-sm"
              />
              <span className="text-xs font-semibold text-gray-400">minutes</span>
            </div>
          </div>

          {/* ── Default Marks ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Default Marking Scheme
              </label>
            </div>
            <p className="text-xs text-gray-400 font-medium mb-4 leading-relaxed">
              This applies to every question by default. You can override the marks for individual questions while building the paper.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-2">
                  Correct Answer
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-emerald-600">+</span>
                  <input
                    type="number"
                    min={1}
                    value={form.defaultMarks}
                    onChange={e => set('defaultMarks', Number(e.target.value))}
                    className="w-14 bg-transparent outline-none text-2xl font-black text-emerald-700"
                  />
                  <span className="text-xs text-emerald-600 font-semibold">marks</span>
                </div>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block mb-2">
                  Wrong Answer
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-red-500">−</span>
                  <input
                    type="number"
                    min={0}
                    step={0.25}
                    value={form.defaultNegativeMarks}
                    onChange={e => set('defaultNegativeMarks', Number(e.target.value))}
                    className="w-14 bg-transparent outline-none text-2xl font-black text-red-600"
                  />
                  <span className="text-xs text-red-500 font-semibold">marks</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Schedule ─────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                <Calendar size={11} className="inline mr-1.5" />Schedule Date
              </label>
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Optional</span>
            </div>
            <p className="text-xs text-gray-400 font-medium mb-3 leading-relaxed">
              You can set or change the schedule after locking the exam.
            </p>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={e => set('scheduledAt', e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-gray-300 text-sm font-medium text-gray-700 transition-colors"
            />
          </div>

          {/* ── Login Window ──────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Student Login Window
              </label>
              <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-wider">
                Recommended 15 min
              </span>
            </div>
            <p className="text-xs text-gray-400 font-medium mb-4 leading-relaxed">
              How many minutes <span className="text-gray-600 font-semibold">before</span> the exam time students are allowed to log in and sit at the waiting screen.
              <br className="my-1" />
              Example: If the test starts at <span className="text-gray-700 font-semibold">12:00 PM</span> and you set 15 minutes, students can join from <span className="text-gray-700 font-semibold">11:45 AM</span>. The exam starts automatically at 12:00 PM.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => set('loginWindowMinutes', Math.max(0, form.loginWindowMinutes - 5))}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-all"
              >
                <Minus size={14} />
              </button>
              <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={form.loginWindowMinutes}
                  onChange={e => set('loginWindowMinutes', Number(e.target.value))}
                  className="flex-1 bg-transparent outline-none font-black text-gray-900 text-lg text-center"
                />
                <span className="text-xs font-semibold text-gray-400">minutes before exam</span>
              </div>
              <button
                type="button"
                onClick={() => set('loginWindowMinutes', Math.min(60, form.loginWindowMinutes + 5))}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-all"
              >
                <Plus size={14} />
              </button>
            </div>

            {form.loginWindowMinutes > 0 && form.scheduledAt && (
              <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <Info size={13} className="text-blue-400 shrink-0" />
                <p className="text-xs text-blue-600 font-medium">
                  Students can log in from{' '}
                  <span className="font-bold">
                    {new Date(new Date(form.scheduledAt).getTime() - form.loginWindowMinutes * 60000)
                      .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {' '}· Exam starts at{' '}
                  <span className="font-bold">
                    {new Date(form.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* ── Coordinators ─────────────────────────────────────────────────── */}
          {(() => {
            const selectedClass = classes.find(c => c.id === form.classId);
            const groupConfig = form.group === 'PCM' ? selectedClass?.pcm : selectedClass?.pcb;
            const sections = groupConfig?.sections || [];

            return (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Exam Coordinators
                  </label>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Class Based
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium mb-4 leading-relaxed">
                  Coordinators are assigned separately per section based on the class strength. They monitor their respective sections during the live exam.
                </p>

                {!selectedClass ? (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-center text-sm font-medium text-gray-400">
                    Select a class above to see assigned coordinators
                  </div>
                ) : sections.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex flex-col items-center justify-center text-sm font-medium text-gray-400 gap-2">
                    <p>No sections found for this class and group.</p>
                    <p className="text-xs text-amber-500 bg-amber-50 px-3 py-1.5 rounded-lg">Ensure you configure class strength and sections in Class Management.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sections.map(section => {
                      const coordName = section.coordinatorCpId 
                        ? (staff.find(s => s.cpId === section.coordinatorCpId)?.name || section.coordinatorCpId)
                        : null;

                      return (
                        <div key={section.sectionName} className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 shadow-sm transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                              Section {section.sectionName}
                            </span>
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                          </div>
                          {coordName ? (
                            <div>
                              <p className="font-bold text-sm text-gray-900">{coordName}</p>
                              <p className="text-[11px] text-gray-400 font-mono mt-0.5">{section.coordinatorCpId}</p>
                            </div>
                          ) : (
                            <p className="text-xs font-semibold text-amber-500 flex items-center gap-1.5">
                              <AlertTriangle size={12} /> Unassigned
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {sections.some(s => !s.coordinatorCpId) && (
                  <p className="text-[11px] text-amber-600 font-semibold mt-3 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100/50">
                    Warning: One or more sections are missing a coordinator. You may proceed, but you should update the class configuration later.
                  </p>
                )}
              </div>
            );
          })()}

          {/* ── Submit ────────────────────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={saving || !form.classId || !form.title.trim()}
            className="w-full flex items-center justify-center gap-2 bg-black text-white py-4 rounded-2xl font-bold text-sm hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {saving ? (
              <><Loader2 size={16} className="animate-spin" /> Creating…</>
            ) : (
              <>Start Building <ChevronRight size={16} /></>
            )}
          </button>

        </form>
      </div>
    </DashboardLayout>
  );
}

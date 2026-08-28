import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { api } from '../../lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Loader2, ArrowLeft, Plus, CheckCircle2, Lock, Unlock,
  Trash2, Clock, Calendar, ChevronDown, ChevronUp,
  FlaskConical, Atom, Calculator, Leaf, Zap, AlertCircle,
  CheckCheck, Radio, Pencil, X, Save, Info, Trophy, ImagePlus, Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import { RichTextEditor } from '../../components/RichTextEditor';
import { RichTextDisplay } from '../../components/RichTextDisplay';
import { ImportQuestionsModal } from '../../components/ImportQuestionsModal';

// ─── Types ────────────────────────────────────────────────────────────────────
type Question = {
  _id: string;
  text: string;
  diagramUrl?: string;
  diagramUrls?: string[];
  options: string[];
  correctAnswer: string;
  marks: number;
  negativeMarks: number;
  difficulty: string;
};

type Section = {
  subject: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'READY';
  defaultMarks?: number;
  defaultNegativeMarks?: number;
  questions: Question[];
};

type Exam = {
  _id: string;
  title: string;
  className: string;
  group: string;
  status: 'DRAFT' | 'LOCKED' | 'PUBLISHED' | 'LIVE' | 'COMPLETED' | 'ARCHIVED';
  duration: number;
  scheduledAt?: string;
  loginWindowMinutes: number;
  defaultMarks: number;
  defaultNegativeMarks: number;
  coordinatorCpId?: string;
  isClassDefaultCoordinator?: boolean;
  sections: Section[];
  createdByFields?: { name: string; cpId: string };
  canMonitor?: boolean;
};

type QForm = {
  text: string;
  diagramUrl?: string;
  diagramUrls: string[];
  options: [string, string, string, string];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  marks: number;
  negativeMarks: number;
};

const makeEmptyForm = (defaultMarks = 4, defaultNegativeMarks = 1): QForm => ({
  text: '',
  diagramUrl: '',
  diagramUrls: [],
  options: ['', '', '', ''],
  correctAnswer: 'A',
  marks: defaultMarks,
  negativeMarks: defaultNegativeMarks,
});

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

// ─── Subject config ───────────────────────────────────────────────────────────
const SUBJECT_ICON: Record<string, React.ReactNode> = {
  PHYSICS:   <Atom size={15} />,
  CHEMISTRY: <FlaskConical size={15} />,
  MATHS:     <Calculator size={15} />,
  BIOLOGY:   <Leaf size={15} />,
};

const STATUS_CHIPS: Record<string, { label: string; cls: string }> = {
  DRAFT:     { label: 'Draft',     cls: 'bg-gray-100 text-gray-600' },
  LOCKED:    { label: 'Locked',    cls: 'bg-amber-100 text-amber-700' },
  PUBLISHED: { label: 'Scheduled', cls: 'bg-blue-100 text-blue-700' },
  LIVE:      { label: 'Live',      cls: 'bg-emerald-100 text-emerald-700' },
  COMPLETED: { label: 'Completed', cls: 'bg-purple-100 text-purple-700' },
};

// ─── Reusable Question Form ───────────────────────────────────────────────────
function QuestionForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel = 'Add Question',
  loading = false,
  defaultMarks,
  defaultNegativeMarks,
}: {
  value: QForm;
  onChange: (v: QForm) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel?: string;
  loading?: boolean;
  defaultMarks?: number;
  defaultNegativeMarks?: number;
}) {
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploadingImage(true);
    try {
      const res = await api.post('/upload/presign', {
        fileName: file.name,
        contentType: file.type
      });
      
      const { presignedUrl, publicUrl } = res.data;
      
      await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });
      
      onChange({ ...value, diagramUrls: [...value.diagramUrls, publicUrl] });
      toast.success('Diagram uploaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload image. Check AWS credentials.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async (urlToRemove: string) => {
    try {
      await api.delete('/upload/diagram', { data: { url: urlToRemove } });
      onChange({ 
        ...value, 
        diagramUrls: value.diagramUrls.filter(u => u !== urlToRemove),
        diagramUrl: value.diagramUrl === urlToRemove ? '' : value.diagramUrl
      });
      toast.success('Image removed');
    } catch (err) {
      toast.error('Failed to remove image from server');
    }
  };

  const setOption = (i: number, val: string) => {
    const opts = [...value.options] as [string, string, string, string];
    opts[i] = val;
    onChange({ ...value, options: opts });
  };

  return (
    <div className="space-y-5">

      {/* Question Text */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
          Question
        </label>
        <RichTextEditor
          value={value.text}
          onChange={val => onChange({ ...value, text: val })}
          placeholder="Write the question clearly. Include all necessary context the student needs."
          className="mb-2"
        />

        {/* Diagram Upload */}
        <div className="mt-3">
          <div className="flex flex-wrap gap-3 mb-3">
            {value.diagramUrl && !value.diagramUrls.includes(value.diagramUrl) && (
              <div className="relative inline-block border rounded-lg overflow-hidden group bg-white shadow-sm">
                <img src={value.diagramUrl} alt="Question diagram" className="max-h-40 object-contain" />
                <button 
                  type="button"
                  onClick={() => handleRemoveImage(value.diagramUrl!)}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {value.diagramUrls.map(url => (
              <div key={url} className="relative inline-block border rounded-lg overflow-hidden group bg-white shadow-sm">
                <img src={url} alt="Question diagram" className="max-h-40 object-contain" />
                <button 
                  type="button"
                  onClick={() => handleRemoveImage(url)}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors inline-flex"
          >
            {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
            {uploadingImage ? 'Uploading...' : 'Attach Image'}
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      </div>

      {/* Options */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Answer Options
          </label>
          <span className="text-[11px] text-gray-400 font-medium">
            Click the circle to mark the correct answer
          </span>
        </div>

        <div className="space-y-2">
          {OPTION_LETTERS.map((letter, i) => {
            const isCorrect = value.correctAnswer === letter;
            return (
              <div
                key={letter}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                  isCorrect
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                }`}
              >
                {/* Correct Answer Selector */}
                <button
                  type="button"
                  title="Mark as correct answer"
                  onClick={() => onChange({ ...value, correctAnswer: letter })}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all focus:outline-none ${
                    isCorrect
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-gray-300 hover:border-emerald-400'
                  }`}
                >
                  {isCorrect && <div className="w-2 h-2 rounded-full bg-white" />}
                </button>

                {/* Letter badge */}
                <span className={`text-xs font-black w-5 shrink-0 ${isCorrect ? 'text-emerald-600' : 'text-gray-300'}`}>
                  {letter}
                </span>

                {/* Option text input */}
                <div className="flex-1 min-w-0">
                  <RichTextEditor
                    value={value.options[i]}
                    onChange={val => setOption(i, val)}
                    placeholder={`Option ${letter} — enter the answer choice`}
                  />
                </div>

                {/* Correct answer label */}
                {isCorrect && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                    ✓ Correct
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-gray-400 font-medium mt-2 leading-relaxed">
          The option with a filled circle is the correct answer students must choose.
        </p>
      </div>

      {/* Marks */}
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">
          Marking Scheme
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
              Correct Answer
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-emerald-600">+</span>
              <input
                type="number"
                min={1}
                value={value.marks}
                onChange={e => onChange({ ...value, marks: Number(e.target.value) })}
                className="w-16 bg-transparent outline-none text-xl font-black text-emerald-700"
              />
              <span className="text-xs text-emerald-600 font-semibold">marks</span>
            </div>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block mb-1">
              Wrong Answer
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-red-500">−</span>
              <input
                type="number"
                min={0}
                step={0.25}
                value={value.negativeMarks}
                onChange={e => onChange({ ...value, negativeMarks: Number(e.target.value) })}
                className="w-16 bg-transparent outline-none text-xl font-black text-red-600"
              />
              <span className="text-xs text-red-500 font-semibold">marks</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-[11px] text-gray-400 font-medium">
            Set 0 negative marks if there's no penalty for wrong answers.
          </p>
          {defaultMarks !== undefined && (value.marks !== defaultMarks || value.negativeMarks !== (defaultNegativeMarks ?? 1)) && (
            <button
              type="button"
              onClick={() => onChange({ ...value, marks: defaultMarks, negativeMarks: defaultNegativeMarks ?? 1 })}
              className="text-[11px] font-bold text-blue-500 hover:text-blue-700 transition-colors"
            >
              Reset to exam default (+{defaultMarks}/−{defaultNegativeMarks ?? 1})
            </button>
          )}
        </div>
        {defaultMarks !== undefined && (value.marks !== defaultMarks || value.negativeMarks !== (defaultNegativeMarks ?? 1)) && (
          <div className="flex items-center gap-1.5 mt-1.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
            <Info size={11} className="text-amber-500 shrink-0" />
            <span className="text-[11px] text-amber-600 font-medium">
              This question uses custom marks (overrides exam default of +{defaultMarks}/−{defaultNegativeMarks ?? 1})
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-1 border-t border-gray-50">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
        >
          <X size={14} /> Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 size={14} className="animate-spin" /> Saving…</>
          ) : submitLabel === 'Save Changes' ? (
            <><Save size={14} /> Save Changes</>
          ) : (
            <><Plus size={14} /> {submitLabel}</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ExamDetail() {
  const { id } = useParams<{ id: string }>();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('');

  // Add question state
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<QForm>(makeEmptyForm());

  // Edit question state
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<QForm>(makeEmptyForm());

  // Edit exam metadata state
  const [editingMeta, setEditingMeta] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [metaDraft, setMetaDraft] = useState({
    title: '',
    duration: 180,
    scheduledAt: '',
    loginWindowMinutes: 15,
    defaultMarks: 4,
    defaultNegativeMarks: 1,
    coordinatorCpId: '',
  });
  const setMeta = (key: keyof typeof metaDraft, val: any) =>
    setMetaDraft(p => ({ ...p, [key]: val }));

  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const imageDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (expandedImage && imageDialogRef.current && !imageDialogRef.current.open) {
      imageDialogRef.current.showModal();
    } else if (!expandedImage && imageDialogRef.current && imageDialogRef.current.open) {
      imageDialogRef.current.close();
    }
  }, [expandedImage]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const addTextRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'STUDENT') {
      navigate(`/live-exam/${id}`, { replace: true });
      return;
    }
    fetchExam();
    fetchStaff();
  }, [id, user]);

  const fetchStaff = async () => {
    try {
      const res = await api.get('/teachers/staff');
      setStaff(res.data.staff || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (adding && addTextRef.current) addTextRef.current.focus();
  }, [adding]);

  const fetchExam = async () => {
    try {
      const res = await api.get(`/exams/${id}`);
      const data: Exam = res.data.exam;
      setExam(data);
      if (!activeTab && data.sections.length > 0) setActiveTab(data.sections[0].subject);
      // Sync meta draft with loaded exam data
      setMetaDraft({
        title: data.title,
        duration: data.duration,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString().slice(0, 16) : '',
        loginWindowMinutes: data.loginWindowMinutes ?? 15,
        defaultMarks: data.defaultMarks ?? 4,
        defaultNegativeMarks: data.defaultNegativeMarks ?? 1,
        coordinatorCpId: data.isClassDefaultCoordinator ? '' : (data.coordinatorCpId || ''),
      });
    } catch {
      toast.error('Failed to load exam');
      navigate('/exams');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateExam = async () => {
    setActionLoading('meta');
    try {
      await api.patch(`/exams/${id}`, {
        ...metaDraft,
        coordinatorCpId: metaDraft.coordinatorCpId || "",
        scheduledAt: metaDraft.scheduledAt ? new Date(metaDraft.scheduledAt).toISOString() : null,
      });
      toast.success('Exam details updated');
      setEditingMeta(false);
      fetchExam();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update exam');
    } finally {
      setActionLoading(null);
    }
  };

  const activeSection = exam?.sections.find(s => s.subject === activeTab);
  const isDraft = exam?.status === 'DRAFT';
  const isLocked = exam?.status === 'LOCKED';
  const allReady = exam?.sections.every(s => s.status === 'READY') ?? false;
  const canEdit = isDraft && (user?.role === 'ADMIN' || user?.role === 'TEACHER' || user?.role === 'ASSISTANT');

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleAddQuestion = async () => {
    if (!addDraft.text.trim()) { toast.error('Question text is required'); return; }
    if (addDraft.options.some(o => !o.trim())) { toast.error('All 4 options must be filled'); return; }
    setActionLoading('add');
    try {
      await api.post(`/exams/${id}/sections/${activeTab}/questions`, addDraft);
      toast.success('Question added');
      setAddDraft(makeEmptyForm(exam?.defaultMarks, exam?.defaultNegativeMarks));
      setAdding(false);
      fetchExam();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add question');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartEdit = (q: Question) => {
    setEditingQId(q._id);
    setExpandedQ(q._id);
    setAdding(false);
    setEditDraft({
      text: q.text,
      diagramUrl: q.diagramUrl || '',
      diagramUrls: q.diagramUrls || [],
      options: [...q.options] as [string, string, string, string],
      correctAnswer: q.correctAnswer as 'A' | 'B' | 'C' | 'D',
      marks: q.marks,
      negativeMarks: q.negativeMarks,
    });
  };

  const handleSaveEdit = async () => {
    if (!editDraft.text.trim()) { toast.error('Question text is required'); return; }
    if (editDraft.options.some(o => !o.trim())) { toast.error('All 4 options must be filled'); return; }
    setActionLoading('edit-' + editingQId);
    try {
      await api.patch(`/exams/${id}/sections/${activeTab}/questions/${editingQId}`, editDraft);
      toast.success('Question updated');
      setEditingQId(null);
      fetchExam();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update question');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveQuestion = async (qId: string) => {
    setActionLoading('del-' + qId);
    try {
      await api.delete(`/exams/${id}/sections/${activeTab}/questions/${qId}`);
      toast.success('Question removed');
      if (expandedQ === qId) setExpandedQ(null);
      fetchExam();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove question');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveSection = async () => {
    setActionLoading('approve');
    try {
      await api.patch(`/exams/${id}/sections/${activeTab}/approve`);
      toast.success(`${activeTab} section approved`);
      fetchExam();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve section');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLockExam = async () => {
    setActionLoading('lock');
    try {
      await api.patch(`/exams/${id}/lock`);
      toast.success('Exam locked');
      fetchExam();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to lock exam');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublish = async () => {
    if (!scheduleDate && !exam?.scheduledAt) { toast.error('Please set a schedule date'); return; }
    setActionLoading('publish');
    try {
      await api.patch(`/exams/${id}/publish`, {
        scheduledAt: scheduleDate ? new Date(scheduleDate).toISOString() : undefined,
      });
      toast.success('Exam published!');
      setShowSchedule(false);
      fetchExam();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to publish');
    } finally {
      setActionLoading(null);
    }
  };

  const [deleteStep, setDeleteStep] = useState(0);

  const handleDeleteExam = async () => {
    if (deleteStep < 3) {
      setDeleteStep(prev => prev + 1);
      return;
    }
    setActionLoading('delete');
    try {
      await api.delete(`/exams/${id}`);
      toast.success('Exam permanently deleted');
      navigate('/exams');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete exam');
      setDeleteStep(0);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnlockExam = async () => {
    setActionLoading('unlock');
    try {
      await api.patch(`/exams/${id}/unlock`);
      toast.success('Exam unlocked');
      fetchExam();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to unlock exam');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnlockSection = async (subject: string) => {
    try {
      await api.patch(`/exams/${id}/sections/${subject}/unlock`);
      toast.success(`${subject} section unlocked`);
      fetchExam();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to unlock section');
    }
  };

  const handleUpdateSectionMeta = async (subject: string, updates: { defaultMarks?: number; defaultNegativeMarks?: number }) => {
    try {
      await api.patch(`/exams/${id}/sections/${subject}`, updates);
      setExam(prev => {
        if (!prev) return prev;
        const newSections = [...prev.sections];
        const idx = newSections.findIndex(s => s.subject === subject);
        if (idx !== -1) {
          newSections[idx] = { ...newSections[idx], ...updates };
        }
        return { ...prev, sections: newSections };
      });
      toast.success('Section grading updated');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update section grading');
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading || !exam) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="animate-spin text-gray-300" size={28} />
          <span className="text-sm text-gray-400 font-medium">Loading exam…</span>
        </div>
      </DashboardLayout>
    );
  }

  const chip = STATUS_CHIPS[exam.status] || STATUS_CHIPS.DRAFT;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-black hover:border-gray-200 transition-all shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900 truncate">{exam.title}</h1>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${chip.cls}`}>{chip.label}</span>
            </div>
             <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-xs text-gray-500">{exam.className}</span>
              <span className="text-gray-200">·</span>
              <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">{exam.group}</span>
              <span className="text-gray-200">·</span>
              <span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={11} /> {exam.duration} min</span>
              {exam.scheduledAt && (
                <>
                  <span className="text-gray-200">·</span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar size={11} />
                    {new Date(exam.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </>
              )}
              {user?.role !== 'STUDENT' && exam.createdByFields && (
                <>
                  <span className="text-gray-200">·</span>
                  <span className="text-xs text-gray-500 font-medium" title={`CP ID: ${exam.createdByFields.cpId}`}>
                    Created by: {exam.createdByFields.name}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {user?.role === 'ADMIN' && (
              <div className="flex items-center gap-2 border-r border-gray-200 pr-2 mr-1 flex-wrap">
                {(exam.status === 'LOCKED' || exam.status === 'PUBLISHED') && (
                  <button
                    onClick={handleUnlockExam}
                    disabled={actionLoading === 'unlock'}
                    className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg font-semibold text-xs hover:bg-orange-100 transition-all border border-orange-200"
                  >
                    {actionLoading === 'unlock' ? <Loader2 size={13} className="animate-spin" /> : <Unlock size={13} />}
                    Unlock Exam
                  </button>
                )}
                
                <button
                  onClick={handleDeleteExam}
                  disabled={actionLoading === 'delete'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all border ${
                    deleteStep === 0 ? 'bg-white text-red-600 border-red-200 hover:bg-red-50' :
                    deleteStep === 1 ? 'bg-red-50 text-red-600 border-red-300' :
                    deleteStep === 2 ? 'bg-red-100 text-red-700 border-red-400' :
                    'bg-red-600 text-white border-red-600 animate-pulse'
                  }`}
                  onMouseLeave={() => setDeleteStep(0)}
                >
                  {actionLoading === 'delete' ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  {deleteStep === 0 ? 'Delete Exam' :
                   deleteStep === 1 ? 'Click to confirm' :
                   deleteStep === 2 ? 'Wipes data. Confirm?' :
                   'Final: Delete permanently'}
                </button>
              </div>
            )}
            
            {(exam.status === 'LIVE' || exam.status === 'PUBLISHED') && exam.canMonitor && (
              <button
                onClick={() => navigate(`/exams/${exam._id}/monitor`)}
                className="flex items-center gap-1.5 bg-black text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-gray-800 transition-all animate-pulse shadow-[0_0_12px_rgba(0,0,0,0.5)] border-2 border-red-500"
              >
                <Zap size={13} className="text-red-500" /> Monitor
              </button>
            )}
            {exam.status === 'COMPLETED' && (
              <button
                onClick={() => navigate(`/exams/${exam._id}/results`)}
                className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-sm"
              >
                <Trophy size={13} /> View Results & Ranks
              </button>
            )}
          </div>
        </div>

        {/* ── Editable Exam Metadata ─────────────────────────────────────────── */}
        {(isDraft || isLocked) && canEdit && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {!editingMeta ? (
              <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-5 flex-wrap text-xs text-gray-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} className="text-gray-400" />
                    <span className="font-bold text-gray-700">{exam.duration} min</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">+{exam.defaultMarks ?? 4}</span>
                    <span className="text-gray-300">/</span>
                    <span className="text-red-500 font-bold">−{exam.defaultNegativeMarks ?? 1}</span>
                    <span className="text-gray-400">default marks</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-gray-400" />
                    {exam.scheduledAt
                      ? <span className="font-bold text-gray-700">{new Date(exam.scheduledAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      : <span className="text-gray-400 italic">No schedule set</span>}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-gray-400">Login window:</span>
                    <span className="font-bold text-gray-700">{exam.loginWindowMinutes ?? 15} min early</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-gray-400">Coordinator:</span>
                    <span className="font-bold text-gray-700">
                      {exam.coordinatorCpId 
                        ? `${staff.find(s => s.cpId === exam.coordinatorCpId)?.name || exam.coordinatorCpId} ${exam.isClassDefaultCoordinator ? '(Class Default)' : '(Test Override)'}`
                        : 'Unassigned'}
                    </span>
                  </span>
                </div>
                <button
                  onClick={() => setEditingMeta(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-all"
                >
                  <Pencil size={12} /> Edit Details
                </button>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">Edit Exam Details</span>
                  <button onClick={() => setEditingMeta(false)} className="text-xs text-gray-400 hover:text-gray-600 font-semibold">
                    Cancel
                  </button>
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Title</label>
                  <input
                    type="text"
                    value={metaDraft.title}
                    onChange={e => setMeta('title', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 focus:border-gray-300 rounded-xl px-4 py-3 outline-none text-sm font-medium text-gray-800 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Duration */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Duration (minutes)</label>
                    <input
                      type="number" min={10}
                      value={metaDraft.duration}
                      onChange={e => setMeta('duration', Number(e.target.value))}
                      className="w-full bg-gray-50 border border-gray-100 focus:border-gray-300 rounded-xl px-4 py-3 outline-none text-sm font-bold text-gray-800 transition-colors"
                    />
                  </div>
                  {/* Login window */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">
                      Login Window <span className="text-blue-400 normal-case font-medium">(min before exam)</span>
                    </label>
                    <input
                      type="number" min={0} max={60}
                      value={metaDraft.loginWindowMinutes}
                      onChange={e => setMeta('loginWindowMinutes', Number(e.target.value))}
                      className="w-full bg-gray-50 border border-gray-100 focus:border-gray-300 rounded-xl px-4 py-3 outline-none text-sm font-bold text-gray-800 transition-colors"
                    />
                  </div>
                </div>

                {/* Default Marks */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Default Marks Per Question</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                      <span className="text-lg font-black text-emerald-600">+</span>
                      <input type="number" min={1} value={metaDraft.defaultMarks}
                        onChange={e => setMeta('defaultMarks', Number(e.target.value))}
                        className="flex-1 bg-transparent outline-none text-xl font-black text-emerald-700" />
                      <span className="text-xs text-emerald-600 font-semibold">marks</span>
                    </div>
                    <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      <span className="text-lg font-black text-red-500">−</span>
                      <input type="number" min={0} step={0.25} value={metaDraft.defaultNegativeMarks}
                        onChange={e => setMeta('defaultNegativeMarks', Number(e.target.value))}
                        className="flex-1 bg-transparent outline-none text-xl font-black text-red-600" />
                      <span className="text-xs text-red-500 font-semibold">marks</span>
                    </div>
                  </div>
                </div>

                {/* Coordinator */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Exam Coordinator</label>
                  <select
                    value={metaDraft.coordinatorCpId}
                    onChange={e => setMeta('coordinatorCpId', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 focus:border-gray-300 rounded-xl px-4 py-3 outline-none text-sm font-semibold text-gray-700 transition-colors bg-transparent cursor-pointer"
                  >
                    <option value="">
                      Unassigned
                    </option>
                    {staff.map(s => (
                      <option key={s.cpId} value={s.cpId}>
                        {s.name} ({s.cpId}) — {s.role === 'TEACHER' ? (s.subject ? `${s.subject.charAt(0) + s.subject.slice(1).toLowerCase()} Teacher` : 'Faculty') : s.role.charAt(0) + s.role.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Schedule */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Schedule Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    value={metaDraft.scheduledAt}
                    onChange={e => setMeta('scheduledAt', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 focus:border-gray-300 rounded-xl px-4 py-3 outline-none text-sm font-medium text-gray-700 transition-colors"
                  />
                </div>

                <div className="flex gap-2 pt-1 border-t border-gray-50">
                  <button onClick={() => setEditingMeta(false)}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all">
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateExam}
                    disabled={actionLoading === 'meta'}
                    className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all disabled:opacity-50"
                  >
                    {actionLoading === 'meta' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Lock Bar ─────────────────────────────────────────────────────── */}
        {isDraft && canEdit && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              {allReady ? <CheckCheck size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-amber-400" />}
              <span className={`text-sm font-medium ${allReady ? 'text-gray-700' : 'text-gray-500'}`}>
                {allReady
                  ? 'All sections approved — ready to lock.'
                  : `${exam.sections.filter(s => s.status === 'READY').length} / ${exam.sections.length} sections approved.`}
              </span>
            </div>
            <button
              onClick={handleLockExam}
              disabled={!allReady || actionLoading === 'lock'}
              className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {actionLoading === 'lock' ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />}
              Lock Exam
            </button>
          </div>
        )}

        {/* ── Publish Bar ─────────────────────────────────────────────────── */}
        {isLocked && (user?.role === 'ADMIN' || user?.role === 'TEACHER' || user?.role === 'ASSISTANT') && (
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Lock size={16} className="text-amber-500" />
                <span className="text-sm font-medium text-gray-700">Exam locked. Set a schedule and publish to students.</span>
              </div>
              <button
                onClick={() => setShowSchedule(!showSchedule)}
                className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-black transition-all"
              >
                <Calendar size={13} /> {showSchedule ? 'Cancel' : 'Schedule & Publish'}
              </button>
            </div>
            {showSchedule && (
              <div className="border-t border-gray-50 p-4 flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Exam Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduleDate || (exam.scheduledAt ? new Date(exam.scheduledAt).toISOString().slice(0, 16) : '')}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-gray-300 text-sm font-medium text-gray-700"
                  />
                </div>
                <button
                  onClick={handlePublish}
                  disabled={actionLoading === 'publish'}
                  className="flex items-center gap-1.5 bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {actionLoading === 'publish' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Publish
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Subject Tabs ──────────────────────────────────────────────────── */}
        <div className="flex gap-2 flex-wrap">
          {exam.sections.map(s => {
            const isActive = s.subject === activeTab;
            return (
              <button
                key={s.subject}
                onClick={() => { setActiveTab(s.subject); setAdding(false); setAddDraft(makeEmptyForm(s.defaultMarks ?? exam?.defaultMarks, s.defaultNegativeMarks ?? exam?.defaultNegativeMarks)); setEditingQId(null); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
                  isActive ? 'bg-gray-900 text-white border-gray-900 shadow-sm' : 'bg-white text-gray-600 border-gray-100 hover:border-gray-200'
                }`}
              >
                <span className={isActive ? 'text-gray-300' : 'text-gray-400'}>{SUBJECT_ICON[s.subject]}</span>
                {s.subject.charAt(0) + s.subject.slice(1).toLowerCase()}
                {s.status === 'READY' && <CheckCircle2 size={13} className={isActive ? 'text-emerald-400' : 'text-emerald-500'} />}
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${isActive ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {s.questions.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Section Content ───────────────────────────────────────────────── */}
        {activeSection && (
          <div className="space-y-4">

            {/* Approved banner */}
            {activeSection.status === 'READY' && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-700">
                    {activeSection.subject.charAt(0) + activeSection.subject.slice(1).toLowerCase()} section approved — {activeSection.questions.length} questions locked in.
                  </span>
                </div>
                {user?.role === 'ADMIN' && (
                  <button
                    onClick={() => handleUnlockSection(activeSection.subject)}
                    className="flex items-center gap-1.5 bg-white text-emerald-700 px-3 py-1.5 rounded-lg font-semibold text-xs border border-emerald-200 hover:bg-emerald-100 transition-all shrink-0"
                  >
                    <Unlock size={13} /> Unlock
                  </button>
                )}
              </div>
            )}

            {/* Section Grading Settings */}
            {canEdit && activeSection.status !== 'READY' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-shadow hover:shadow-sm">
                <div className="flex-1">
                  <h3 className="text-gray-900 text-[15px] font-medium flex items-center gap-2 mb-1">
                    <Calculator size={16} className="text-gray-500" />
                    Section Default Marks
                  </h3>
                  <p className="text-gray-500 text-[13px] leading-relaxed">
                    Set default marks for this section. Existing questions will be automatically updated.
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-medium text-gray-500 mb-1.5 ml-1">Correct (+)</label>
                    <input
                      type="number" min={1}
                      value={activeSection.defaultMarks ?? exam.defaultMarks}
                      onChange={e => handleUpdateSectionMeta(activeSection.subject, { defaultMarks: Number(e.target.value) })}
                      className="w-20 bg-gray-50 border border-gray-200 text-gray-900 text-sm font-medium rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[11px] font-medium text-gray-500 mb-1.5 ml-1">Incorrect (-)</label>
                    <input
                      type="number" min={0} step={0.25}
                      value={activeSection.defaultNegativeMarks ?? exam.defaultNegativeMarks}
                      onChange={e => handleUpdateSectionMeta(activeSection.subject, { defaultNegativeMarks: Number(e.target.value) })}
                      className="w-20 bg-gray-50 border border-gray-200 text-gray-900 text-sm font-medium rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Add / Import Question Cards ─────────────────────────────────── */}
            {canEdit && activeSection.status !== 'READY' && (
              <>
                {/* Action Buttons Row */}
                {!adding && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setAdding(true); setEditingQId(null); }}
                      className="flex-1 bg-white rounded-2xl border border-gray-100 overflow-hidden flex items-center gap-3 p-5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-all">
                        <Plus size={16} />
                      </div>
                      <div className="text-left">
                        <span className="font-semibold text-sm block">Add a question</span>
                        <span className="text-xs text-gray-400">
                          {activeSection.subject.charAt(0) + activeSection.subject.slice(1).toLowerCase()} · {activeSection.questions.length} added so far
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex items-center gap-3 px-5 py-4 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                      style={{ minWidth: 180 }}
                    >
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center transition-all">
                        <Download size={15} className="text-indigo-500" />
                      </div>
                      <div className="text-left">
                        <span className="font-semibold text-sm block text-indigo-600">Import</span>
                        <span className="text-xs text-gray-400">From other exams</span>
                      </div>
                    </button>
                  </div>
                )}

                {/* Add Question Form (expanded) */}
                {adding && (
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <span className="text-sm font-bold text-gray-900">New Question</span>
                          <span className="text-xs text-gray-400 font-medium ml-2">
                            {activeSection.subject.charAt(0) + activeSection.subject.slice(1).toLowerCase()} · #{activeSection.questions.length + 1}
                          </span>
                        </div>
                      </div>
                      <QuestionForm
                        value={addDraft}
                        onChange={setAddDraft}
                        onSubmit={handleAddQuestion}
                        onCancel={() => { setAdding(false); setAddDraft(makeEmptyForm(activeSection.defaultMarks ?? exam?.defaultMarks, activeSection.defaultNegativeMarks ?? exam?.defaultNegativeMarks)); }}
                        submitLabel="Add Question"
                        loading={actionLoading === 'add'}
                        defaultMarks={activeSection.defaultMarks ?? exam.defaultMarks}
                        defaultNegativeMarks={activeSection.defaultNegativeMarks ?? exam.defaultNegativeMarks}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Questions List ───────────────────────────────────────────── */}
            {activeSection.questions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Radio size={20} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-500">No questions yet</p>
                <p className="text-xs text-gray-400 mt-1">Use the form above to start adding questions.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeSection.questions.map((q, i) => {
                  const isExpanded = expandedQ === q._id;
                  const isEditing = editingQId === q._id;
                  const isDeleting = actionLoading === 'del-' + q._id;
                  const isSaving = actionLoading === 'edit-' + q._id;

                  return (
                    <div key={q._id} className={`bg-white rounded-2xl border overflow-hidden transition-all ${isEditing ? 'border-gray-300 shadow-sm' : 'border-gray-100'}`}>

                      {/* Question header */}
                      <div
                        className={`flex items-start gap-3 p-4 transition-colors ${!isEditing ? 'cursor-pointer hover:bg-gray-50/50' : ''}`}
                        onClick={() => { if (!isEditing) { setExpandedQ(isExpanded ? null : q._id); } }}
                      >
                        <span className="text-xs font-black text-gray-300 mt-0.5 w-6 shrink-0">Q{i + 1}</span>
                        <div className={`flex-1 text-sm font-medium text-gray-800 leading-relaxed ${!isExpanded && !isEditing ? 'line-clamp-2 overflow-hidden' : ''}`}>
                          <RichTextDisplay html={q.text} />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                            +{q.marks}/−{q.negativeMarks}
                          </span>
                          {canEdit && activeSection.status !== 'READY' && !isEditing && (
                            <button
                              onClick={e => { e.stopPropagation(); handleStartEdit(q); }}
                              title="Edit question"
                              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-all"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          {!isEditing && (
                            isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Edit form */}
                      {isEditing && (
                        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                          <QuestionForm
                            value={editDraft}
                            onChange={setEditDraft}
                            onSubmit={handleSaveEdit}
                            onCancel={() => setEditingQId(null)}
                            submitLabel="Save Changes"
                            loading={isSaving}
                            defaultMarks={exam.defaultMarks}
                            defaultNegativeMarks={exam.defaultNegativeMarks}
                          />
                          <div className="mt-3 pt-3 border-t border-gray-50">
                            <button
                              onClick={() => handleRemoveQuestion(q._id)}
                              disabled={isDeleting}
                              className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-600 transition-colors"
                            >
                              {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                              Delete this question
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Expanded view (read-only) */}
                      {isExpanded && !isEditing && (
                        <div className="border-t border-gray-50 px-4 pb-4 pt-3 space-y-3">
                          {q.diagramUrl && !(q.diagramUrls && q.diagramUrls.includes(q.diagramUrl)) && (
                            <div className="mb-3 flex flex-col items-center">
                              <div className="flex justify-center cursor-pointer group relative" onClick={() => setExpandedImage(q.diagramUrl!)}>
                                <img src={q.diagramUrl} alt="Question diagram" className="max-h-48 object-contain rounded-lg border border-gray-100 bg-white hover:opacity-90 transition-opacity" />
                              </div>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-1"><span className="text-blue-500">↗</span> Click on the image to expand</span>
                            </div>
                          )}
                          {q.diagramUrls && q.diagramUrls.length > 0 && (
                            <div className="mb-3 flex flex-col items-center">
                              <div className="flex flex-wrap gap-3 justify-center w-full">
                                {q.diagramUrls.map(url => (
                                  <div key={url} className="flex justify-center cursor-pointer group relative" onClick={() => setExpandedImage(url)}>
                                    <img src={url} alt="Question diagram" className="max-h-48 object-contain rounded-lg border border-gray-100 bg-white hover:opacity-90 transition-opacity" />
                                  </div>
                                ))}
                              </div>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-1"><span className="text-blue-500">↗</span> Click on the image to expand</span>
                            </div>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt, oi) => {
                              const letter = String.fromCharCode(65 + oi);
                              const isCorrect = letter === q.correctAnswer;
                              return (
                                <div
                                  key={oi}
                                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm ${
                                    isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-gray-50 border-gray-100 text-gray-600'
                                  }`}
                                >
                                  <span className={`font-black text-[11px] w-4 shrink-0 ${isCorrect ? 'text-emerald-600' : 'text-gray-300'}`}>{letter}</span>
                                  <div className="font-medium flex-1 min-w-0"><RichTextDisplay html={opt} /></div>
                                  {isCorrect && (
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">✓ Correct</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {canEdit && activeSection.status !== 'READY' && (
                            <div className="flex items-center gap-3 pt-1">
                              <button
                                onClick={() => handleStartEdit(q)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                              >
                                <Pencil size={12} /> Edit question
                              </button>
                              <span className="text-gray-200">·</span>
                              <button
                                onClick={() => handleRemoveQuestion(q._id)}
                                disabled={isDeleting}
                                className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-600 transition-colors"
                              >
                                {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Approve Section ───────────────────────────────────────────── */}
            {canEdit && activeSection.status !== 'READY' && activeSection.questions.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    Done with {activeSection.subject.charAt(0) + activeSection.subject.slice(1).toLowerCase()}?
                  </p>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">
                    Approving this section locks it. No further edits will be allowed.
                  </p>
                </div>
                <button
                  onClick={handleApproveSection}
                  disabled={actionLoading === 'approve'}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all disabled:opacity-50 shrink-0"
                >
                  {actionLoading === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Approve Section
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Image Expansion Modal */}
      <dialog 
        ref={imageDialogRef}
        onClose={() => setExpandedImage(null)}
        onClick={(e) => {
          if (e.target === imageDialogRef.current) setExpandedImage(null);
        }}
        className="m-auto p-0 bg-transparent backdrop:bg-black/90 backdrop:backdrop-blur-sm outline-none border-none overflow-visible max-w-[100vw] max-h-[100vh]"
      >
        <div className="relative flex flex-col items-center justify-center p-4">
          <button 
            className="absolute -top-10 right-0 z-50 text-white hover:text-gray-300 p-2 bg-white/20 rounded-full backdrop-blur-md"
            onClick={() => setExpandedImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          {expandedImage && (
            <img 
              src={expandedImage} 
              alt="Expanded view" 
              className="max-w-full max-h-[85vh] object-contain bg-white rounded-lg shadow-2xl"
            />
          )}
        </div>
      </dialog>

      {/* Import Questions Modal */}
      <ImportQuestionsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        examId={id!}
        subject={activeTab}
        onImported={fetchExam}
      />
    </DashboardLayout>
  );
}

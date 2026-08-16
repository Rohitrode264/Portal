import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { RichTextDisplay } from './RichTextDisplay';
import { Icon } from './ui/Icon';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
type ImportableQuestion = {
  _id: string;
  text: string;
  marks: number;
  negativeMarks: number;
  difficulty: string;
  correctAnswer: string;
  options: string[];
  diagramUrl?: string;
  diagramUrls?: string[];
};

type ImportableExam = {
  _id: string;
  title: string;
  className: string;
  group: string;
  status: string;
  scheduledAt?: string;
  createdAt: string;
  questionCount: number;
  questions: ImportableQuestion[];
};

interface ImportQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string;
  subject: string;
  onImported: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: 'Draft',     color: 'var(--text-muted)', bg: 'var(--surface-sub)' },
  LOCKED:    { label: 'Locked',    color: 'var(--warning)',     bg: 'var(--warning-light)' },
  PUBLISHED: { label: 'Scheduled', color: 'var(--accent)',      bg: 'var(--accent-light)' },
  LIVE:      { label: 'Live',      color: 'var(--success)',     bg: 'var(--success-light)' },
  COMPLETED: { label: 'Completed', color: 'var(--accent)',      bg: 'var(--accent-light)' },
};

const GROUP_COLORS: Record<string, { color: string; bg: string }> = {
  PCM: { color: '#6366f1', bg: '#eef2ff' },
  PCB: { color: '#059669', bg: '#ecfdf5' },
};

const DIFFICULTY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  EASY:   { label: 'Easy',   color: '#16a34a', bg: '#f0fdf4' },
  MEDIUM: { label: 'Medium', color: '#d97706', bg: '#fffbeb' },
  HARD:   { label: 'Hard',   color: '#dc2626', bg: '#fef2f2' },
};

// ─── Component ────────────────────────────────────────────────────────────────
export function ImportQuestionsModal({
  isOpen, onClose, examId, subject, onImported,
}: ImportQuestionsModalProps) {
  const [step, setStep] = useState<'exams' | 'questions'>('exams');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exams, setExams] = useState<ImportableExam[]>([]);
  const [selectedExam, setSelectedExam] = useState<ImportableExam | null>(null);
  const [selectedQIds, setSelectedQIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [expandedQId, setExpandedQId] = useState<string | null>(null);

  // Fetch importable exams
  useEffect(() => {
    if (!isOpen) return;
    setStep('exams');
    setSelectedExam(null);
    setSelectedQIds(new Set());
    setSearch('');
    setExpandedQId(null);
    fetchImportableExams();
  }, [isOpen, examId, subject]);

  const fetchImportableExams = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/exams/${examId}/sections/${subject}/importable-exams`);
      setExams(res.data.exams || []);
    } catch {
      toast.error('Failed to load importable exams');
    } finally {
      setLoading(false);
    }
  };

  // Filtered exams
  const filteredExams = useMemo(() => {
    if (!search.trim()) return exams;
    const q = search.toLowerCase();
    return exams.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.className.toLowerCase().includes(q) ||
      e.group.toLowerCase().includes(q)
    );
  }, [exams, search]);

  // Handle exam selection
  const handleSelectExam = (exam: ImportableExam) => {
    setSelectedExam(exam);
    setSelectedQIds(new Set(exam.questions.map(q => q._id)));
    setStep('questions');
    setSearch('');
    setExpandedQId(null);
  };

  // Toggle question
  const toggleQuestion = (qId: string) => {
    setSelectedQIds(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  // Toggle all
  const toggleAll = () => {
    if (!selectedExam) return;
    if (selectedQIds.size === selectedExam.questions.length) {
      setSelectedQIds(new Set());
    } else {
      setSelectedQIds(new Set(selectedExam.questions.map(q => q._id)));
    }
  };

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    if (!selectedExam) return [];
    if (!search.trim()) return selectedExam.questions;
    const q = search.toLowerCase();
    return selectedExam.questions.filter(qu =>
      qu.text.toLowerCase().includes(q)
    );
  }, [selectedExam, search]);

  // Import handler
  const handleImport = async () => {
    if (!selectedExam || selectedQIds.size === 0) return;
    setImporting(true);
    try {
      const res = await api.post(`/exams/${examId}/sections/${subject}/import`, {
        sourceExamId: selectedExam._id,
        questionIds: Array.from(selectedQIds),
      });
      toast.success(res.data.message || `${selectedQIds.size} question(s) imported!`);
      onImported();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to import questions');
    } finally {
      setImporting(false);
    }
  };

  const subjectLabel = subject.charAt(0) + subject.slice(1).toLowerCase();

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="relative z-50">
          {/* Backdrop */}
          <motion.div
            key="import-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-none">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
              <motion.div
                key="import-panel"
                initial={{ opacity: 0, y: 40, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.96 }}
                transition={{ duration: 0.28, ease: [0.2, 0.9, 0.3, 1] }}
                className="w-full max-w-2xl pointer-events-auto relative flex flex-col overflow-hidden"
                style={{
                  background: 'var(--surface)',
                  borderRadius: 28,
                  boxShadow: '0 24px 80px -12px rgba(0,0,0,0.28), 0 0 0 1px var(--border)',
                  maxHeight: 'min(85vh, 720px)',
                }}
              >
                {/* ── Header ──────────────────────────────────────────────── */}
                <div
                  className="flex items-center gap-4 px-6 py-5 shrink-0"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  {/* Back button in step 2 */}
                  {step === 'questions' && (
                    <button
                      onClick={() => { setStep('exams'); setSearch(''); setExpandedQId(null); }}
                      className="flex items-center justify-center shrink-0 transition-all"
                      style={{
                        width: 36, height: 36, borderRadius: 12,
                        background: 'var(--surface-sub)',
                        color: 'var(--text-sub)',
                      }}
                    >
                      <Icon name="arrow_back" size={18} />
                    </button>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      {step === 'exams' && (
                        <div
                          className="flex items-center justify-center shrink-0"
                          style={{
                            width: 36, height: 36, borderRadius: 12,
                            background: 'var(--accent-light)',
                            color: 'var(--accent)',
                          }}
                        >
                          <Icon name="download" size={18} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h2
                          className="text-[15px] font-semibold truncate"
                          style={{ color: 'var(--text)' }}
                        >
                          {step === 'exams'
                            ? `Import ${subjectLabel} Questions`
                            : selectedExam?.title}
                        </h2>
                        <p
                          className="text-[12px] mt-0.5 truncate"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {step === 'exams'
                            ? 'Select an exam to import questions from'
                            : `${selectedExam?.className} · ${selectedExam?.group} · ${selectedExam?.questionCount} questions`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step Indicator */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                      style={{
                        background: step === 'exams' ? 'var(--accent)' : 'var(--surface-sub)',
                        color: step === 'exams' ? '#fff' : 'var(--text-muted)',
                      }}
                    >
                      <span style={{ width: 14, height: 14, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, background: step === 'exams' ? 'rgba(255,255,255,0.25)' : 'var(--border)', color: step === 'exams' ? '#fff' : 'var(--text-muted)' }}>1</span>
                      Exam
                    </div>
                    <Icon name="chevron_right" size={14} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                      style={{
                        background: step === 'questions' ? 'var(--accent)' : 'var(--surface-sub)',
                        color: step === 'questions' ? '#fff' : 'var(--text-muted)',
                      }}
                    >
                      <span style={{ width: 14, height: 14, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, background: step === 'questions' ? 'rgba(255,255,255,0.25)' : 'var(--border)', color: step === 'questions' ? '#fff' : 'var(--text-muted)' }}>2</span>
                      Select
                    </div>
                  </div>

                  {/* Close */}
                  <button
                    onClick={onClose}
                    className="flex items-center justify-center shrink-0 transition-all"
                    style={{
                      width: 36, height: 36, borderRadius: 12,
                      color: 'var(--text-muted)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-sub)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Icon name="close" size={18} />
                  </button>
                </div>

                {/* ── Search Bar ───────────────────────────────────────────── */}
                <div className="px-6 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div
                    className="flex items-center gap-2.5 px-3.5 py-2.5 transition-all"
                    style={{
                      borderRadius: 14,
                      background: 'var(--surface-sub)',
                      border: '1.5px solid transparent',
                    }}
                    onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; }}
                    onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-sub)'; }}
                    tabIndex={-1}
                  >
                    <Icon name="search" size={18} style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder={step === 'exams' ? 'Search exams by title, class, or group…' : 'Search questions…'}
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="flex-1 bg-transparent outline-none text-[13px] font-medium"
                      style={{ color: 'var(--text)' }}
                    />
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="flex items-center justify-center"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Icon name="close" size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Content ──────────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto" style={{ minHeight: 200 }}>
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <div className="import-spinner" />
                      <span className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>
                        Loading exams…
                      </span>
                    </div>
                  ) : step === 'exams' ? (
                    /* ── Step 1: Exam List ───────────────────────────────── */
                    <div className="px-4 py-3">
                      {filteredExams.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 gap-2">
                          <div
                            className="flex items-center justify-center"
                            style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--surface-sub)' }}
                          >
                            <Icon name="inbox" size={24} style={{ color: 'var(--text-muted)' }} />
                          </div>
                          <p className="text-[14px] font-semibold" style={{ color: 'var(--text-sub)' }}>
                            {search ? 'No matching exams' : 'No exams available'}
                          </p>
                          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                            {search
                              ? 'Try a different search term'
                              : `No other exams have ${subjectLabel} questions to import.`}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredExams.map(exam => {
                            const status = STATUS_MAP[exam.status] || STATUS_MAP.DRAFT;
                            const groupStyle = GROUP_COLORS[exam.group] || GROUP_COLORS.PCM;
                            return (
                              <button
                                key={exam._id}
                                onClick={() => handleSelectExam(exam)}
                                className="w-full text-left transition-all group"
                                style={{
                                  padding: '14px 16px',
                                  borderRadius: 16,
                                  border: '1.5px solid var(--border)',
                                  background: 'var(--surface)',
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.borderColor = 'var(--accent)';
                                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(79,70,229,0.08)';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.borderColor = 'var(--border)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                      <span
                                        className="text-[14px] font-semibold truncate"
                                        style={{ color: 'var(--text)' }}
                                      >
                                        {exam.title}
                                      </span>
                                      <span
                                        className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                                        style={{ color: groupStyle.color, background: groupStyle.bg }}
                                      >
                                        {exam.group}
                                      </span>
                                      <span
                                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ color: status.color, background: status.bg }}
                                      >
                                        {status.label}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                                        <Icon name="school" size={13} />
                                        {exam.className}
                                      </span>
                                      {exam.scheduledAt && (
                                        <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                                          <Icon name="event" size={13} />
                                          {new Date(exam.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <div
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                                      style={{ background: 'var(--accent-light)' }}
                                    >
                                      <Icon name="quiz" size={14} style={{ color: 'var(--accent)' }} />
                                      <span className="text-[13px] font-bold" style={{ color: 'var(--accent)' }}>
                                        {exam.questionCount}
                                      </span>
                                    </div>
                                    <Icon
                                      name="chevron_right"
                                      size={18}
                                      style={{ color: 'var(--text-muted)', opacity: 0.5 }}
                                      className="group-hover:translate-x-0.5 transition-transform"
                                    />
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ── Step 2: Question Selection ───────────────────────── */
                    <div className="px-4 py-3">
                      {/* Select All Bar */}
                      <div
                        className="flex items-center justify-between px-4 py-2.5 mb-2"
                        style={{ borderRadius: 14, background: 'var(--surface-sub)' }}
                      >
                        <button
                          onClick={toggleAll}
                          className="flex items-center gap-2.5 text-[13px] font-semibold transition-colors"
                          style={{ color: 'var(--text-sub)' }}
                        >
                          <span
                            className="flex items-center justify-center transition-all"
                            style={{
                              width: 20, height: 20, borderRadius: 6,
                              border: selectedQIds.size === selectedExam?.questions.length
                                ? '2px solid var(--accent)' : '2px solid var(--border)',
                              background: selectedQIds.size === selectedExam?.questions.length
                                ? 'var(--accent)' : 'transparent',
                              color: '#fff',
                            }}
                          >
                            {selectedQIds.size === selectedExam?.questions.length && (
                              <Icon name="check" size={14} />
                            )}
                          </span>
                          {selectedQIds.size === selectedExam?.questions.length ? 'Deselect all' : 'Select all'}
                        </button>
                        <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>
                          {selectedQIds.size} of {selectedExam?.questions.length} selected
                        </span>
                      </div>

                      {/* Questions */}
                      <div className="space-y-1.5">
                        {filteredQuestions.map((q, i) => {
                          const isSelected = selectedQIds.has(q._id);
                          const isExpanded = expandedQId === q._id;
                          const diff = DIFFICULTY_MAP[q.difficulty] || DIFFICULTY_MAP.MEDIUM;
                          return (
                            <div
                              key={q._id}
                              className="transition-all"
                              style={{
                                borderRadius: 14,
                                border: isSelected ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                                background: isSelected ? 'var(--accent-light)' : 'var(--surface)',
                              }}
                            >
                              {/* Question Row */}
                              <div
                                className="flex items-start gap-3 p-3.5 cursor-pointer"
                                onClick={() => toggleQuestion(q._id)}
                              >
                                {/* Checkbox */}
                                <span
                                  className="flex items-center justify-center shrink-0 mt-0.5 transition-all"
                                  style={{
                                    width: 20, height: 20, borderRadius: 6,
                                    border: isSelected ? '2px solid var(--accent)' : '2px solid var(--border)',
                                    background: isSelected ? 'var(--accent)' : 'transparent',
                                    color: '#fff',
                                  }}
                                >
                                  {isSelected && <Icon name="check" size={14} />}
                                </span>

                                {/* Question number */}
                                <span
                                  className="text-[11px] font-black mt-0.5 shrink-0"
                                  style={{ color: 'var(--text-muted)', width: 20 }}
                                >
                                  Q{i + 1}
                                </span>

                                {/* Question text */}
                                <div className="flex-1 min-w-0">
                                  <div className={`text-[13px] font-medium leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}
                                    style={{ color: 'var(--text)' }}
                                  >
                                    <RichTextDisplay html={q.text} />
                                  </div>
                                </div>

                                {/* Meta */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                                    style={{ color: diff.color, background: diff.bg }}
                                  >
                                    {diff.label}
                                  </span>
                                  <span
                                    className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                                    style={{ background: 'var(--surface-sub)', color: 'var(--text-muted)' }}
                                  >
                                    +{q.marks}/−{q.negativeMarks}
                                  </span>
                                  <button
                                    onClick={e => { e.stopPropagation(); setExpandedQId(isExpanded ? null : q._id); }}
                                    className="flex items-center justify-center transition-all"
                                    style={{
                                      width: 24, height: 24, borderRadius: 8,
                                      color: 'var(--text-muted)',
                                    }}
                                  >
                                    <Icon name={isExpanded ? 'expand_less' : 'expand_more'} size={18} />
                                  </button>
                                </div>
                              </div>

                              {/* Expanded Options */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div
                                      className="px-4 pb-3.5 pt-1"
                                      style={{ borderTop: '1px solid var(--border)' }}
                                    >
                                      {/* Diagram images */}
                                      {q.diagramUrl && !(q.diagramUrls?.includes(q.diagramUrl)) && (
                                        <div className="mb-2 flex justify-center">
                                          <img src={q.diagramUrl} alt="diagram" className="max-h-32 object-contain rounded-lg" style={{ border: '1px solid var(--border)' }} />
                                        </div>
                                      )}
                                      {q.diagramUrls && q.diagramUrls.length > 0 && (
                                        <div className="mb-2 flex flex-wrap gap-2 justify-center">
                                          {q.diagramUrls.map(url => (
                                            <img key={url} src={url} alt="diagram" className="max-h-32 object-contain rounded-lg" style={{ border: '1px solid var(--border)' }} />
                                          ))}
                                        </div>
                                      )}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {q.options.map((opt, oi) => {
                                          const letter = String.fromCharCode(65 + oi);
                                          const isCorrect = letter === q.correctAnswer;
                                          return (
                                            <div
                                              key={oi}
                                              className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px]"
                                              style={{
                                                background: isCorrect ? 'var(--success-light)' : 'var(--surface-sub)',
                                                border: isCorrect ? '1px solid var(--success-muted)' : '1px solid var(--border)',
                                                color: isCorrect ? 'var(--success)' : 'var(--text-sub)',
                                              }}
                                            >
                                              <span className="font-black text-[10px] w-4 shrink-0">
                                                {letter}
                                              </span>
                                              <div className="font-medium flex-1 min-w-0">
                                                <RichTextDisplay html={opt} />
                                              </div>
                                              {isCorrect && (
                                                <Icon name="check_circle" size={14} filled style={{ color: 'var(--success)' }} />
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Footer ──────────────────────────────────────────────── */}
                {step === 'questions' && (
                  <div
                    className="flex items-center justify-between gap-3 px-6 py-4 shrink-0"
                    style={{ borderTop: '1px solid var(--border)' }}
                  >
                    <p className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>
                      {selectedQIds.size > 0
                        ? `${selectedQIds.size} question${selectedQIds.size > 1 ? 's' : ''} will be copied into this exam`
                        : 'Select questions to import'}
                    </p>
                    <button
                      onClick={handleImport}
                      disabled={importing || selectedQIds.size === 0}
                      className="flex items-center gap-2 px-5 py-2.5 font-bold text-[13px] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        borderRadius: 14,
                        background: 'var(--accent)',
                        color: '#fff',
                        boxShadow: selectedQIds.size > 0 ? '0 2px 12px rgba(79,70,229,0.25)' : 'none',
                      }}
                      onMouseEnter={e => { if (selectedQIds.size > 0) e.currentTarget.style.background = 'var(--accent-hover)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
                    >
                      {importing ? (
                        <>
                          <div className="import-spinner-sm" />
                          Importing…
                        </>
                      ) : (
                        <>
                          <Icon name="download" size={16} />
                          Import {selectedQIds.size > 0 ? `(${selectedQIds.size})` : ''}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* Scoped spinner styles */}
          <style>{`
            .import-spinner {
              width: 28px; height: 28px;
              border: 3px solid var(--border);
              border-top-color: var(--accent);
              border-radius: 50%;
              animation: import-spin 0.7s linear infinite;
            }
            .import-spinner-sm {
              width: 16px; height: 16px;
              border: 2px solid rgba(255,255,255,0.3);
              border-top-color: #fff;
              border-radius: 50%;
              animation: import-spin 0.7s linear infinite;
            }
            @keyframes import-spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, AlertTriangle, Clock, CheckCircle2, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { RichTextDisplay } from '../../components/RichTextDisplay';

export function LiveExam() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [waitingApproval, setWaitingApproval] = useState(false);
  const [approvalStage, setApprovalStage] = useState<'waiting_coordinator' | 'verified_present'>('waiting_coordinator');
  const [activeSubject, setActiveSubject] = useState<string>('');
  const [showRules, setShowRules] = useState(true);

  // Tab tracking
  const [warningCount, setWarningCount] = useState(0);
  const { user } = useAuth();
  const [isBlurred, setIsBlurred] = useState(false);
  const [isSplitScreen, setIsSplitScreen] = useState(false);
  const initialWidth = useRef(window.innerWidth);
  const initialHeight = useRef(window.innerHeight);

  // Heartbeat interval
  useEffect(() => {
    if (!exam || !sessionData) return;
    const interval = setInterval(() => {
      api.post(`/live-exams/${id}/heartbeat`).catch(() => {
        console.warn('Heartbeat failed');
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [exam, sessionData, id]);

  // Tab Switch & Overlay Tracker
  const handleVisibilityChange = useCallback(async (reason?: string) => {
    if (document.hidden || reason) {
      setIsBlurred(true);
      try {
        const res = await api.post(`/live-exams/${id}/tab-switch`, { 
          reason: reason || (document.hidden ? 'Tab Switch / Background App' : 'Screen Focus Lost') 
        });
        if (res.data.autoSubmitted) {
          toast.error(res.data.message, { duration: 10000 });
          navigate('/dashboard', { replace: true });
        } else {
          setWarningCount(res.data.warningCount);
          toast.error(res.data.message, { duration: 5000, icon: '🚨' });
        }
      } catch (err) {
        console.error('Tab switch report failed', err);
      }
    } else {
      setTimeout(() => { if (!document.hidden) setIsBlurred(false); }, 400);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (!exam || !sessionData) return;
    
    const onVisibilityChange = () => handleVisibilityChange();
    document.addEventListener('visibilitychange', onVisibilityChange);
    
    const handleBlur = () => {
      setIsBlurred(true);
      handleVisibilityChange('Screen Focus Lost / Blur');
    };
    const handleFocus = () => {
      setTimeout(() => { if (!document.hidden) setIsBlurred(false); }, 400);
    };
    const handleResize = () => {
      if (window.innerHeight < initialHeight.current * 0.85 || window.innerWidth < initialWidth.current * 0.85) {
        if (!isSplitScreen) {
          setIsSplitScreen(true);
          handleVisibilityChange('Split-screen / Window Resize Detected');
        }
      } else {
        setIsSplitScreen(false);
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('resize', handleResize);
    };
  }, [exam, sessionData, handleVisibilityChange, isSplitScreen]);


  useEffect(() => {
    startExam();
  }, [id]);

  const startExam = async () => {
    try {
      const res = await api.post(`/live-exams/${id}/start`);
      if (res.status === 202 || res.data.waitingApproval) {
        setWaitingApproval(true);
        // Distinguish which stage the student is in based on the backend message
        if (res.data.message?.includes('Verified present')) {
          setApprovalStage('verified_present');
        } else {
          setApprovalStage('waiting_coordinator');
        }
        setTimeout(startExam, 5000); // Poll again in 5s
      } else {
        setWaitingApproval(false);
        setExam(res.data.exam);
        if (res.data.exam?.sections?.length === 1 && !activeSubject) {
          setActiveSubject(res.data.exam.sections[0].subject);
        } else if (!activeSubject) {
          setActiveSubject('');
        }
        setSessionData(res.data.session);
        setWarningCount(res.data.session.tabSwitchCount || 0);
        setTimeLeft(res.data.exam.remainingSeconds ?? res.data.exam.duration * 60);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start exam');
      navigate('/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  // Timer Countdown
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleFinalSubmit(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev! - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleAnswerSelect = async (questionId: string, selectedOption: string) => {
    // Optimistic UI update
    const newAnswers = [...sessionData.answers];
    const existingIdx = newAnswers.findIndex((a: any) => a.questionId === questionId);
    
    if (existingIdx >= 0) {
      newAnswers[existingIdx].selectedOption = selectedOption;
    } else {
      newAnswers.push({ questionId, selectedOption });
    }
    setSessionData({ ...sessionData, answers: newAnswers });

    // API Call
    try {
      await api.post(`/live-exams/${id}/answer`, { questionId, selectedOption });
    } catch (error) {
      toast.error('Failed to save answer. Connection issue.');
    }
  };

  const handleClearAnswer = async (questionId: string) => {
    const newAnswers = sessionData.answers.filter((a: any) => a.questionId !== questionId);
    setSessionData({ ...sessionData, answers: newAnswers });

    try {
      await api.post(`/live-exams/${id}/answer`, { questionId, selectedOption: null });
    } catch (error) {
      toast.error('Failed to clear answer.');
    }
  };

  const handleFinalSubmit = async (auto = false) => {
    if (!auto && !window.confirm('Are you sure you want to submit your exam? You cannot change answers after submitting.')) return;
    
    setSubmitting(true);
    try {
      await api.post(`/live-exams/${id}/submit`);
      toast.success('Exam submitted successfully!');
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit exam');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Brand header */}
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <img src="/images/merit_logo.png" alt="Merit Logo" className="w-8 h-8 rounded-lg object-contain shadow-xs bg-white p-0.5" />
            <div className="text-left">
              <p className="text-xs font-black text-gray-900 leading-none tracking-tight">Merit</p>
              <p className="text-[9px] text-gray-500 font-bold leading-tight uppercase tracking-wider mt-0.5">By New Career Point · Exam Lobby</p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-0 mb-10">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 bg-blue-600 border-blue-600 text-white animate-pulse">
                1
              </div>
              <p className="text-[10px] mt-1.5 font-medium text-blue-600">Check-in</p>
            </div>
            <div className="w-16 h-0.5 mb-4 bg-gray-200" />
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 bg-white border-gray-200 text-gray-400">
                2
              </div>
              <p className="text-[10px] mt-1.5 font-medium text-gray-400">Exam launch</p>
            </div>
            <div className="w-16 h-0.5 mb-4 bg-gray-200" />
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 bg-white border-gray-200 text-gray-400">
                3
              </div>
              <p className="text-[10px] mt-1.5 font-medium text-gray-400">Answering</p>
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-white border border-blue-200 rounded-2xl p-6 text-center shadow-sm bg-gradient-to-b from-blue-50/40 to-white">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100 shadow-inner">
                  <Loader2 size={26} className="text-blue-600 animate-spin" />
                </div>
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white animate-pulse" />
              </div>
            </div>
            <h2 className="text-base font-bold text-gray-900 mb-1.5">Verifying Session & Device...</h2>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              Connecting securely to the exam lobby. Please hold on while we verify your attendance and session status.
            </p>
            <div className="flex items-center justify-center gap-2 mt-5 pt-4 border-t border-gray-100/80">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Establishing Secure Lock…</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (waitingApproval) {
    const isVerified = approvalStage === 'verified_present';
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Brand header */}
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <img src="/images/merit_logo.png" alt="Merit Logo" className="w-8 h-8 rounded-lg object-contain shadow-xs bg-white p-0.5" />
            <div className="text-left">
              <p className="text-xs font-black text-gray-900 leading-none tracking-tight">Merit</p>
              <p className="text-[9px] text-gray-500 font-bold leading-tight uppercase tracking-wider mt-0.5">By New Career Point · Exam Lobby</p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-0 mb-10">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 ${
                isVerified
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'bg-blue-600 border-blue-600 text-white animate-pulse'
              }`}>
                {isVerified ? <CheckCircle2 size={14} /> : '1'}
              </div>
              <p className={`text-[10px] mt-1.5 font-medium ${isVerified ? 'text-green-600' : 'text-blue-600'}`}>Check-in</p>
            </div>

            {/* Connector */}
            <div className={`w-16 h-0.5 mb-4 ${isVerified ? 'bg-green-400' : 'bg-gray-200'}`} />

            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 ${
                isVerified
                  ? 'bg-blue-600 border-blue-600 text-white animate-pulse'
                  : 'bg-white border-gray-200 text-gray-400'
              }`}>
                {isVerified ? '2' : '2'}
              </div>
              <p className={`text-[10px] mt-1.5 font-medium ${isVerified ? 'text-blue-600' : 'text-gray-400'}`}>Exam launch</p>
            </div>

            {/* Connector */}
            <div className="w-16 h-0.5 mb-4 bg-gray-200" />

            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 bg-white border-gray-200 text-gray-400">
                3
              </div>
              <p className="text-[10px] mt-1.5 font-medium text-gray-400">Answering</p>
            </div>
          </div>

          {/* Status Card */}
          <div className={`bg-white border rounded-2xl p-6 text-center shadow-sm ${
            isVerified ? 'border-green-200 bg-gradient-to-b from-green-50/40 to-white' : 'border-blue-200 bg-gradient-to-b from-blue-50/40 to-white'
          }`}>
            {/* Animated icon */}
            <div className="flex justify-center mb-4">
              {isVerified ? (
                <div className="relative">
                  <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center border border-green-100 shadow-inner">
                    <CheckCircle2 size={26} className="text-green-600" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white animate-pulse" />
                </div>
              ) : (
                <div className="relative">
                  <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100 shadow-inner">
                    <Clock size={26} className="text-blue-600 animate-pulse" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white animate-pulse" />
                </div>
              )}
            </div>

            <h2 className="text-base font-bold text-gray-900 mb-1.5">
              {isVerified ? 'You\'re Verified — Hang Tight!' : 'Awaiting Check-in & Verification'}
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              {isVerified
                ? 'The invigilator has marked you present. The exam paper will unlock automatically once attendance is complete.'
                : 'Please show your ID or admission number to your room coordinator. Once marked present, your paper will unlock.'}
            </p>

            {/* Live pulse indicator */}
            <div className="flex items-center justify-center gap-2 mt-5 pt-4 border-t border-gray-100/80">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Live Sync · Checking every 5s…</span>
            </div>
          </div>

          <p className="text-[10px] text-gray-300 text-center mt-6">
            Do not close this window or switch apps.
          </p>
        </div>
      </div>
    );
  }

  if (!exam) return null;

  return (
    <div 
      className="min-h-screen bg-slate-50 select-none [-webkit-touch-callout:none] [-webkit-user-select:none] [user-select:none] relative pb-20"
      onCopy={e => e.preventDefault()}
      onCut={e => e.preventDefault()}
      onPaste={e => e.preventDefault()}
      onContextMenu={e => e.preventDefault()}
    >
      {/* ── Rules Modal Overlay (Google Design Standard) ── */}
      {showRules && (
        <div className="fixed inset-0 z-[200] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-blue-600 px-6 py-5 flex items-center gap-3">
              <ShieldAlert className="text-white" size={24} />
              <h2 className="text-lg font-black text-white tracking-tight">Exam Rules & Guidelines</h2>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-5">
              <p className="text-sm text-gray-600 font-medium leading-relaxed">
                Please read the following instructions carefully before starting your exam. Violation of these rules will result in immediate penalties.
              </p>
              
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3 shadow-sm">
                <div className="mt-0.5"><AlertTriangle size={18} className="text-red-500" /></div>
                <div>
                  <h3 className="text-sm font-bold text-red-800 uppercase tracking-tight mb-1">Violation Credits System</h3>
                  <p className="text-xs text-red-700 leading-relaxed font-medium">
                    You have exactly <strong>5 violation credits</strong>. Every time you leave the exam screen, switch tabs, open another app, or trigger a split-screen, 1 credit is deducted. 
                    <strong> When all 5 credits are ruined, your test will auto-submit immediately.</strong>
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-inner">1</div>
                  <p className="text-xs text-gray-700 font-medium leading-relaxed"><strong>No Tab Switching:</strong> Navigating away from the test tab will trigger a security alert and deduct a violation credit.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-inner">2</div>
                  <p className="text-xs text-gray-700 font-medium leading-relaxed"><strong>No Split Screen / Resize:</strong> Resizing the window or opening split-screen apps (like WhatsApp, AI assistants, or floating calculators) is strictly prohibited.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-inner">3</div>
                  <p className="text-xs text-gray-700 font-medium leading-relaxed"><strong>Do Not Close the Browser:</strong> If you accidentally close the browser, your session will be locked, and you must report to the coordinator.</p>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowRules(false)}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 hover:shadow-md transition-all flex items-center gap-2"
              >
                <CheckCircle2 size={18} /> I Understand, Start Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Security Overlay Redesign (Google Standard) ── */}
      {(isBlurred || isSplitScreen) && (
        <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="bg-white border border-gray-200 shadow-2xl rounded-3xl p-8 max-w-lg w-full flex flex-col items-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 border border-red-100 animate-pulse shadow-inner">
              <AlertTriangle className="text-red-500" size={40} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3 text-gray-900 uppercase">
              {isSplitScreen ? 'Split-Screen Detected' : 'Screen Focus Lost'}
            </h2>
            <p className="text-sm text-gray-500 max-w-md leading-relaxed font-semibold mb-8">
              {isSplitScreen 
                ? 'Opening split-screen apps, resizing the window, or floating AI assistants (Gemini/WhatsApp) is strictly prohibited. Restore full-screen mode instantly.'
                : 'Holding the navigation bar (Circle to Search), taking screenshots, or switching tabs causes an instant security violation. Your action has been logged.'}
            </p>
            <div className="bg-red-50 border border-red-200 px-6 py-4 rounded-2xl w-full text-center">
              <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">Violation Strike</p>
              <p className="text-2xl font-black text-red-600 font-mono">{warningCount} / 5</p>
              <p className="text-[11px] text-red-400 font-bold uppercase tracking-wider mt-1">Auto-submit on 5th violation</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Dynamic Identity Grid Watermark ── */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden flex flex-wrap items-center justify-center gap-16 p-6 opacity-[0.05]" style={{ transform: 'rotate(-25deg)' }}>
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="text-slate-900 font-black text-sm whitespace-nowrap tracking-widest uppercase">
            {sessionData?.studentCpId || user?.cpId || 'STUDENT'} • {user?.name || 'CET BUCKET'} • PROTECTED EXAM SESSION
          </div>
        ))}
      </div>

      {/* Top Bar with Prominent Violation Credits */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 px-4 sm:px-6 py-3.5 shadow-xs">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight leading-tight">{exam.title}</h1>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">{exam.group} • Clean Minimalistic Exam UI</p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* Prominent Violation Credits Badge on top */}
            {(() => {
              const creditsLeft = Math.max(0, 5 - warningCount);
              return (
                <div className={`px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-black border shadow-2xs transition-all ${
                  creditsLeft >= 4
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : creditsLeft >= 2
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-red-50 text-red-600 border-red-200 animate-pulse'
                }`}>
                  {creditsLeft >= 4 ? <ShieldCheck size={16} className="text-emerald-600" /> : <ShieldAlert size={16} className={creditsLeft >= 2 ? 'text-amber-600' : 'text-red-500'} />}
                  <span>VIOLATION CREDITS: <strong className="font-mono text-sm font-black">{creditsLeft}</strong>/5 LEFT</span>
                </div>
              );
            })()}
            
            <div className="bg-gray-900 text-white px-3.5 py-1.5 rounded-xl flex items-center gap-2 font-mono font-bold text-base shadow-inner">
              <Clock size={16} className={timeLeft! < 300 ? 'text-red-400 animate-pulse' : 'text-gray-400'} />
              <span className={timeLeft! < 300 ? 'text-red-400' : ''}>
                {Math.floor(timeLeft! / 60).toString().padStart(2, '0')}:{(timeLeft! % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <button 
              onClick={() => handleFinalSubmit(false)}
              disabled={submitting}
              className="bg-blue-600 text-white px-5 py-2 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </button>
          </div>
        </div>
      </div>

      {/* Security Notice Bar */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-center text-[11px] font-bold text-amber-900 flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
        <span>SECURITY LOCKOUT ACTIVE: Single session & anti-cheat enforced. Do not switch tabs.</span>
      </div>

      {/* Main Content: Collapsible Section Accordion */}
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="mb-6">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1">Exam Sections Overview</h2>
          <p className="text-xs font-semibold text-gray-600">
            Click on any subject below (e.g., Physics, Chemistry) to open and answer its questions. Click again to collapse.
          </p>
        </div>

        <div className="space-y-4">
          {exam.sections.map((section: any, idx: number) => {
            const isOpen = activeSubject === section.subject;
            const answeredCount = section.questions.filter((q: any) => 
              sessionData.answers.some((a: any) => a.questionId === q._id && a.selectedOption)
            ).length;
            const totalCount = section.questions.length;
            const isCompleted = answeredCount === totalCount && totalCount > 0;

            return (
              <div 
                key={section.subject}
                className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                  isOpen 
                    ? 'border-blue-600 shadow-md ring-1 ring-blue-600/10' 
                    : 'border-gray-200/80 shadow-xs hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                {/* Accordion Header */}
                <button
                  onClick={() => setActiveSubject(isOpen ? '' : section.subject)}
                  className={`w-full px-6 py-4 flex items-center justify-between text-left transition-colors ${
                    isOpen ? 'bg-blue-50/50 border-b border-gray-100' : 'bg-white hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs font-mono transition-colors ${
                      isOpen ? 'bg-blue-600 text-white shadow-sm' : isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                        {section.subject}
                        {isCompleted && <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider font-sans">Completed</span>}
                      </h3>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        {totalCount} Total Questions • Minimalistic View
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-3 py-1 rounded-full font-mono font-bold ${
                      answeredCount > 0 
                        ? 'bg-blue-100/80 text-blue-800 border border-blue-200/50' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {answeredCount}/{totalCount} Answered
                    </span>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-200 ${
                      isOpen ? 'bg-blue-600 text-white rotate-180' : 'bg-gray-100 text-gray-500'
                    }`}>
                      ▼
                    </span>
                  </div>
                </button>

                {/* Accordion Content (Questions) */}
                {isOpen && (
                  <div className="p-6 bg-gray-50/30 space-y-6 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-200/60 text-xs">
                      <span className="font-bold text-gray-500 uppercase tracking-wider">Select option A, B, C, or D below</span>
                      <span className="font-mono text-gray-600 font-semibold">{totalCount - answeredCount} Remaining in {section.subject}</span>
                    </div>

                    {section.questions.map((q: any, i: number) => {
                      const answer = sessionData.answers.find((a: any) => a.questionId === q._id);

                      return (
                        <div key={q._id} className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200/80 shadow-2xs hover:border-gray-300/80 transition-all">
                          <div className="flex justify-between items-start gap-4 mb-5">
                            <div className="font-bold text-gray-900 text-sm sm:text-base leading-relaxed font-sans flex-1 overflow-hidden">
                              <span className="font-black text-blue-600 mr-2 font-mono float-left mt-1">Q{i + 1}.</span> 
                              <RichTextDisplay html={q.text} />
                            </div>
                            <span className="shrink-0 text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200/60 font-mono">
                              +{q.marks} / -{q.negativeMarks}
                            </span>
                          </div>
                          
                          {q.diagramUrl && !(q.diagramUrls && q.diagramUrls.includes(q.diagramUrl)) && (
                            <div className="mb-6 flex justify-center cursor-pointer" onClick={() => setExpandedImage(q.diagramUrl)}>
                              <img src={q.diagramUrl} alt="Question diagram" className="max-h-64 object-contain rounded-xl border border-gray-100 shadow-sm bg-white hover:opacity-90 transition-opacity" />
                            </div>
                          )}
                          {q.diagramUrls && q.diagramUrls.length > 0 && (
                            <div className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-2">
                              {q.diagramUrls.map((url: string) => (
                                <div key={url} className="flex justify-center cursor-pointer" onClick={() => setExpandedImage(url)}>
                                  <img src={url} alt="Question diagram" className="max-h-64 object-contain rounded-xl border border-gray-100 shadow-sm bg-white hover:opacity-90 transition-opacity" />
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {q.options.map((opt: string, optIndex: number) => {
                              const letter = String.fromCharCode(65 + optIndex);
                              const isSelected = answer?.selectedOption === letter;
                              
                              return (
                                <button
                                  key={optIndex}
                                  onClick={() => handleAnswerSelect(q._id, letter)}
                                  className={`p-3 sm:p-3.5 rounded-xl text-left border-2 transition-all flex items-center gap-3 ${
                                    isSelected 
                                      ? 'bg-blue-50 border-blue-600 text-blue-950 font-bold shadow-2xs' 
                                      : 'bg-gray-50/50 border-gray-100 hover:border-gray-300 hover:bg-gray-100/60 text-gray-700 font-medium'
                                  }`}
                                >
                                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition-colors font-mono ${
                                    isSelected ? 'bg-blue-600 text-white shadow-2xs' : 'bg-white text-gray-500 border border-gray-200'
                                  }`}>
                                    {letter}
                                  </span>
                                  <div className="text-xs sm:text-sm leading-snug font-sans text-left flex-1 min-w-0"><RichTextDisplay html={opt} /></div>
                                </button>
                              );
                            })}
                          </div>
                          
                          {answer && (
                            <div className="mt-3 pt-2.5 border-t border-gray-100 flex justify-end">
                              <button 
                                onClick={() => handleClearAnswer(q._id)}
                                className="text-[11px] font-bold text-gray-400 hover:text-red-600 transition-colors uppercase tracking-wider flex items-center gap-1"
                              >
                                <span>Clear Selection</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Section Quick Footer */}
                    <div className="pt-4 border-t border-gray-200/60 flex items-center justify-between">
                      <button
                        onClick={() => setActiveSubject('')}
                        className="text-xs font-bold text-gray-500 hover:text-gray-900 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        ↑ Collapse {section.subject}
                      </button>
                      
                      {(() => {
                        const nextSection = exam.sections[idx + 1];
                        return nextSection ? (
                          <button
                            onClick={() => {
                              setActiveSubject(nextSection.subject);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="text-xs font-bold text-white px-5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 transition-all flex items-center gap-1.5 shadow-xs"
                          >
                            <span>Open Next: {nextSection.subject}</span>
                            <span>→</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleFinalSubmit(false)}
                            disabled={submitting}
                            className="text-xs font-bold text-white px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all shadow-xs disabled:opacity-50"
                          >
                            {submitting ? 'Submitting...' : 'Review & Submit Exam'}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {expandedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setExpandedImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 bg-black/50 rounded-full"
            onClick={() => setExpandedImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={expandedImage} 
            alt="Expanded view" 
            className="max-w-full max-h-[90vh] object-contain bg-white rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

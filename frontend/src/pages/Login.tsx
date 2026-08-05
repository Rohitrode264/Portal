import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

type LoginStep = 'IDENTIFIER' | 'PASSWORD' | 'OTP' | 'FORGOT_INIT' | 'FORGOT_VERIFY';

export function LoginPage() {
  const [step, setStep] = useState<LoginStep>('IDENTIFIER');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<{ name?: string; role?: string; message: string; alreadySent?: boolean; cpId?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (step === 'OTP' && otpRefs.current[0]) {
      otpRefs.current[0].focus();
    }
  }, [step]);

  const handleInitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    try {
      setIsLoading(true);
      setErrorMessage('');
      const res = await api.post('/auth/login-init', { identifier });
      const { nextStep, message, name, role, alreadySent } = res.data;
      setUserData({ name, role, message, alreadySent });
      setStep(nextStep);
      if (alreadySent) {
        toast.success('An active OTP is already on your WhatsApp!');
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || 'User not found. Please check your CP ID.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotInit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    try {
      setIsLoading(true);
      setErrorMessage('');
      const res = await api.post('/auth/forgot-password-init', { identifier });
      toast.success(res.data.message);
      setUserData(prev => ({ ...(prev || {}), message: res.data.message, cpId: res.data.cpId }));
      setStep('FORGOT_VERIFY');
      setOtp(['', '', '', '', '', '']);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'No active account found with that ID or email.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setErrorMessage('');
      const otpCode = otp.join('');
      if (otpCode.length !== 6) { toast.error('Enter a valid 6-digit verification code'); return; }
      if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
      const res = await api.post('/auth/forgot-password-verify', {
        cpId: userData?.cpId || identifier,
        otp: otpCode,
        newPassword
      });
      toast.success(res.data.message);
      setStep('PASSWORD');
      setPassword('');
      setNewPassword('');
      setOtp(['', '', '', '', '', '']);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Invalid or expired verification code.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setIsLoading(true);
      setErrorMessage('');
      const payload: any = { identifier };
      if (step === 'PASSWORD') {
        payload.password = password;
      } else if (step === 'OTP') {
        payload.otp = otp.join('');
        if (payload.otp.length !== 6) { toast.error('Enter a valid 6-digit OTP'); return; }
      }
      const res = await api.post('/auth/login-verify', payload);
      login(res.data.user, res.data.accessToken || res.data.token, res.data.refreshToken);
      toast.success(`Welcome, ${res.data.user.name.split(' ')[0]}!`);
      navigate('/dashboard');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Invalid credentials or expired OTP.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length > 1) {
      const newOtp = ['', '', '', '', '', ''];
      const pasted = digits.slice(0, 6).split('');
      pasted.forEach((c, i) => { newOtp[i] = c; });
      setOtp(newOtp);
      const nextFocus = Math.min(pasted.length, 5);
      otpRefs.current[nextFocus]?.focus();
      return;
    }

    const singleDigit = digits.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = singleDigit;
    setOtp(newOtp);

    if (singleDigit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        e.preventDefault();
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        otpRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    const newOtp = ['', '', '', '', '', ''];
    digits.split('').forEach((c, i) => { newOtp[i] = c; });
    setOtp(newOtp);
    const nextFocus = Math.min(digits.length, 5);
    otpRefs.current[nextFocus]?.focus();
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ fontFamily: "'Gilroy', system-ui, sans-serif" }}
    >
      {/* ── LEFT — Brand column ── */}
      <div className="hidden lg:flex w-[46%] xl:w-[42%] bg-gradient-to-br from-[#0B192C] via-[#1E3E62] to-[#000000] flex-col justify-between px-14 py-14 relative overflow-hidden shadow-2xl">

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Top glow */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <img
            src="/images/merit_logo.png"
            alt="Merit"
            className="w-16 h-16 rounded-xl object-contain shadow-lg"
          />
          <div>
            <div className="text-white font-black text-[20px] leading-none tracking-tight">Merit</div>
            <div className="text-blue-400 text-[9.5px] font-bold uppercase tracking-[0.25em] mt-1.5">By New Career Point</div>
          </div>
        </div>

        {/* Centre content */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            {/* Inline SVG illustration */}
            <svg
              viewBox="0 0 400 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full max-w-[380px] mx-auto mb-10 select-none"
            >
              {/* Desk surface */}
              <rect x="40" y="230" width="320" height="8" rx="4" fill="#1e293b" />

              {/* Monitor stand */}
              <rect x="183" y="200" width="34" height="32" rx="3" fill="#1e293b" />
              <rect x="163" y="228" width="74" height="6" rx="3" fill="#334155" />

              {/* Monitor */}
              <rect x="80" y="80" width="240" height="124" rx="12" fill="#0f172a" stroke="#334155" strokeWidth="2" />
              <rect x="88" y="88" width="224" height="108" rx="8" fill="#0d1117" />

              {/* Screen: code lines */}
              <rect x="100" y="100" width="80" height="5" rx="2.5" fill="#3b82f6" opacity="0.9" />
              <rect x="100" y="112" width="120" height="4" rx="2" fill="#475569" opacity="0.7" />
              <rect x="108" y="123" width="90" height="4" rx="2" fill="#475569" opacity="0.5" />
              <rect x="108" y="134" width="60" height="4" rx="2" fill="#22d3ee" opacity="0.7" />
              <rect x="100" y="145" width="110" height="4" rx="2" fill="#475569" opacity="0.5" />
              <rect x="108" y="156" width="75" height="4" rx="2" fill="#a78bfa" opacity="0.7" />
              <rect x="100" y="167" width="50" height="4" rx="2" fill="#475569" opacity="0.4" />
              <rect x="108" y="178" width="95" height="4" rx="2" fill="#34d399" opacity="0.7" />

              {/* Cursor blink */}
              <rect x="207" y="178" width="2" height="10" rx="1" fill="#3b82f6">
                <animate attributeName="opacity" values="1;0;1" dur="1.2s" repeatCount="indefinite" />
              </rect>

              {/* Floating card 1 — top right */}
              <rect x="268" y="90" width="88" height="52" rx="10" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1" opacity="0.95" />
              <circle cx="282" cy="106" r="8" fill="#3b82f6" opacity="0.3" />
              <rect cx="282" cy="106" x="278" y="102" width="8" height="8" rx="4" fill="#3b82f6" />
              <rect x="296" y="101" width="48" height="4" rx="2" fill="#94a3b8" opacity="0.8" />
              <rect x="296" y="109" width="32" height="3" rx="1.5" fill="#475569" opacity="0.6" />
              <rect x="278" y="120" width="68" height="3" rx="1.5" fill="#1d4ed8" opacity="0.5" />
              <rect x="278" y="128" width="50" height="3" rx="1.5" fill="#1d4ed8" opacity="0.3" />

              {/* Floating card 2 — bottom left */}
              <rect x="44" y="150" width="80" height="58" rx="10" fill="#0f2d1a" stroke="#22c55e" strokeWidth="1" opacity="0.95" />
              <rect x="56" y="162" width="56" height="4" rx="2" fill="#4ade80" opacity="0.8" />
              <rect x="56" y="172" width="40" height="3" rx="1.5" fill="#475569" opacity="0.5" />
              {/* Mini bar chart */}
              <rect x="56" y="192" width="10" height="8" rx="2" fill="#22c55e" opacity="0.5" />
              <rect x="70" y="185" width="10" height="15" rx="2" fill="#22c55e" opacity="0.7" />
              <rect x="84" y="188" width="10" height="12" rx="2" fill="#22c55e" opacity="0.9" />
              <rect x="98" y="182" width="10" height="18" rx="2" fill="#22c55e" />

              {/* Floating badge — top left */}
              <rect x="44" y="88" width="72" height="30" rx="15" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1" />
              <circle cx="60" cy="103" r="5" fill="#818cf8" opacity="0.8" />
              <rect x="70" y="99" width="36" height="4" rx="2" fill="#94a3b8" opacity="0.8" />
              <rect x="70" y="107" width="24" height="3" rx="1.5" fill="#475569" opacity="0.5" />

              {/* Stars / sparkles */}
              <g opacity="0.6">
                <circle cx="258" cy="60" r="2" fill="#facc15" />
                <circle cx="340" cy="110" r="1.5" fill="#facc15" />
                <circle cx="52" cy="145" r="1.5" fill="#facc15" />
                <circle cx="370" cy="200" r="2" fill="#3b82f6" />
                <circle cx="30" cy="200" r="2" fill="#a78bfa" />
              </g>

              {/* Books on desk */}
              <rect x="290" y="204" width="18" height="28" rx="2" fill="#1d4ed8" />
              <rect x="310" y="208" width="14" height="24" rx="2" fill="#7c3aed" />
              <rect x="326" y="212" width="16" height="20" rx="2" fill="#0e7490" />
              <rect x="344" y="210" width="4" height="22" rx="1" fill="#475569" opacity="0.5" />

              {/* Coffee cup */}
              <rect x="55" y="210" width="22" height="22" rx="4" fill="#292524" />
              <rect x="57" y="212" width="18" height="14" rx="3" fill="#1c1917" />
              <path d="M77 216 Q84 216 84 222 Q84 228 77 228" stroke="#44403c" strokeWidth="2" fill="none" strokeLinecap="round" />
              <rect x="60" y="208" width="14" height="3" rx="1.5" fill="#44403c" />
              {/* Steam */}
              <path d="M62 204 Q64 200 62 196" stroke="#475569" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6">
                <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
              </path>
              <path d="M68 202 Q70 198 68 194" stroke="#475569" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.4">
                <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" begin="0.5s" repeatCount="indefinite" />
              </path>
            </svg>

            <h2 className="text-white text-[32px] font-black leading-tight tracking-tight">
              Learn without<br />
              <span className="text-blue-400">limits.</span>
            </h2>
            <p className="text-neutral-500 text-sm mt-3 leading-relaxed max-w-xs font-medium">
              Your gateway to structured courses, progress tracking, and direct access to educators.
            </p>
          </motion.div>
        </div>

        {/* Bottom copyright */}
        <div className="relative z-10">
          <p className="text-neutral-600 text-xs font-medium">
            © {new Date().getFullYear()} Merit by New Career Point. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── RIGHT — Form ── */}
      <div className="flex-1 bg-[#f8fafc] relative flex flex-col overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-200/20 rounded-full blur-[120px] -translate-y-1/4 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-200/20 rounded-full blur-[120px] translate-y-1/4 -translate-x-1/4 pointer-events-none" />

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-6 pt-8 pb-4 relative z-10">
          <img src="/images/merit_logo.png" alt="Merit" className="w-12 h-12 rounded-xl object-contain" />
          <div>
            <div className="text-gray-900 font-black text-[18px] leading-none">Merit</div>
            <div className="text-blue-500 text-[9px] font-bold uppercase tracking-[0.2em] mt-0.5">By New Career Point</div>
          </div>
        </div>

        {/* Centred form */}
        <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
          <div className="w-full max-w-[420px] bg-white/70 backdrop-blur-xl border border-white/80 p-8 sm:p-10 rounded-[32px] shadow-[0_8px_40px_rgb(0,0,0,0.04)]">

            {/* Step label + heading */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`hdr-${step}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-9"
              >
                {step !== 'IDENTIFIER' && (
                  <button
                    onClick={() => {
                      if (step === 'FORGOT_VERIFY') setStep('FORGOT_INIT');
                      else if (step === 'FORGOT_INIT') setStep('PASSWORD');
                      else setStep('IDENTIFIER');
                    }}
                    className="mb-5 w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}

                <span className="inline-block text-[10px] font-bold text-blue-500 uppercase tracking-[0.22em] mb-3">
                  {step === 'IDENTIFIER' ? 'Sign in' : step === 'PASSWORD' ? 'Password' : step.startsWith('FORGOT') ? 'Account Recovery' : 'Verification'}
                </span>

                <h1 className="text-[36px] font-black text-gray-900 leading-none tracking-tight">
                  {step === 'IDENTIFIER' && 'Welcome\nback.'}
                  {step === 'PASSWORD' && `Hello,\n${userData?.name?.split(' ')[0] || 'back'}.`}
                  {step === 'OTP' && 'Check\nWhatsApp.'}
                  {step === 'FORGOT_INIT' && 'Reset\nPassword.'}
                  {step === 'FORGOT_VERIFY' && 'Verify &\nReset.'}
                </h1>

                <p className="text-gray-500 text-sm mt-3 font-medium leading-relaxed">
                  {step === 'IDENTIFIER' && 'Enter your CP ID or registered email to continue.'}
                  {step === 'PASSWORD' && 'Enter your password to access your account.'}
                  {step === 'OTP' && (userData?.message || 'A 6-digit OTP has been sent to your registered WhatsApp number.')}
                  {step === 'FORGOT_INIT' && 'Enter your registered CP ID or Email to receive a verification code.'}
                  {step === 'FORGOT_VERIFY' && (userData?.message || 'Enter the 6-digit code sent to your email and your new password.')}
                </p>

                {userData?.alreadySent && step === 'OTP' && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-800 text-xs p-3.5 rounded-2xl font-semibold flex items-center gap-2.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping shrink-0" />
                    An active OTP is already on your WhatsApp! Please enter it below to access your session.
                  </div>
                )}

                {errorMessage && (
                  <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-2xl font-semibold flex items-center gap-2.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                    {errorMessage}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* ── Forms ── */}
            <AnimatePresence mode="wait">
              {step === 'IDENTIFIER' && (
                <motion.form
                  key="f-id"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.22 }}
                  onSubmit={handleInitLogin}
                >
                  <Input
                    label="CP ID or Email"
                    placeholder="e.g. CP20264960"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    autoFocus
                  />
                  <div className="mt-5">
                    <Button type="submit" isLoading={isLoading} disabled={!identifier.trim()}>
                      Continue
                    </Button>
                  </div>
                </motion.form>
              )}

              {step === 'PASSWORD' && (
                <motion.form
                  key="f-pw"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.22 }}
                  onSubmit={handleVerifyLogin}
                >
                  <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoFocus
                  />
                  <div className="mt-5 space-y-3">
                    <Button type="submit" isLoading={isLoading} disabled={!password}>
                      Log in
                    </Button>
                    <div className="text-center">
                      <button type="button" onClick={() => setStep('FORGOT_INIT')} className="text-sm font-bold text-blue-500 hover:text-blue-600 transition-colors">
                        Forgot Password?
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}

              {step === 'OTP' && (
                <motion.form
                  key="f-otp"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.22 }}
                  onSubmit={e => { e.preventDefault(); handleVerifyLogin(); }}
                >
                  <div className="flex justify-center gap-2 sm:gap-2.5 mb-8">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        onPaste={handleOtpPaste}
                        onFocus={e => e.target.select()}
                        className="w-11 sm:w-13 h-14 sm:h-16 text-center text-2xl font-black border-2 border-gray-200 rounded-2xl bg-gray-50/80 text-gray-900 focus:bg-white focus:border-black focus:ring-4 focus:ring-black/5 focus:outline-none transition-all duration-200 shadow-2xs selection:bg-black selection:text-white"
                      />
                    ))}
                  </div>
                  <div className="space-y-3">
                    <Button type="submit" isLoading={isLoading} disabled={otp.join('').length !== 6}>
                      Verify &amp; Log in
                    </Button>
                    <p className="text-center text-sm text-gray-400 font-medium">
                      Didn't receive it?{' '}
                      <button type="button" onClick={handleInitLogin} className="text-blue-500 font-bold hover:text-blue-600 transition-colors">
                        Resend
                      </button>
                    </p>
                  </div>
                </motion.form>
              )}

              {step === 'FORGOT_INIT' && (
                <motion.form
                  key="f-forgot-init"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.22 }}
                  onSubmit={handleForgotInit}
                >
                  <Input
                    label="CP ID or Registered Email"
                    placeholder="e.g. CPT00001 or name@example.com"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    autoFocus
                  />
                  <div className="mt-5">
                    <Button type="submit" isLoading={isLoading} disabled={!identifier.trim()}>
                      Send Verification Code
                    </Button>
                  </div>
                </motion.form>
              )}

              {step === 'FORGOT_VERIFY' && (
                <motion.form
                  key="f-forgot-verify"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.22 }}
                  onSubmit={handleForgotVerify}
                >
                  <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">6-Digit Verification Code</label>
                    <div className="flex justify-center gap-2 sm:gap-2.5">
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={el => { otpRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={digit}
                          onChange={e => handleOtpChange(i, e.target.value)}
                          onKeyDown={e => handleOtpKeyDown(i, e)}
                          onPaste={handleOtpPaste}
                          onFocus={e => e.target.select()}
                          className="w-11 sm:w-13 h-14 sm:h-16 text-center text-2xl font-black border-2 border-gray-200 rounded-2xl bg-gray-50/80 text-gray-900 focus:bg-white focus:border-black focus:ring-4 focus:ring-black/5 focus:outline-none transition-all duration-200 shadow-2xs selection:bg-black selection:text-white"
                        />
                      ))}
                    </div>
                  </div>
                  <Input
                    label="New Password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                  <div className="mt-6 space-y-3">
                    <Button type="submit" isLoading={isLoading} disabled={otp.join('').length !== 6 || newPassword.length < 6}>
                      Reset Password
                    </Button>
                    <p className="text-center text-sm text-gray-400 font-medium">
                      Didn't get code?{' '}
                      <button type="button" onClick={handleForgotInit} className="text-blue-500 font-bold hover:text-blue-600 transition-colors">
                        Resend Code
                      </button>
                    </p>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Footer note */}
            <p className="mt-10 text-xs text-center text-gray-400 leading-relaxed">
              By continuing you agree to our{' '}
              <Link to="/terms" className="text-gray-500 hover:text-gray-800 font-semibold transition-colors">Terms</Link>
              {' & '}
              <Link to="/privacy" className="text-gray-500 hover:text-gray-800 font-semibold transition-colors">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

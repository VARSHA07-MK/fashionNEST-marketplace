import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

export default function VerifyAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [devCode, setDevCode] = useState(searchParams.get('code') || '');

  useEffect(() => {
    setEmail(searchParams.get('email') || '');
    setDevCode(searchParams.get('code') || '');
  }, [searchParams]);

  const helperText = useMemo(() => {
    if (!devCode) return '';
    return `Local preview code: ${devCode}`;
  }, [devCode]);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/verify-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || 'Unable to verify the account right now.');
        return;
      }

      setMessage(data.message || 'Account verified successfully.');
      window.setTimeout(() => navigate('/login'), 1400);
    } catch {
      setError('Unable to verify the account right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    setIsResending(true);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || 'Unable to resend the verification code.');
        return;
      }

      setMessage(data.message || 'Verification code sent.');
      setDevCode(data.devVerificationCode || '');
    } catch {
      setError('Unable to resend the verification code.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_0.95fr]">
        <motion.section initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} className="relative overflow-hidden rounded-[36px] bg-slate-950 p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.16)] lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(244,63,94,0.35),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.25),_transparent_28%)]" />
          <div className="relative space-y-8">
            <BrandLogo showTagline theme="dark" />
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]"><Sparkles size={14} />Verify account</span>
              <h1 className="max-w-xl text-4xl font-black leading-tight">Activate your FASHIONest account and keep it secure.</h1>
              <p className="max-w-xl text-sm leading-7 text-white/75 md:text-base">We use a short verification code so only the real account owner can finish signup and start shopping.</p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-white/10 p-3 text-amber-300"><ShieldCheck size={20} /></div>
                <div>
                  <h2 className="text-lg font-bold">Verification flow</h2>
                  <p className="mt-1 text-sm text-white/70">Enter the code sent for your account, then sign in normally with your password.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} className="flex items-center">
          <div className="w-full rounded-[36px] border border-white/70 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] md:p-8 lg:p-10">
            <div className="flex items-center justify-between gap-4">
              <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-rose-600"><ArrowLeft size={16} />Back to login</Link>
              <BrandLogo compact />
            </div>

            <div className="mt-10 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">Account verification</p>
              <h2 className="text-3xl font-black text-slate-950">Enter your verification code</h2>
              <p className="text-sm text-slate-500">Use the code sent for <span className="font-semibold text-slate-900">{email || 'your account'}</span>.</p>
            </div>

            {helperText ? <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">{helperText}</div> : null}
            {error ? <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</div> : null}
            {message ? <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div> : null}

            <form onSubmit={handleVerify} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Email Address</label>
                <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white" placeholder="you@example.com" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Verification Code</label>
                <input type="text" required value={code} onChange={(event) => setCode(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm tracking-[0.3em] outline-none transition focus:border-rose-500 focus:bg-white" placeholder="123456" />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70">
                <span className="inline-flex items-center gap-2">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}{isSubmitting ? 'Verifying...' : 'Verify account'}{!isSubmitting ? <ArrowRight size={16} /> : null}</span>
              </button>
            </form>

            <button type="button" onClick={() => void handleResend()} disabled={!email || isResending} className="mt-5 text-sm font-semibold text-rose-600 disabled:cursor-not-allowed disabled:text-slate-400">
              {isResending ? 'Sending a new code...' : 'Resend code'}
            </button>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

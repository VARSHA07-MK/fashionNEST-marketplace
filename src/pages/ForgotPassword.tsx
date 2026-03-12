import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const handleGetQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/forgot-password/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unable to find that account right now.');
      } else {
        setSecurityQuestion(data.securityQuestion || '');
        setStep(2);
      }
    } catch {
      setError('Unable to find that account right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/forgot-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, securityAnswer }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Security answer did not match our records.');
      } else {
        setMessage(data.message || 'Security answer verified.');
        navigate(`/reset-password?token=${encodeURIComponent(data.resetToken)}`);
      }
    } catch {
      setError('Unable to verify the security answer right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_0.95fr]">
        <motion.section initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#fff1f5] via-white to-[#fff7e8] p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(244,63,94,0.18),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(251,191,36,0.18),_transparent_28%)]" />
          <div className="relative space-y-8">
            <BrandLogo showTagline />
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-rose-600"><Sparkles size={14} />Password help</span>
              <h1 className="max-w-xl text-4xl font-black leading-tight text-slate-950">Recover your account with your security question.</h1>
              <p className="max-w-xl text-sm leading-7 text-slate-600 md:text-base">Enter your registered email, answer your saved security question, and set a new password.</p>
            </div>
            <div className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-rose-50 p-3 text-rose-600"><ShieldCheck size={20} /></div>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Recovery flow</h2>
                  <p className="mt-1 text-sm text-slate-500">Your password reset stays private and secure without relying on email delivery.</p>
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
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">Forgot password</p>
              <h2 className="text-3xl font-black text-slate-950">{step === 1 ? 'Find your account' : 'Answer your security question'}</h2>
              <p className="text-sm text-slate-500">{step === 1 ? 'Enter the registered email address for your fashionNEST account.' : 'Answer the saved question to unlock password reset.'}</p>
            </div>

            {error ? <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</div> : null}
            {message ? <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div> : null}

            {step === 1 ? (
              <form onSubmit={handleGetQuestion} className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Registered Email</label>
                  <input type="email" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70">
                  <span className="inline-flex items-center gap-2">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}{isSubmitting ? 'Checking...' : 'Continue'}{!isSubmitting ? <ArrowRight size={16} /> : null}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyAnswer} className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Security Question</label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{securityQuestion}</div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Your Answer</label>
                  <input type="text" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} placeholder="Enter your answer" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">Back</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 rounded-full bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70">
                    <span className="inline-flex items-center gap-2">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}{isSubmitting ? 'Verifying...' : 'Verify answer'}{!isSubmitting ? <ArrowRight size={16} /> : null}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
}

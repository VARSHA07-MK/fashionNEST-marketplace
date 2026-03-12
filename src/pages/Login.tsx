import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

const invalidCredentialsMessage = 'Invalid email or password. Please try again or reset your password.';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPasswordError, setHasPasswordError] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setVerificationEmail('');
    setHasPasswordError(false);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        login(data.token, data.user, data.defaultAddress || null);
        if (data.user.role === 'admin') navigate('/dashboard');
        else navigate('/');
        return;
      }

      setError(data.error || invalidCredentialsMessage);
      setVerificationEmail(data.requiresVerification ? (data.email || email) : '');
      setPassword('');
      setHasPasswordError(true);
    } catch (err) {
      setVerificationEmail('');
      setError('Something went wrong. Please try again in a moment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.section
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative overflow-hidden rounded-[36px] bg-slate-950 p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.16)] lg:p-10"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(244,63,94,0.35),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.25),_transparent_28%)]" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div className="space-y-5">
              <BrandLogo showTagline theme="dark" />
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]">
                <Sparkles size={14} />Welcome back
              </span>
              <div className="space-y-4">
                <h1 className="max-w-xl text-4xl font-black leading-tight">Sign in and continue shopping on fashionNEST.</h1>
                <p className="max-w-xl text-sm leading-7 text-white/75 md:text-base">
                  Explore sarees, kurtas, blouses, dresses, and kurta sets in a cleaner and more focused shopping experience.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/8 p-6 backdrop-blur-sm">
              <div className="flex flex-wrap gap-3 text-sm font-semibold text-white/90">
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">Sarees</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">Kurtas</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">Blouses</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">Dresses</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">Kurta Sets</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-white/70">
                Simple login, clean catalog browsing, and a faster path back to your saved bag and orders.
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} className="flex items-center">
          <div className="w-full rounded-[36px] border border-white/70 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] md:p-8 lg:p-10">
            <div className="flex items-center justify-between gap-4">
              <Link to="/" className="inline-flex items-center"><BrandLogo compact /></Link>
              <Link to="/signup" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950">Create account</Link>
            </div>

            <div className="mt-10 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">Login</p>
              <h2 className="text-3xl font-black text-slate-950">Welcome back</h2>
              <p className="text-sm text-slate-500">Use your email and password to open your fashionNEST shopping home.</p>
            </div>

            {error ? <div className="mt-6 space-y-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600"><p>{error}</p>{verificationEmail ? <Link to={`/verify-account?email=${encodeURIComponent(verificationEmail)}`} className="inline-flex font-semibold text-rose-700 underline">Verify this account</Link> : null}</div> : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-semibold text-slate-700">Password</label>
                  <Link to="/forgot-password" className="text-sm font-medium text-slate-500 transition hover:text-rose-600 hover:underline">
                    Forgot Password?
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:bg-white ${hasPasswordError ? 'border-rose-400 bg-rose-50 text-rose-700 focus:border-rose-500' : 'border-slate-200 bg-slate-50 focus:border-rose-500'}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (hasPasswordError) {
                      setHasPasswordError(false);
                    }
                  }}
                  placeholder="Enter your password"
                />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70">
                <span className="inline-flex items-center gap-2">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  {isSubmitting ? 'Logging in...' : 'Login'}
                  {!isSubmitting ? <ArrowRight size={16} /> : null}
                </span>
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">New to fashionNEST? <Link to="/signup" className="font-semibold text-rose-600 hover:underline">Create your account</Link></p>
          </div>
        </motion.section>
      </div>
    </div>
  );
}


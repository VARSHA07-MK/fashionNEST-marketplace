import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Home, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

const signupHighlights = [
  { icon: ShoppingBag, title: 'Fresh shopping access', text: 'Save favourites, add items to bag, and track every order from one account.' },
  { icon: Home, title: 'Apartment-friendly buying', text: 'Add your society details to shop community-friendly deliveries and group offers.' },
  { icon: ShieldCheck, title: 'Account recovery ready', text: 'Choose a security question now so password reset stays simple and secure later.' },
];

const securityQuestions = [
  'What is your favourite fabric?',
  'What is your favourite festive color?',
  'What is the name of your apartment or society?',
  'What is your favourite saree style?',
];

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    society_name: '',
    security_question: securityQuestions[0],
    security_answer: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const query = new URLSearchParams({ email: data.email || formData.email });
        if (data.devVerificationCode) {
          query.set('code', data.devVerificationCode);
        }
        navigate(`/verify-account?${query.toString()}`);
      } else {
        setError(data.error || 'Unable to create your account right now.');
      }
    } catch {
      setError('Something went wrong');
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.section initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} className="flex items-center">
          <div className="w-full rounded-[36px] border border-white/70 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] md:p-8 lg:p-10">
            <div className="flex items-center justify-between gap-4">
              <Link to="/" className="inline-flex items-center"><BrandLogo compact /></Link>
              <Link to="/login" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950">Login</Link>
            </div>

            <div className="mt-10 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">Create account</p>
              <h2 className="text-3xl font-black text-slate-950">Join fashionNEST</h2>
              <p className="text-sm text-slate-500">Create your account to shop curated sarees and community-ready fashion collections.</p>
            </div>

            {error ? <div className="mt-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</div> : null}

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-700">Full Name</span><input type="text" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Your full name" /></label>
              <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-700">Email</span><input type="email" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="you@example.com" /></label>
              <label><span className="mb-2 block text-sm font-semibold text-slate-700">Phone</span><input type="tel" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="9876543210" /></label>
              <label><span className="mb-2 block text-sm font-semibold text-slate-700">Society / Apartment</span><input type="text" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white" value={formData.society_name} onChange={(e) => setFormData({ ...formData, society_name: e.target.value })} placeholder="Your apartment or society" /></label>
              <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-700">Password</span><input type="password" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Create a secure password" /></label>
              <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-700">Security Question</span><select className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white" value={formData.security_question} onChange={(e) => setFormData({ ...formData, security_question: e.target.value })}>{securityQuestions.map((question) => <option key={question} value={question}>{question}</option>)}</select></label>
              <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-700">Security Answer</span><input type="text" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white" value={formData.security_answer} onChange={(e) => setFormData({ ...formData, security_answer: e.target.value })} placeholder="Answer used for password reset" /></label>
              <button type="submit" className="sm:col-span-2 w-full rounded-full bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-rose-600"><span className="inline-flex items-center gap-2">Create account <ArrowRight size={16} /></span></button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">Already have an account? <Link to="/login" className="font-semibold text-rose-600 hover:underline">Login</Link></p>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#fff1f5] via-white to-[#fff7e8] p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(244,63,94,0.18),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(251,191,36,0.18),_transparent_28%)]" />
          <div className="relative space-y-8">
            <BrandLogo showTagline />
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-rose-600"><Sparkles size={14} />Get started</span>
              <h1 className="max-w-xl text-4xl font-black leading-tight text-slate-950">Create your fashionNEST account and start shopping beautifully.</h1>
              <p className="max-w-xl text-sm leading-7 text-slate-600 md:text-base">From festive sarees to daily kurtas and community bulk deals, your account unlocks the full storefront experience.</p>
            </div>
            <div className="grid gap-4">
              {signupHighlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl bg-rose-50 p-3 text-rose-600"><Icon size={20} /></div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-950">{item.title}</h2>
                        <p className="mt-1 text-sm text-slate-500">{item.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}


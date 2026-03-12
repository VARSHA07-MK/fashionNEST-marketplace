import React from 'react';

type BrandLogoProps = {
  className?: string;
  compact?: boolean;
  showTagline?: boolean;
  theme?: 'light' | 'dark';
};

export default function BrandLogo({ className = '', compact = false, showTagline = false, theme = 'light' }: BrandLogoProps) {
  const isDark = theme === 'dark';
  const iconSize = compact ? 'h-10 w-10' : 'h-14 w-14';
  const iconText = compact ? 'text-lg' : 'text-2xl';
  const wordSize = compact ? 'text-xl' : 'text-2xl md:text-3xl';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`.trim()}>
      <div className={`relative ${iconSize}`}>
        <span className="absolute inset-0 rotate-6 rounded-[22px] bg-gradient-to-br from-rose-500 via-fuchsia-500 to-amber-400 shadow-[0_12px_30px_rgba(244,63,94,0.28)]" />
        <span className={`absolute inset-[2px] rounded-[20px] backdrop-blur ${isDark ? 'bg-slate-950/85' : 'bg-white/88'}`} />
        <span className="absolute left-[16%] top-[18%] h-[46%] w-[46%] rounded-full bg-gradient-to-br from-rose-400 to-fuchsia-500 opacity-95" />
        <span className="absolute right-[14%] bottom-[16%] h-[34%] w-[34%] rounded-full bg-gradient-to-br from-amber-300 to-orange-500 opacity-95" />
        <span className={`relative flex h-full w-full items-center justify-center font-black tracking-tight ${iconText} ${isDark ? 'text-white' : 'text-slate-950'}`}>N</span>
      </div>

      <div className="leading-none">
        {showTagline ? (
          <p className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.34em] ${isDark ? 'text-white/70' : 'text-slate-400'}`}>
            Community fashion marketplace
          </p>
        ) : null}
        <div className={`font-black tracking-tight ${wordSize}`}>
          <span className={isDark ? 'text-white' : 'text-slate-950'}>fashion</span>
          <span className={isDark ? 'text-amber-300' : 'text-rose-600'}>NEST</span>
        </div>
      </div>
    </div>
  );
}

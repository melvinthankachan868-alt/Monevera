import React from 'react';

interface MoneyVaultLogoProps {
  variant?: 'full' | 'mark';
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  showMotto?: boolean;
  className?: string;
}

export const MoneyVaultLogo: React.FC<MoneyVaultLogoProps> = ({
  variant = 'full',
  theme = 'dark',
  size = 'md',
  showMotto = false,
  className = '',
}) => {
  const isDark = theme === 'dark';

  // Mark sizing
  const markDimensions = {
    sm: { width: 28, height: 28 },
    md: { width: 36, height: 36 },
    lg: { width: 44, height: 44 },
  }[size];

  const MarkSVG = (
    <div
      style={{ width: markDimensions.width, height: markDimensions.height }}
      className="relative flex-shrink-0 flex items-center justify-center transition-transform hover:scale-105 duration-200"
    >
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full drop-shadow-md">
        <defs>
          <linearGradient id="mv-shield-grad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1A241C" />
            <stop offset="60%" stopColor="#141816" />
            <stop offset="100%" stopColor="#0B0D0C" />
          </linearGradient>
          <linearGradient id="mv-lime-accent" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#B8FF62" />
            <stop offset="100%" stopColor="#A8F34A" />
          </linearGradient>
          <linearGradient id="mv-emerald-keystone" x1="16" y1="32" x2="32" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#78D64B" />
            <stop offset="100%" stopColor="#55E0C1" />
          </linearGradient>
        </defs>

        {/* Vault Frame */}
        <rect x="3" y="3" width="42" height="42" rx="12" fill="url(#mv-shield-grad)" stroke="#252B27" strokeWidth="1.5" />
        <rect x="4.5" y="4.5" width="39" height="39" rx="10.5" stroke="#A8F34A" strokeOpacity="0.25" strokeWidth="1" />

        {/* Dynamic M Pillars */}
        <path d="M12 35V15L20 26L16 31H12V35Z" fill="#F4F7F3" fillOpacity="0.95" />
        <path d="M36 35V15L28 26L32 31H36V35Z" fill="#F4F7F3" fillOpacity="0.95" />

        {/* Central Vault Locking V / Core */}
        <path d="M24 13L30.5 25H26.5L24 21L21.5 25H17.5L24 13Z" fill="url(#mv-lime-accent)" />
        <path d="M24 22.5L29.5 32H25.5L24 28.5L22.5 32H18.5L24 22.5Z" fill="url(#mv-emerald-keystone)" />

        {/* Secure Central Core Dot */}
        <circle cx="24" cy="23.5" r="2.5" fill="#A8F34A" />
        <circle cx="24" cy="23.5" r="1.2" fill="#0B0D0C" />
      </svg>
    </div>
  );

  if (variant === 'mark') {
    return <div className={`inline-flex items-center ${className}`}>{MarkSVG}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {MarkSVG}
      <div className="flex flex-col leading-none">
        <div className="flex items-center tracking-tight font-extrabold text-[17px]">
          <span className={isDark ? 'text-[var(--mv-text-primary)]' : 'text-[#0B0D0C]'}>Money</span>
          <span className="text-[#A8F34A] ml-1">Vault</span>
        </div>
        {showMotto ? (
          <span
            className={`text-[9px] font-semibold tracking-wider uppercase mt-1 ${
              isDark ? 'text-[var(--mv-text-secondary)]' : 'text-slate-500'
            }`}
          >
            Secure Your Money. Master Your Future.
          </span>
        ) : (
          <span
            className={`text-[9.5px] font-medium tracking-wide mt-0.5 ${
              isDark ? 'text-[var(--mv-text-secondary)]' : 'text-slate-400'
            }`}
          >
            Financial Command
          </span>
        )}
      </div>
    </div>
  );
};

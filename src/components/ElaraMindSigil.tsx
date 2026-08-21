import React from 'react';

interface ElaraMindSigilProps {
  active?: boolean;
  size?: number;
  className?: string;
}

export const ElaraMindSigil: React.FC<ElaraMindSigilProps> = ({
  active = false,
  size = 20,
  className = '',
}) => (
  <span
    className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <span className={`absolute inset-0 rounded-full border border-pink-400/35 ${active ? 'animate-pulse' : ''}`} />
    <span className={`absolute inset-[3px] rounded-full border border-pink-300/45 ${active ? 'animate-[spin_5s_linear_infinite]' : ''}`} />
    <svg viewBox="0 0 24 24" className="relative h-full w-full overflow-visible">
      <path d="M12 3.5 15 6.2 12 8.9 9 6.2 12 3.5Z" fill="none" stroke="currentColor" strokeWidth="1.25" className="text-pink-200" />
      <path d="M6 12c1.8-3.3 4-4.9 6-4.9s4.2 1.6 6 4.9c-1.8 3.3-4 4.9-6 4.9S7.8 15.3 6 12Z" fill="none" stroke="currentColor" strokeWidth="1.1" className="text-pink-400" />
      <circle cx="12" cy="12" r="2.05" fill="currentColor" className={`text-pink-300 ${active ? 'animate-pulse' : ''}`} />
      <path d="M4.5 7.2c2.2-2.1 4.7-3.1 7.5-3.1s5.3 1 7.5 3.1M4.5 16.8c2.2 2.1 4.7 3.1 7.5 3.1s5.3-1 7.5-3.1" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" className={`text-pink-500/80 ${active ? 'animate-[pulse_2.4s_ease-in-out_infinite]' : ''}`} />
    </svg>
  </span>
);

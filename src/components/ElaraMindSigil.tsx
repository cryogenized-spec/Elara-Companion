import React from 'react';

interface ElaraMindSigilProps {
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: { box: 18, stroke: 1.5 },
  md: { box: 24, stroke: 1.7 },
  lg: { box: 32, stroke: 2 },
} as const;

export const ElaraMindSigil: React.FC<ElaraMindSigilProps> = ({
  active = false,
  size = 'md',
  className = '',
}) => {
  const { box, stroke } = sizeMap[size];
  const center = box / 2;
  const orbit = box * 0.29;
  const ring = box * 0.2;

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center ${active ? 'animate-[elara-sigil-breathe_2.8s_ease-in-out_infinite]' : ''} ${className}`}
      style={{ width: box, height: box }}
    >
      <svg viewBox={`0 0 ${box} ${box}`} width={box} height={box} fill="none">
        <defs>
          <linearGradient id={`elara-sigil-${size}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f9a8d4" />
            <stop offset="55%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#c026d3" />
          </linearGradient>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={orbit}
          stroke={`url(#elara-sigil-${size})`}
          strokeWidth={stroke}
          strokeDasharray={`${box * 0.19} ${box * 0.12}`}
          strokeLinecap="round"
          opacity={active ? 0.95 : 0.7}
          className={active ? 'animate-[elara-sigil-orbit_5s_linear_infinite]' : ''}
          transform={`rotate(-24 ${center} ${center})`}
        />
        <circle
          cx={center}
          cy={center}
          r={ring}
          stroke={`url(#elara-sigil-${size})`}
          strokeWidth={stroke}
          opacity={0.9}
        />
        <path
          d={`M ${center - box * 0.11} ${center} Q ${center} ${center - box * 0.11} ${center + box * 0.11} ${center} Q ${center} ${center + box * 0.11} ${center - box * 0.11} ${center}`}
          stroke={`url(#elara-sigil-${size})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          opacity={0.95}
        />
        <rect
          x={center - box * 0.035}
          y={center - box * 0.035}
          width={box * 0.07}
          height={box * 0.07}
          rx={box * 0.018}
          fill="#f9a8d4"
          opacity={active ? 1 : 0.85}
          transform={`rotate(45 ${center} ${center})`}
        />
      </svg>
    </span>
  );
};

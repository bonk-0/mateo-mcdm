import { motion } from 'motion/react';

/**
 * Decorative hero art: three triangular fuzzy numbers drawing themselves, an α-cut
 * sweeping through them and a small ranking settling into place. Purely illustrative
 * (aria-hidden); real figures always come from the engine.
 */
const TRIANGLES = [
  { points: [20, 70, 120], color: 'var(--color-series-2)' },
  { points: [80, 140, 200], color: '#9db8ff' },
  { points: [150, 210, 250], color: 'var(--color-series-3)' },
] as const;

const BASE = 150;
const PEAK = 40;
const BARS = [0.92, 0.78, 0.64, 0.45];

export function HeroIllustration() {
  return (
    <svg viewBox="0 0 400 180" className="h-auto w-full max-w-md" aria-hidden focusable="false">
      <line x1="10" y1={BASE} x2="262" y2={BASE} stroke="white" strokeOpacity="0.35" />
      <line x1="10" y1={PEAK - 6} x2="10" y2={BASE} stroke="white" strokeOpacity="0.35" />
      {TRIANGLES.map(({ points: [l, m, u], color }, i) => (
        <g key={i}>
          <motion.path
            d={`M${l} ${BASE} L${m} ${PEAK} L${u} ${BASE} Z`}
            fill={color}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.16 }}
            transition={{ delay: 0.6 + i * 0.25, duration: 0.6 }}
          />
          <motion.path
            d={`M${l} ${BASE} L${m} ${PEAK} L${u} ${BASE}`}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.2 + i * 0.25, duration: 0.9, ease: [0.2, 0, 0, 1] }}
          />
          <motion.circle
            cx={m}
            cy={PEAK}
            r="3.5"
            fill={color}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1 + i * 0.25, type: 'spring', bounce: 0.5 }}
          />
        </g>
      ))}
      <motion.line
        x1="10"
        x2="262"
        stroke="white"
        strokeDasharray="4 4"
        strokeOpacity="0.7"
        initial={{ y1: BASE, y2: BASE }}
        animate={{ y1: [BASE, PEAK + 10, 95], y2: [BASE, PEAK + 10, 95] }}
        transition={{ delay: 1.4, duration: 2.2, ease: 'easeInOut' }}
      />
      {BARS.map((value, i) => (
        <g key={i} transform={`translate(285 ${PEAK + i * 28})`}>
          <rect width="100" height="14" rx="7" fill="white" fillOpacity="0.12" />
          <motion.rect
            height="14"
            rx="7"
            fill={i === 0 ? '#ffffff' : '#9db8ff'}
            fillOpacity={i === 0 ? 0.95 : 0.6}
            initial={{ width: 0 }}
            animate={{ width: 100 * value }}
            transition={{ delay: 1.8 + i * 0.15, duration: 0.8, ease: [0.05, 0.7, 0.1, 1] }}
          />
        </g>
      ))}
    </svg>
  );
}

import { motion } from 'framer-motion';
import { riskColor } from '../../lib/risk';
import { AnimatedNumber } from './AnimatedNumber';

interface Props { value: number; size?: number; stroke?: number; label?: string; sublabel?: string; color?: string }
/** Animated circular gauge. Arc length and colour both encode the score. */
export function RiskRing({ value, size = 168, stroke = 10, label = 'RISK', sublabel, color }: Props) {
  const r = (size - stroke) / 2 - 6;
  const c = 2 * Math.PI * r;
  const col = color ?? riskColor(value);
  const ticks = Array.from({ length: 60 });
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <filter id={`glow-${size}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {ticks.map((_, i) => {
          const a = (i / ticks.length) * Math.PI * 2;
          const r1 = size / 2 - 2, r2 = size / 2 - (i % 5 === 0 ? 7 : 4);
          return <line key={i} x1={size / 2 + Math.cos(a) * r1} y1={size / 2 + Math.sin(a) * r1} x2={size / 2 + Math.cos(a) * r2} y2={size / 2 + Math.sin(a) * r2} stroke="rgba(160,255,200,0.12)" strokeWidth={1} />;
        })}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(160,255,200,0.07)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - value / 100), stroke: col }}
          transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }} filter={`url(#glow-${size})`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="eyebrow">{label}</div>
        <div className="num flex items-baseline font-semibold text-fog-100" style={{ fontSize: size * 0.26 }}>
          <AnimatedNumber value={value} /><span className="ml-0.5 text-fog-500" style={{ fontSize: size * 0.11 }}>%</span>
        </div>
        {sublabel && <div className="text-[11px] font-medium" style={{ color: col }}>{sublabel}</div>}
      </div>
    </div>
  );
}

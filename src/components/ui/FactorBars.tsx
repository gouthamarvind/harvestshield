import { motion } from 'framer-motion';
import type { Factor } from '../../model/risk';

const COLORS: Record<string, string> = {
  rainfall: '#4FE3F0', water: '#7C9CFF', temperature: '#FF7A3D', enso: '#F5B83D', coastal: '#A78BFA', crop: '#C6F432', sowing: '#E879F9', portfolio: '#3DF58A',
};
/** Explainability view: additive contribution of each factor to the risk score (points). */
export function FactorBars({ factors, max, compact }: { factors: Factor[]; max?: number; compact?: boolean }) {
  const m = max ?? Math.max(10, ...factors.map((f) => Math.abs(f.value)));
  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {factors.map((f, i) => {
        const neg = f.value < 0;
        return (
          <div key={f.key}>
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-2 text-fog-300"><span className="h-1.5 w-1.5 rounded-full" style={{ background: COLORS[f.key] }} />{f.label}</span>
              <span className={`num font-mono ${neg ? 'text-mint' : 'text-fog-100'}`}>{neg ? '−' : '+'}{Math.abs(f.value).toFixed(1)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
              <motion.div className="h-full rounded-full" style={{ background: neg ? '#3DF58A' : COLORS[f.key], boxShadow: `0 0 10px ${COLORS[f.key]}55` }}
                initial={{ width: 0 }} animate={{ width: `${(Math.abs(f.value) / m) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.04, ease: [0.2, 0.7, 0.2, 1] }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

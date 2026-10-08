import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Tooltip } from './ui/Tooltip';
import { Info } from 'lucide-react';

interface Props { label: string; value: ReactNode; sub?: ReactNode; accent?: string; icon?: ReactNode; info?: string; delay?: number; onClick?: () => void; children?: ReactNode }
export function Kpi({ label, value, sub, accent = '#3DF58A', icon, info, delay = 0, onClick, children }: Props) {
  const Comp = onClick ? motion.button : motion.div;
  return (
    <Comp onClick={onClick} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay, ease: [0.2, 0.7, 0.2, 1] }}
      className={`panel panel-hover group relative overflow-hidden p-4 text-left ${onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}>
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-[0.13] blur-2xl transition-opacity group-hover:opacity-25" style={{ background: accent }} />
      <div className="absolute left-0 top-4 h-6 w-[2px] rounded-r" style={{ background: accent, boxShadow: `0 0 10px ${accent}` }} />
      <div className="flex items-center justify-between">
        <div className="eyebrow flex items-center gap-1.5">{icon}{label}</div>
        {info && <Tooltip content={info}><Info className="h-3.5 w-3.5 text-fog-600 hover:text-fog-300" /></Tooltip>}
      </div>
      <div className="mt-3 text-[28px] font-semibold leading-none tracking-tight text-fog-100">{value}</div>
      {sub && <div className="mt-2 text-[11.5px] text-fog-500">{sub}</div>}
      {children}
    </Comp>
  );
}

import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn('relative h-5 w-9 shrink-0 rounded-full border transition-colors', checked ? 'border-mint/50 bg-mint/25' : 'border-white/10 bg-white/[0.05]')}>
      <motion.span className={cn('absolute top-[2px] h-3.5 w-3.5 rounded-full', checked ? 'bg-mint shadow-[0_0_10px_#3DF58A]' : 'bg-fog-500')} animate={{ left: checked ? 18 : 2 }} transition={{ type: 'spring', stiffness: 600, damping: 35 }} />
    </button>
  );
}

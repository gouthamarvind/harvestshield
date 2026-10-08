import { motion } from 'framer-motion';
import { useId } from 'react';
import { cn } from '../../lib/cn';

interface Props<T extends string> { value: T; options: { value: T; label: React.ReactNode }[]; onChange: (v: T) => void; size?: 'sm' | 'md'; className?: string }
export function Segmented<T extends string>({ value, options, onChange, size = 'sm', className }: Props<T>) {
  const id = useId();
  return (
    <div role="tablist" className={cn('inline-flex rounded-lg border border-white/[0.07] bg-black/20 p-0.5', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} role="tab" aria-selected={active} onClick={() => onChange(o.value)}
            className={cn('relative rounded-md font-medium transition-colors', size === 'sm' ? 'h-7 px-2.5 text-[12px]' : 'h-8 px-3 text-[13px]', active ? 'text-fog-100' : 'text-fog-500 hover:text-fog-300')}>
            {active && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-md border border-white/10 bg-white/[0.07]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <span className="relative z-10 flex items-center gap-1.5">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

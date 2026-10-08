import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface Option<T extends string> { value: T; label: ReactNode; hint?: ReactNode; disabled?: boolean; icon?: ReactNode }
interface Props<T extends string> { value: T; options: Option<T>[]; onChange: (v: T) => void; icon?: ReactNode; className?: string; menuClass?: string; label?: string; align?: 'left' | 'right'; renderValue?: (o: Option<T>) => ReactNode }

/** Accessible custom dropdown (keyboard: Enter/Space opens, arrows move, Esc closes). */
export function Select<T extends string>({ value, options, onChange, icon, className, menuClass, label, align = 'left', renderValue }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];
  useEffect(() => {
    if (!open) return;
    setHi(Math.max(0, options.findIndex((o) => o.value === value)));
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open, options, value]);
  const onKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) { e.preventDefault(); setOpen(true); return; }
    if (!open) return;
    if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(options.length - 1, h + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    if (e.key === 'Enter') { e.preventDefault(); const o = options[hi]; if (o && !o.disabled) { onChange(o.value); setOpen(false); } }
  };
  return (
    <div ref={ref} className={cn('relative', className)} onKeyDown={onKey}>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-left text-[13px] text-fog-100 transition hover:border-white/[0.16] hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/40">
        {icon && <span className="text-fog-500">{icon}</span>}
        <span className="min-w-0 flex-1 truncate">{renderValue ? renderValue(current) : current.label}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-fog-500 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul role="listbox" initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }} transition={{ duration: 0.14 }}
            className={cn('glass absolute z-50 mt-1.5 max-h-80 min-w-full overflow-auto rounded-xl p-1 shadow-2xl shadow-black/50', align === 'right' ? 'right-0' : 'left-0', menuClass)}>
            {options.map((o, i) => (
              <li key={o.value} role="option" aria-selected={o.value === value} aria-disabled={o.disabled}
                onMouseEnter={() => setHi(i)}
                onClick={() => { if (o.disabled) return; onChange(o.value); setOpen(false); }}
                className={cn('flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px]', i === hi && !o.disabled && 'bg-white/[0.06]', o.disabled ? 'cursor-not-allowed opacity-40' : 'text-fog-100')}>
                {o.icon}
                <div className="min-w-0 flex-1">
                  <div className="truncate">{o.label}</div>
                  {o.hint && <div className="truncate text-[11px] text-fog-500">{o.hint}</div>}
                </div>
                {o.value === value && <Check className="h-3.5 w-3.5 text-mint" />}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

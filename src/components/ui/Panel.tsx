import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

interface Props { title?: ReactNode; eyebrow?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string; delay?: number; id?: string }

export function Panel({ title, eyebrow, actions, children, className, bodyClass, delay = 0, id }: Props) {
  return (
    <motion.section id={id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay, ease: [0.2, 0.7, 0.2, 1] }}
      className={cn('panel flex min-w-0 flex-col', className)}>
      {(title || actions || eyebrow) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
            {title && <h3 className="truncate text-[14px] font-semibold tracking-tight text-fog-100">{title}</h3>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn('min-w-0 flex-1 px-5 pb-5 pt-4', bodyClass)}>{children}</div>
    </motion.section>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="eyebrow mb-2 flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-mint shadow-[0_0_8px_#3DF58A]" />{eyebrow}</div>
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-fog-100 md:text-[30px]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-fog-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
/** Lightweight CSS tooltip (hover + keyboard focus). */
export function Tooltip({ content, children, side = 'top', className }: { content: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'right'; className?: string }) {
  const pos = { top: 'bottom-full left-1/2 -translate-x-1/2 mb-2', bottom: 'top-full left-1/2 -translate-x-1/2 mt-2', right: 'left-full top-1/2 -translate-y-1/2 ml-2' }[side];
  return (
    <span className={cn('group/tt relative inline-flex', className)}>
      {children}
      <span role="tooltip" className={cn('pointer-events-none absolute z-[70] w-max max-w-[240px] rounded-lg border border-white/10 bg-ink-900/95 px-2.5 py-1.5 text-[11.5px] font-normal normal-case leading-snug tracking-normal text-fog-300 opacity-0 shadow-xl transition-opacity duration-150 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100', pos)}>
        {content}
      </span>
    </span>
  );
}

import { motion } from 'framer-motion';
import { ChevronsLeft, ShieldCheck } from 'lucide-react';
import { NAV } from './nav';
import { Logo } from './Logo';
import { cn } from '../../lib/cn';
import type { RouteId } from '../../lib/router';
import { useApp } from '../../state/AppState';
import { Tooltip } from '../ui/Tooltip';

interface Props { route: RouteId; collapsed: boolean; onToggle: () => void; mobileOpen: boolean; onCloseMobile: () => void }

export function Sidebar({ route, collapsed, onToggle, mobileOpen, onCloseMobile }: Props) {
  const { navigate, alerts, reviewed } = useApp();
  const open = alerts.filter((a) => a.severity !== 'INFO' && !reviewed.has(a.id)).length;
  const groups = ['Monitor', 'Decide', 'Operate', 'System'] as const;
  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onCloseMobile} />}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/[0.06] bg-ink-900/95 backdrop-blur-xl transition-[width,transform] duration-300 lg:static lg:translate-x-0',
        collapsed ? 'lg:w-[68px]' : 'lg:w-[244px]', 'w-[244px]', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className={cn('flex h-[60px] shrink-0 items-center gap-2.5 border-b border-white/[0.05]', collapsed ? 'lg:justify-center lg:px-0 px-4' : 'px-4')}>
          <Logo />
          <div className={cn('min-w-0', collapsed && 'lg:hidden')}>
            <div className="text-[14px] font-semibold tracking-[0.08em] text-fog-100">HARVESTSHIELD</div>
            <div className="text-[10px] tracking-wide text-fog-500">Climate → Agriculture → Food</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3" aria-label="Primary">
          {groups.map((g) => (
            <div key={g} className="mb-3">
              <div className={cn('eyebrow px-2.5 pb-1.5 pt-1', collapsed && 'lg:hidden', g === 'System' && 'hidden')}>{g}</div>
              {NAV.filter((n) => n.group === g).map((n) => {
                const active = route === n.id;
                const Icon = n.icon;
                const btn = (
                  <button key={n.id} onClick={() => { navigate(n.id); onCloseMobile(); }} aria-current={active ? 'page' : undefined}
                    className={cn('group relative flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-[13px] transition-colors',
                      active ? 'text-fog-100' : 'text-fog-400 hover:bg-white/[0.04] hover:text-fog-100', collapsed && 'lg:justify-center lg:px-0')}>
                    {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-lg border border-mint/20 bg-gradient-to-r from-mint/[0.12] to-mint/[0.02]" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                    {active && <span className="absolute -left-2.5 top-2 h-5 w-[3px] rounded-r bg-mint shadow-[0_0_10px_#3DF58A]" />}
                    <Icon className={cn('relative h-[17px] w-[17px] shrink-0', active ? 'text-mint' : 'text-fog-500 group-hover:text-fog-300')} strokeWidth={1.8} />
                    <span className={cn('relative flex-1 truncate text-left', collapsed && 'lg:hidden')}>{n.label}</span>
                    {n.tag && <span className={cn('relative rounded border border-mint/30 bg-mint/10 px-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-mint', collapsed && 'lg:hidden')}>{n.tag}</span>}
                    {n.id === 'alerts' && open > 0 && <span className={cn('relative grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger/90 px-1 text-[10px] font-semibold text-white', collapsed && 'lg:absolute lg:right-1.5 lg:top-1 lg:h-3.5 lg:min-w-[14px] lg:text-[9px]')}>{open}</span>}
                  </button>
                );
                return collapsed ? <Tooltip key={n.id} content={n.label} side="right" className="w-full">{btn}</Tooltip> : btn;
              })}
            </div>
          ))}
        </nav>
        <div className="shrink-0 border-t border-white/[0.05] p-2.5">
          <div className={cn('mb-2 rounded-lg border border-amber/20 bg-amber/[0.06] px-3 py-2', collapsed && 'lg:hidden')}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber"><ShieldCheck className="h-3.5 w-3.5" /> Prototype mode</div>
            <div className="mt-0.5 text-[10.5px] leading-snug text-fog-500">Illustrative scenario data. Not a validated forecast.</div>
          </div>
          <div className={cn('flex items-center gap-2', collapsed && 'lg:justify-center')}>
            <div className={cn('flex flex-1 items-center gap-2 px-1', collapsed && 'lg:hidden')}>
              <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-semibold text-fog-300">SDG 2</span>
              <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-semibold text-fog-300">SDG 13</span>
            </div>
            <button onClick={onToggle} className="hidden rounded-md p-1.5 text-fog-500 hover:bg-white/5 hover:text-fog-100 lg:block" aria-label="Toggle sidebar" title="Toggle sidebar ( [ )">
              <ChevronsLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

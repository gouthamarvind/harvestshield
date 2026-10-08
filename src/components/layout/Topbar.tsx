import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Search, Menu, MapPin, CalendarRange, FlaskConical, ChevronRight, Activity } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useApp, PRESETS } from '../../state/AppState';
import { Select } from '../ui/Select';
import { navById } from './nav';
import type { RouteId } from '../../lib/router';
import { TIME_RANGES, type TimeRange } from '../../services/climateService';
import type { PresetId } from '../../data/scenarios';
import { ONI, ONI_LABEL, WEATHER } from '../../data/observed';
import { useToast } from '../../state/toast';
import { NotificationCenter } from './NotificationCenter';
import { cn } from '../../lib/cn';

const presetDot: Record<PresetId, string> = { observed: '#C6F432', normal: '#3DF58A', moderate: '#F5B83D', strong: '#FF7A3D', 'extreme-water': '#FF4D5E', recovery: '#4FE3F0' };

export function Topbar({ route, onMenu }: { route: RouteId; onMenu: () => void }) {
  const { presetId, setPreset, timeRange, setTimeRange, setPaletteOpen, alerts, reviewed, presetVersion } = useApp();
  const toast = useToast();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const unread = alerts.filter((a) => !reviewed.has(a.id) && a.severity !== 'INFO').length;
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  useEffect(() => {
    if (!notifOpen) return;
    const h = (e: MouseEvent) => { if (!notifRef.current?.contains(e.target as Node)) setNotifOpen(false); };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [notifOpen]);

  return (
    <header className="relative z-30 flex h-[60px] shrink-0 items-center gap-3 border-b border-white/[0.05] bg-ink-900/70 px-4 backdrop-blur-xl md:px-6">
      {/* recompute progress bar on scenario change */}
      <AnimatePresence>
        {presetVersion > 0 && (
          <motion.div key={presetVersion} className="absolute bottom-[-1px] left-0 h-[2px] bg-gradient-to-r from-mint via-cyan to-mint shadow-[0_0_12px_#3DF58A]"
            initial={{ width: '0%', opacity: 1 }} animate={{ width: '100%', opacity: [1, 1, 0] }} transition={{ duration: 0.9, ease: 'easeOut' }} />
        )}
      </AnimatePresence>
      <button onClick={onMenu} className="rounded-md p-1.5 text-fog-400 hover:bg-white/5 lg:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
      <nav aria-label="Breadcrumb" className="hidden min-w-0 shrink items-center gap-1.5 whitespace-nowrap text-[13px] md:flex">
        <span className="hidden text-fog-500 2xl:inline">Tamil Nadu</span>
        <ChevronRight className="hidden h-3.5 w-3.5 text-fog-600 2xl:block" />
        <span className="truncate font-medium text-fog-100">{navById(route).label}</span>
      </nav>

      <button onClick={() => setPaletteOpen(true)} className="ml-auto flex h-9 w-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 text-[13px] text-fog-500 transition hover:border-white/[0.16] hover:text-fog-300 sm:w-56 xl:w-52 2xl:w-64" aria-label="Open command palette">
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden flex-1 text-left sm:inline">Search or jump to…</span>
        <span className="hidden items-center gap-0.5 sm:flex"><span className="kbd">{isMac ? '⌘' : 'Ctrl'}</span><span className="kbd">K</span></span>
      </button>

      <div className="hidden items-center gap-2 xl:flex">
        <Select<'tn' | 'ka' | 'ap'> label="Region" value="tn" onChange={() => {}} icon={<MapPin className="h-3.5 w-3.5" />} className="w-[148px]"
          options={[{ value: 'tn', label: 'Tamil Nadu', hint: '37 districts' }, { value: 'ka', label: 'Karnataka', hint: 'Coming soon', disabled: true }, { value: 'ap', label: 'Andhra Pradesh', hint: 'Coming soon', disabled: true }]} />
        <Select<TimeRange> label="Time range" value={timeRange} onChange={setTimeRange} icon={<CalendarRange className="h-3.5 w-3.5" />} className="w-[170px]"
          options={TIME_RANGES.map((t) => ({ value: t.id, label: t.label }))} />
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em] text-fog-500 min-[1800px]:inline">Scenario</span>
        <Select<PresetId> label="Scenario" value={presetId} align="right" className="w-[54px] sm:w-[214px]" menuClass="w-[280px]"
          icon={<FlaskConical className="h-3.5 w-3.5 text-mint" />}
          onChange={(v) => { setPreset(v); toast({ tone: 'success', title: `Scenario applied · ${PRESETS.find((p) => p.id === v)!.name}`, body: 'All views recomputed from the scenario model.' }); }}
          renderValue={(o) => <span className="hidden min-w-0 items-center gap-2 sm:flex"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: presetDot[o.value], boxShadow: `0 0 8px ${presetDot[o.value]}` }} /><span className="truncate">{o.label}</span></span>}
          options={PRESETS.map((p, i) => ({ value: p.id, label: p.name, hint: p.description, icon: <span className="grid h-5 w-5 shrink-0 place-items-center rounded border border-white/10 font-mono text-[10px] text-fog-400">{i + 1}</span> }))} />
      </div>

      <div className="hidden items-center gap-2 whitespace-nowrap rounded-lg border border-white/[0.06] px-2.5 py-1.5 text-[11.5px] text-fog-400 min-[1700px]:flex"
        title={`NOAA ONI ${ONI_LABEL}: ${ONI.latest.value.toFixed(2)}°C${WEATHER ? ` · district weather to ${WEATHER.windowEnd} (NASA POWER)` : ' · district weather not fetched'}`}>
        <span className={cn('h-2 w-2 rounded-full', WEATHER ? 'bg-mint' : 'bg-amber')} />
        <Activity className="h-3.5 w-3.5" /> {WEATHER ? `Data to ${WEATHER.windowEnd}` : `ONI ${ONI_LABEL}`}
      </div>

      <div ref={notifRef} className="relative">
        <button onClick={() => setNotifOpen((o) => !o)} className={cn('relative grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-fog-400 transition hover:text-fog-100', notifOpen && 'border-white/20 text-fog-100')} aria-label={`Notifications (${unread} unread)`}>
          <Bell className="h-4 w-4" />
          {unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-danger px-1 text-[9.5px] font-bold text-white shadow-[0_0_10px_#FF4D5E]">{unread}</span>}
        </button>
        <AnimatePresence>{notifOpen && <NotificationCenter onClose={() => setNotifOpen(false)} />}</AnimatePresence>
      </div>
      <button className="hidden h-9 items-center gap-2 rounded-lg pl-1 pr-2 hover:bg-white/[0.04] sm:flex" title="Goutham · Hydris" aria-label="Profile" onClick={() => toast({ tone: 'info', title: 'Signed in as Goutham', body: 'Prototype workspace' })}>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-mint/80 to-cyan/80 text-[11px] font-bold text-ink-950">G</span>
      </button>
    </header>
  );
}

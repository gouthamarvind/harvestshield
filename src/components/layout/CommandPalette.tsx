import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CornerDownLeft, FileText, FlaskConical, MapPin, Search, Layers } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useApp, PRESETS } from '../../state/AppState';
import { NAV } from './nav';
import { DISTRICTS } from '../../data/districts';
import { useToast } from '../../state/toast';
import { cn } from '../../lib/cn';

interface Cmd { id: string; label: string; group: string; icon: ReactNode; hint?: string; keywords?: string; run: () => void }

export function CommandPalette() {
  const app = useApp();
  const { paletteOpen: open, setPaletteOpen: setOpen } = app;
  const toast = useToast();
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Cmd[]>(() => {
    const label: Record<string, string> = { overview: 'Go to Overview', 'risk-map': 'Open Risk Map', simulator: 'Open Scenario Lab', crops: 'Compare Crops', food: 'View Food Security', planner: 'Open Intervention Planner' };
    const nav: Cmd[] = NAV.map((n) => ({ id: `nav-${n.id}`, group: 'Navigate', label: label[n.id] ?? `Go to ${n.label}`, hint: n.shortcut, icon: <n.icon className="h-4 w-4" />, keywords: n.label, run: () => app.navigate(n.id) }));
    const actions: Cmd[] = [
      { id: 'sim-thj', group: 'Actions', label: 'Simulate Thanjavur rice', icon: <FlaskConical className="h-4 w-4" />, keywords: 'what if scenario lab', run: () => app.simulateDistrict('thanjavur') },
      { id: 'rep-d', group: 'Actions', label: 'Generate Report · District Brief', icon: <FileText className="h-4 w-4" />, run: () => { app.navigate('reports'); app.setReportType('district'); } },
      { id: 'rep-f', group: 'Actions', label: 'Generate Report · Food Security Brief', icon: <FileText className="h-4 w-4" />, run: () => { app.navigate('reports'); app.setReportType('food'); } },
      { id: 'rep-c', group: 'Actions', label: 'Generate Report · Climate Risk Report', icon: <FileText className="h-4 w-4" />, run: () => { app.navigate('reports'); app.setReportType('climate'); } },
      { id: 'region', group: 'Actions', label: 'Change Region', hint: 'Tamil Nadu', icon: <MapPin className="h-4 w-4" />, run: () => toast({ tone: 'info', title: 'Tamil Nadu is the active pilot region', body: 'Karnataka and Andhra Pradesh onboarding in the next release.' }) },
    ];
    const presets: Cmd[] = PRESETS.map((p, i) => ({ id: `p-${p.id}`, group: 'Demo scenario', label: `Apply scenario · ${p.name}`, hint: String(i + 1), icon: <Layers className="h-4 w-4" />, keywords: p.description, run: () => { app.setPreset(p.id); toast({ tone: 'success', title: `Scenario applied · ${p.name}` }); } }));
    const districts: Cmd[] = DISTRICTS.map((d) => ({ id: `d-${d.id}`, group: 'Districts', label: d.name, hint: 'Open district', icon: <MapPin className="h-4 w-4" />, keywords: d.driver, run: () => { app.navigate('risk-map'); app.openDistrict(d.id); } }));
    return [...nav, ...actions, ...presets, ...districts];
  }, [app, toast]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return commands.filter((c) => c.group !== 'Districts').concat(commands.filter((c) => c.group === 'Districts').slice(0, 4));
    return commands.filter((c) => `${c.label} ${c.keywords ?? ''} ${c.group}`.toLowerCase().includes(s)).slice(0, 30);
  }, [q, commands]);

  useEffect(() => { setHi(0); }, [q, open]);
  useEffect(() => { if (open) setQ(''); else (document.activeElement as HTMLElement | null)?.blur(); }, [open]);
  useEffect(() => { listRef.current?.querySelector(`[data-idx="${hi}"]`)?.scrollIntoView({ block: 'nearest' }); }, [hi]);

  const run = (c: Cmd) => { setOpen(false); setTimeout(c.run, 0); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(filtered.length - 1, h + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    if (e.key === 'Enter' && filtered[hi]) { e.preventDefault(); run(filtered[hi]); }
    if (e.key === 'Escape') setOpen(false);
  };

  let lastGroup = '';
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <motion.div role="dialog" aria-label="Command palette" initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.16 }}
            className="glass w-full max-w-[600px] overflow-hidden rounded-2xl shadow-2xl shadow-black/70" onKeyDown={onKey}>
            <div className="flex items-center gap-3 border-b border-white/[0.07] px-4">
              <Search className="h-4 w-4 text-fog-500" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a command, district or scenario…" className="h-14 flex-1 bg-transparent text-[15px] text-fog-100 placeholder:text-fog-600 focus:outline-none" />
              <span className="kbd">ESC</span>
            </div>
            <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
              {filtered.length === 0 && (
                <div className="px-4 py-10 text-center"><div className="text-[13px] text-fog-300">No matches for “{q}”</div><div className="mt-1 text-[12px] text-fog-600">Try a district name, “report”, or “scenario”.</div></div>
              )}
              {filtered.map((c, i) => {
                const header = c.group !== lastGroup ? c.group : null;
                lastGroup = c.group;
                return (
                  <div key={c.id}>
                    {header && <div className="eyebrow px-3 pb-1 pt-3">{header}</div>}
                    <button data-idx={i} onMouseMove={() => setHi(i)} onClick={() => run(c)}
                      className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] transition-colors', i === hi ? 'bg-mint/[0.09] text-fog-100' : 'text-fog-300')}>
                      <span className={i === hi ? 'text-mint' : 'text-fog-500'}>{c.icon}</span>
                      <span className="flex-1 truncate">{c.label}</span>
                      {c.hint && <span className="font-mono text-[11px] text-fog-600">{c.hint}</span>}
                      {i === hi && <ArrowRight className="h-3.5 w-3.5 text-mint" />}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 border-t border-white/[0.06] px-4 py-2.5 text-[11px] text-fog-500">
              <span className="flex items-center gap-1"><span className="kbd">↑</span><span className="kbd">↓</span> navigate</span>
              <span className="flex items-center gap-1"><span className="kbd"><CornerDownLeft className="h-3 w-3" /></span> select</span>
              <span className="ml-auto">Tip: press <span className="kbd">G</span> then <span className="kbd">S</span> for Scenario Lab</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Clock, MapPin, ArrowRight, CloudSun, Sprout, Droplets, Wheat, ShieldCheck, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../state/AppState';
import { PageHeader, Panel } from '../components/ui/Panel';
import { Segmented } from '../components/ui/Segmented';
import { LevelBadge, levelColor } from '../components/ui/Badge';
import type { Alert, AlertCategory } from '../services/intelligenceService';
import { timeAgo } from '../lib/format';
import { useToast } from '../state/toast';
import { cn } from '../lib/cn';
import { DISTRICTS } from '../data/districts';

const ICON: Record<AlertCategory, typeof CloudSun> = { Climate: CloudSun, Agriculture: Sprout, Water: Droplets, 'Food security': Wheat };

export default function Alerts() {
  const { alerts, reviewed, markReviewed, navigate, simulateDistrict } = useApp();
  const toast = useToast();
  const [cat, setCat] = useState<'all' | AlertCategory>('all');
  const [show, setShow] = useState<'open' | 'reviewed'>('open');
  const list = alerts.filter((a) => (cat === 'all' || a.category === cat) && (show === 'open' ? !reviewed.has(a.id) : reviewed.has(a.id)));
  const counts = { HIGH: alerts.filter((a) => a.severity === 'HIGH' && !reviewed.has(a.id)).length, MEDIUM: alerts.filter((a) => a.severity === 'MEDIUM' && !reviewed.has(a.id)).length, INFO: alerts.filter((a) => a.severity === 'INFO' && !reviewed.has(a.id)).length };

  const act = (a: Alert) => {
    const d = DISTRICTS.find((x) => x.name === a.location);
    if (a.category === 'Agriculture' && d) return simulateDistrict(d.id);
    navigate(a.category === 'Water' ? 'water' : a.category === 'Food security' ? 'food' : a.category === 'Climate' ? 'climate' : 'risk-map');
  };

  return (
    <div>
      <PageHeader eyebrow="Operations" title="Alert Center" subtitle="Threshold-based alerts generated from model outputs. Each alert carries a recommended next action." />
      <div className="mb-4 grid grid-cols-3 gap-3">
        {(['HIGH', 'MEDIUM', 'INFO'] as const).map((s) => (
          <div key={s} className="panel flex items-center gap-3 p-4">
            <span className="h-9 w-1 rounded-full" style={{ background: levelColor(s), boxShadow: `0 0 10px ${levelColor(s)}` }} />
            <div><div className="eyebrow">{s === 'INFO' ? 'Info' : `${s.toLowerCase()} priority`}</div><div className="num text-[24px] font-semibold">{counts[s]}</div></div>
          </div>
        ))}
      </div>
      <Panel title="Alerts" eyebrow={`${list.length} ${show}`}
        actions={<div className="flex flex-wrap items-center gap-2"><Segmented value={cat} onChange={setCat} options={[{ value: 'all', label: 'All' }, { value: 'Climate', label: 'Climate' }, { value: 'Agriculture', label: 'Agriculture' }, { value: 'Water', label: 'Water' }, { value: 'Food security', label: 'Food' }]} /><Segmented value={show} onChange={setShow} options={[{ value: 'open', label: 'Open' }, { value: 'reviewed', label: 'Reviewed' }]} /></div>}>
        <div className="space-y-2.5">
          <AnimatePresence initial={false} mode="popLayout">
            {list.map((a) => {
              const Icon = ICON[a.category];
              const done = reviewed.has(a.id);
              return (
                <motion.div layout key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30, transition: { duration: 0.2 } }}
                  className={cn('relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4', done && 'opacity-70')}>
                  <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: levelColor(a.severity) }} />
                  <div className="flex flex-col gap-3 md:flex-row md:items-start">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03]"><Icon className="h-4 w-4" style={{ color: levelColor(a.severity) }} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><LevelBadge level={a.severity} /><span className="text-[11px] text-fog-500">{a.category}</span></div>
                      <div className="mt-1.5 text-[14.5px] font-semibold">{a.title}</div>
                      <div className="mt-0.5 text-[12.5px] text-fog-400">{a.detail}</div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-fog-500"><span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(a.minutesAgo)}</span><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{a.location}</span></div>
                      <div className="mt-3 rounded-lg border border-mint/15 bg-mint/[0.04] px-3 py-2 text-[12px] text-fog-300"><span className="font-semibold text-mint">Recommended action · </span>{a.action}</div>
                    </div>
                    <div className="flex shrink-0 gap-2 md:flex-col">
                      <button className="btn-ghost h-8 text-[12px]" onClick={() => act(a)}>Investigate <ArrowRight className="h-3.5 w-3.5" /></button>
                      {!done && <button className="btn-subtle h-8 text-[12px]" onClick={() => { markReviewed(a.id); toast({ tone: 'success', title: 'Alert marked as reviewed', body: a.title }); }}><CheckCircle2 className="h-3.5 w-3.5" />Mark as reviewed</button>}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {list.length === 0 && (
            <div className="py-14 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-mint/70" />
              <div className="mt-3 text-[14px] font-medium">{show === 'open' ? 'All clear' : 'Nothing reviewed yet'}</div>
              <div className="mt-1 text-[12.5px] text-fog-500">{show === 'open' ? 'No open alerts in this category for the current scenario.' : 'Reviewed alerts will appear here.'}</div>
              <button className="btn-subtle mx-auto mt-4 h-8 text-[12px]" onClick={() => navigate('settings')}><Settings2 className="h-3.5 w-3.5" />Alert thresholds</button>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Clock, MapPin, ArrowRight, CloudSun, Sprout, Droplets, Wheat, ShieldCheck, Settings2, RotateCcw, ListPlus } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../state/AppState';
import { PageHeader, Panel } from '../components/ui/Panel';
import { Segmented } from '../components/ui/Segmented';
import { LevelBadge, levelColor, Badge, type Tone } from '../components/ui/Badge';
import { EarlyWarningPanel } from '../components/EarlyWarningPanel';
import type { Alert, AlertCategory } from '../services/intelligenceService';
import { timeAgo } from '../lib/format';
import { useToast } from '../state/toast';
import { cn } from '../lib/cn';
import { DISTRICTS } from '../data/districts';
import { usePersisted } from '../lib/store';
import { ALERTS_KEY, ACTIONS_KEY, OWNERS, ALERT_STATUS_LABEL, newId, nowIso, addDays, seedActions, type AlertState, type AlertStatus, type ActionItem } from '../services/workflow';

const ICON: Record<AlertCategory, typeof CloudSun> = { Climate: CloudSun, Agriculture: Sprout, Water: Droplets, 'Food security': Wheat };
const STATUS_TONE: Record<AlertStatus, Tone> = { OPEN: 'neutral', ACKNOWLEDGED: 'cyan', ASSIGNED: 'amber', RESOLVED: 'mint' };

export default function Alerts() {
  const { alerts, reviewed, markReviewed, navigate, simulateDistrict } = useApp();
  const toast = useToast();
  const [life, setLife] = usePersisted<Record<string, AlertState>>(ALERTS_KEY, {});
  const [, setActions] = usePersisted<ActionItem[]>(ACTIONS_KEY, seedActions());
  const [pick, setPick] = useState<Record<string, string>>({});
  const [cat, setCat] = useState<'all' | AlertCategory>('all');
  const [show, setShow] = useState<'open' | 'resolved'>('open');

  const stateOf = (id: string): AlertState => life[id] ?? { status: 'OPEN', owner: '', updatedAt: '' };
  const isResolved = (a: Alert) => stateOf(a.id).status === 'RESOLVED' || reviewed.has(a.id);
  const set = (a: Alert, status: AlertStatus, owner?: string) =>
    setLife((m) => ({ ...m, [a.id]: { status, owner: owner ?? stateOf(a.id).owner, updatedAt: nowIso() } }));

  const list = alerts.filter((a) => (cat === 'all' || a.category === cat) && (show === 'open' ? !isResolved(a) : isResolved(a)));
  const openAll = alerts.filter((a) => !isResolved(a));
  const counts = { HIGH: openAll.filter((a) => a.severity === 'HIGH').length, MEDIUM: openAll.filter((a) => a.severity === 'MEDIUM').length, INFO: openAll.filter((a) => a.severity === 'INFO').length };

  const act = (a: Alert) => {
    const d = DISTRICTS.find((x) => x.name === a.location);
    if (a.category === 'Agriculture' && d) return simulateDistrict(d.id);
    navigate(a.category === 'Water' ? 'water' : a.category === 'Food security' ? 'food' : a.category === 'Climate' ? 'climate' : 'risk-map');
  };

  const acknowledge = (a: Alert) => { set(a, 'ACKNOWLEDGED'); toast({ tone: 'info', title: 'Alert acknowledged', body: a.title }); };
  const assign = (a: Alert) => {
    const owner = pick[a.id];
    if (!owner) { toast({ tone: 'warning', title: 'Choose an owner first' }); return; }
    set(a, 'ASSIGNED', owner);
    toast({ tone: 'success', title: 'Alert assigned', body: `${owner} · ${a.title}` });
  };
  const resolve = (a: Alert) => { set(a, 'RESOLVED'); markReviewed(a.id); toast({ tone: 'success', title: 'Alert resolved', body: a.title }); };
  const reopen = (a: Alert) => { set(a, 'OPEN'); toast({ tone: 'info', title: 'Alert reopened', body: a.title }); };
  const createAction = (a: Alert) => {
    const district = DISTRICTS.some((d) => d.name === a.location) ? a.location : 'Tamil Nadu';
    const owner = stateOf(a.id).owner || pick[a.id] || '';
    const t = nowIso();
    setActions((xs) => [{ id: newId('act'), title: a.action, district, owner, deadline: addDays(7), priority: a.severity === 'HIGH' ? 'HIGH' : 'MEDIUM', status: 'PENDING', source: 'Alert', createdAt: t, updatedAt: t }, ...xs]);
    toast({ tone: 'success', title: 'Added to Action Plan', body: a.action });
  };

  return (
    <div>
      <PageHeader eyebrow="Operations" title="Alert Center" subtitle="Alerts follow a lifecycle: open, acknowledged, assigned, resolved. Workflow state is stored in this browser only."/>
      <EarlyWarningPanel />
      <div className="my-4 grid grid-cols-3 gap-3">
        {(['HIGH', 'MEDIUM', 'INFO'] as const).map((s) => (
          <div key={s} className="panel flex items-center gap-3 p-4">
            <span className="h-9 w-1 rounded-full" style={{ background: levelColor(s), boxShadow: `0 0 10px ${levelColor(s)}` }} />
            <div><div className="eyebrow">{s === 'INFO' ? 'Info' : `${s.toLowerCase()} priority`}</div><div className="num text-[24px] font-semibold">{counts[s]}</div></div>
          </div>
        ))}
      </div>
      <Panel title="Alerts" eyebrow={`${list.length} ${show}`}
        actions={<div className="flex flex-wrap items-center gap-2"><Segmented value={cat} onChange={setCat} options={[{ value: 'all', label: 'All' }, { value: 'Climate', label: 'Climate' }, { value: 'Agriculture', label: 'Agriculture' }, { value: 'Water', label: 'Water' }, { value: 'Food security', label: 'Food' }]} /><Segmented value={show} onChange={setShow} options={[{ value: 'open', label: 'Open' }, { value: 'resolved', label: 'Resolved' }]} /></div>}>
        <div className="space-y-2.5">
          <AnimatePresence initial={false} mode="popLayout">
            {list.map((a) => {
              const Icon = ICON[a.category];
              const s = stateOf(a.id);
              const resolved = isResolved(a);
              const status: AlertStatus = resolved ? 'RESOLVED' : s.status;
              return (
                <motion.div layout key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30, transition: { duration: 0.2 } }}
                  className={cn('relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4', resolved && 'opacity-70')}>
                  <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: levelColor(a.severity) }} />
                  <div className="flex flex-col gap-3 md:flex-row md:items-start">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03]"><Icon className="h-4 w-4" style={{ color: levelColor(a.severity) }} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><LevelBadge level={a.severity} /><Badge tone={STATUS_TONE[status]} dot>{ALERT_STATUS_LABEL[status]}</Badge><span className="text-[11px] text-fog-500">{a.category}</span></div>
                      <div className="mt-1.5 text-[14.5px] font-semibold">{a.title}</div>
                      <div className="mt-0.5 text-[12.5px] text-fog-400">{a.detail}</div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-fog-500">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(a.minutesAgo)}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{a.location}</span>
                        {s.owner && <span>Owner: <span className="text-fog-300">{s.owner}</span></span>}
                      </div>
                      <div className="mt-3 rounded-lg border border-mint/15 bg-mint/[0.04] px-3 py-2 text-[12px] text-fog-300"><span className="font-semibold text-mint">Recommended action · </span>{a.action}</div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 md:w-[190px]">
                      <button className="btn-ghost h-8 text-[12px]" onClick={() => act(a)}>Investigate <ArrowRight className="h-3.5 w-3.5" /></button>
                      {!resolved && status === 'OPEN' && <button className="btn-subtle h-8 text-[12px]" onClick={() => acknowledge(a)}>Acknowledge</button>}
                      {!resolved && (
                        <div className="flex gap-1.5">
                          <select aria-label="Choose owner" className="h-8 min-w-0 flex-1 rounded-lg border border-white/10 bg-ink-900 px-1.5 text-[11.5px] text-fog-200" value={pick[a.id] ?? ''} onChange={(e) => setPick((p) => ({ ...p, [a.id]: e.target.value }))}>
                            <option value="">Owner…</option>
                            {OWNERS.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                          <button className="btn-subtle h-8 px-2 text-[12px]" onClick={() => assign(a)}>Assign</button>
                        </div>
                      )}
                      {!resolved && <button className="btn-subtle h-8 text-[12px]" onClick={() => createAction(a)}><ListPlus className="h-3.5 w-3.5" />Add to Action Plan</button>}
                      {!resolved && <button className="btn-subtle h-8 text-[12px]" onClick={() => resolve(a)}><CheckCircle2 className="h-3.5 w-3.5" />Resolve</button>}
                      {resolved && <button className="btn-subtle h-8 text-[12px]" onClick={() => reopen(a)}><RotateCcw className="h-3.5 w-3.5" />Reopen</button>}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {list.length === 0 && (
            <div className="py-14 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-mint/70" />
              <div className="mt-3 text-[14px] font-medium">{show === 'open' ? 'All clear' : 'Nothing resolved yet'}</div>
              <div className="mt-1 text-[12.5px] text-fog-500">{show === 'open' ? 'No open alerts in this category for the current scenario.' : 'Resolved alerts will appear here.'}</div>
              <button className="btn-subtle mx-auto mt-4 h-8 text-[12px]" onClick={() => navigate('settings')}><Settings2 className="h-3.5 w-3.5" />Alert thresholds</button>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

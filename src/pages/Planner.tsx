import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Check, X, FileCheck2, Clock, Wallet, Gauge, Users, ClipboardCopy, ListChecks, FlaskConical } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../state/AppState';
import { PageHeader, Panel } from '../components/ui/Panel';
import { Segmented } from '../components/ui/Segmented';
import { Badge, type Tone } from '../components/ui/Badge';
import { Modal } from '../components/ui/Overlay';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { INTERVENTIONS, summarisePlan, type InterventionId, type Level } from '../services/interventionService';
import { fmtINR } from '../lib/format';
import { cn } from '../lib/cn';
import { useToast } from '../state/toast';
import { presetById } from '../data/scenarios';

type SortKey = 'impact' | 'cost' | 'urgency' | 'feasibility';
const lvlNum: Record<Level, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };
const tone = (l: Level, goodHigh: boolean): Tone => (l === 'MEDIUM' ? 'amber' : (l === 'HIGH') === goodHigh ? 'mint' : 'ember');

export default function Planner() {
  const { params, risks, plan, togglePlan, clearPlan, presetId, simulateDistrict } = useApp();
  const toast = useToast();
  const [sort, setSort] = useState<SortKey>('impact');
  const [scope, setScope] = useState<'3' | '5' | 'all'>('5');
  const [open, setOpen] = useState(false);
  const targets = useMemo(() => (scope === 'all' ? risks.filter((r) => r.score >= 50) : risks.slice(0, Number(scope))), [risks, scope]);
  const safeTargets = targets.length ? targets : risks.slice(0, 3);

  const rows = useMemo(() => INTERVENTIONS.map((iv) => {
    const s = summarisePlan(params, safeTargets, [iv.id]);
    const impactScore = s.riskReductionPct + s.foodExposureReduction * 0.6;
    const impact: Level = impactScore >= 20 ? 'HIGH' : impactScore >= 8 ? 'MEDIUM' : 'LOW';
    const feasibility: Level = iv.complexity === 'LOW' ? 'HIGH' : iv.complexity === 'MEDIUM' ? 'MEDIUM' : 'LOW';
    return { iv, s, impact, impactScore, feasibility };
  }), [params, safeTargets]);

  const sorted = useMemo(() => [...rows].sort((a, b) => {
    if (!!a.iv.guardrail !== !!b.iv.guardrail) return a.iv.guardrail ? 1 : -1;
    if (sort === 'impact') return b.impactScore - a.impactScore;
    if (sort === 'cost') return lvlNum[a.iv.cost] - lvlNum[b.iv.cost] || b.impactScore - a.impactScore;
    if (sort === 'urgency') return a.iv.urgencyDays - b.iv.urgencyDays;
    return lvlNum[b.feasibility] - lvlNum[a.feasibility] || b.impactScore - a.impactScore;
  }), [rows, sort]);

  const summary = useMemo(() => summarisePlan(params, safeTargets, plan), [params, safeTargets, plan]);

  return (
    <div>
      <PageHeader eyebrow="Decision support" title="Intervention Planner" subtitle="Interventions ranked by modelled impact across the highest-risk districts. Build a response plan and see its combined effect before committing resources."
        actions={<><span className="text-[12px] text-fog-500">Target districts</span><Segmented value={scope} onChange={setScope} options={[{ value: '3', label: 'Top 3' }, { value: '5', label: 'Top 5' }, { value: 'all', label: 'All ≥50%' }]} /></>} />
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Panel eyebrow={`${safeTargets.length} districts · ${safeTargets.map((t) => t.district.name).slice(0, 4).join(', ')}${safeTargets.length > 4 ? '…' : ''}`} title="Ranked interventions"
          actions={<Segmented value={sort} onChange={setSort} options={[{ value: 'impact', label: 'Impact' }, { value: 'cost', label: 'Cost' }, { value: 'urgency', label: 'Urgency' }, { value: 'feasibility', label: 'Feasibility' }]} />}>
          <div className="space-y-2.5">
            {sorted.map(({ iv, s, impact, feasibility }, i) => {
              const added = plan.includes(iv.id);
              return (
                <motion.div layout key={iv.id} transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                  className={cn('flex flex-col gap-4 rounded-2xl border p-4 md:flex-row md:items-center', added ? 'border-mint/35 bg-mint/[0.05]' : 'border-white/[0.07] bg-white/[0.02]')}>
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="num grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] font-mono text-[14px] font-semibold text-fog-300">{i + 1}</div>
                    <div className="min-w-0">
                      <div className="text-[14.5px] font-semibold">{iv.id === 'diversify' ? 'Diversify rice acreage (30%)' : iv.name}</div>
                      <div className="mt-0.5 text-[12px] leading-relaxed text-fog-400">{iv.description}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge tone={tone(impact, true)}>Impact {impact}</Badge>
                        <Badge tone={tone(iv.cost, false)}>Cost {iv.cost}</Badge>
                        <Badge tone={iv.urgencyDays <= 7 ? 'danger' : iv.urgencyDays <= 14 ? 'amber' : 'neutral'}><Clock className="h-3 w-3" />Act within {iv.urgencyDays} days</Badge>
                        <Badge tone={tone(feasibility, true)}>Feasibility {feasibility}</Badge>
                        <Badge tone="neutral"><Users className="h-3 w-3" />{iv.owner}</Badge>
                        {iv.guardrail && <Badge tone="amber">Guardrail · reduces staple supply</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-5 md:pl-2">
                    <div className="text-right"><div className="text-[10px] uppercase tracking-wider text-fog-600">Risk</div><div className={cn('num font-mono text-[16px] font-semibold', s.riskReductionPct > 0.5 ? 'text-mint' : 'text-fog-500')}>{s.riskReductionPct > 0.5 ? `−${s.riskReductionPct.toFixed(0)}%` : '—'}</div></div>
                    <div className="text-right"><div className="text-[10px] uppercase tracking-wider text-fog-600">Water</div><div className={cn('num font-mono text-[16px] font-semibold', s.waterSavingsPct > 0.5 ? 'text-cyan' : 'text-fog-500')}>{s.waterSavingsPct > 0.5 ? `−${s.waterSavingsPct.toFixed(0)}%` : '—'}</div></div>
                    <div className="text-right"><div className="text-[10px] uppercase tracking-wider text-fog-600">Food</div><div className={cn('num font-mono text-[16px] font-semibold', s.foodExposureReduction > 0.5 ? 'text-lime' : 'text-fog-500')}>{s.foodExposureReduction > 0.5 ? `−${s.foodExposureReduction.toFixed(0)}` : '—'}</div></div>
                    <button onClick={() => { togglePlan(iv.id); toast({ tone: added ? 'info' : 'success', title: added ? `Removed ${iv.name}` : `Added to response plan`, body: added ? undefined : iv.name }); }}
                      className={cn('w-[124px] whitespace-nowrap', added ? 'btn-ghost' : 'btn-primary')}>{added ? <><Check className="h-4 w-4" />In plan</> : <><Plus className="h-4 w-4" />Add to plan</>}</button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Panel>

        <div className="xl:sticky xl:top-0 xl:self-start">
          <Panel eyebrow="Response plan" title={`${presetById(presetId).name} · draft`} actions={plan.length > 0 && <button className="btn-subtle h-7 px-2 text-[11.5px]" onClick={clearPlan}>Clear</button>}>
            <div className="grid grid-cols-2 gap-2.5">
              <Stat icon={<ListChecks className="h-3.5 w-3.5" />} label="Interventions" value={<AnimatedNumber value={summary.count} duration={400} />} />
              <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="Risk reduction" value={<span className="text-mint"><AnimatedNumber value={summary.riskReductionPct} duration={500} />%</span>} />
              <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="Water savings" value={<span className="text-cyan"><AnimatedNumber value={summary.waterSavingsPct} duration={500} />%</span>} />
              <Stat icon={<Wallet className="h-3.5 w-3.5" />} label="Est. cost" value={<span className="text-[16px]">{fmtINR(summary.costINR)}</span>} />
            </div>
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <div className="mb-2 flex justify-between text-[11.5px] text-fog-500"><span>Area-weighted crop risk</span><span className="num font-mono"><span className="text-fog-300">{summary.riskBefore.toFixed(0)}%</span> → <span className="text-mint">{summary.riskAfter.toFixed(0)}%</span></span></div>
              <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.05]">
                <motion.div className="absolute inset-y-0 left-0 rounded-full bg-ember/40" animate={{ width: `${summary.riskBefore}%` }} />
                <motion.div className="absolute inset-y-0 left-0 rounded-full bg-mint shadow-[0_0_10px_#3DF58A]" animate={{ width: `${summary.riskAfter}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              <AnimatePresence initial={false}>
                {plan.map((id) => {
                  const iv = INTERVENTIONS.find((x) => x.id === id)!;
                  return (
                    <motion.div key={id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                        <span className="flex-1 text-[12.5px]">{iv.short}</span>
                        <span className="text-[11px] text-fog-500">{iv.urgencyDays}d</span>
                        <button aria-label={`Remove ${iv.name}`} onClick={() => togglePlan(id)} className="text-fog-600 hover:text-fog-100"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {plan.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center">
                  <ListChecks className="mx-auto h-5 w-5 text-fog-600" />
                  <div className="mt-2 text-[12.5px] text-fog-400">No interventions yet</div>
                  <div className="mt-0.5 text-[11.5px] text-fog-600">Add from the ranked list, or send a plan from the Scenario Lab.</div>
                  <button className="btn-subtle mx-auto mt-3 h-8 text-[12px] text-mint" onClick={() => simulateDistrict(risks[0].district.id)}><FlaskConical className="h-3.5 w-3.5" />Open Scenario Lab</button>
                </div>
              )}
            </div>
            <button className="btn-primary mt-4 h-11 w-full text-[14px]" disabled={plan.length === 0} onClick={() => { setOpen(true); toast({ tone: 'success', title: 'Response plan generated', body: `${plan.length} interventions · ${safeTargets.length} districts` }); }}>
              <FileCheck2 className="h-4 w-4" />Generate response plan
            </button>
          </Panel>
        </div>
      </div>
      <PlanModal open={open} onClose={() => setOpen(false)} summary={summary} ids={plan} targets={safeTargets.map((t) => t.district.name)} />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-fog-500">{icon}{label}</div>
      <div className="num mt-1.5 text-[22px] font-semibold leading-none">{value}</div>
    </div>
  );
}

function PlanModal({ open, onClose, summary, ids, targets }: { open: boolean; onClose: () => void; summary: ReturnType<typeof summarisePlan>; ids: InterventionId[]; targets: string[] }) {
  const { presetId } = useApp();
  const toast = useToast();
  const items = ids.map((id) => INTERVENTIONS.find((x) => x.id === id)!).sort((a, b) => a.urgencyDays - b.urgencyDays);
  const text = `HarvestShield response plan — ${presetById(presetId).name}\nTarget districts: ${targets.join(', ')}\n` + items.map((i, n) => `${n + 1}. ${i.name} — act within ${i.urgencyDays} days (${i.owner})`).join('\n') + `\nModelled risk reduction ${summary.riskReductionPct.toFixed(0)}% · water savings ${summary.waterSavingsPct.toFixed(0)}% · est. cost ${fmtINR(summary.costINR)}\n(Prototype — illustrative values)`;
  return (
    <Modal open={open} onClose={onClose} title="Response plan" className="max-w-3xl">
      <div className="border-b border-white/[0.06] px-6 py-5">
        <div className="eyebrow text-mint/80">Response plan · generated {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
        <h2 className="mt-1 text-[22px] font-semibold tracking-tight">El Niño response plan · {presetById(presetId).name}</h2>
        <div className="mt-1 text-[12.5px] text-fog-400">Target districts: {targets.join(', ')}</div>
      </div>
      <div className="grid grid-cols-2 gap-3 px-6 pt-5 md:grid-cols-4">
        {[['Interventions', String(summary.count)], ['Risk reduction', `${summary.riskReductionPct.toFixed(0)}%`], ['Water savings', `${summary.waterSavingsPct.toFixed(0)}%`], ['Est. cost', fmtINR(summary.costINR)]].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><div className="text-[10.5px] uppercase tracking-wider text-fog-500">{k}</div><div className="num mt-1 text-[20px] font-semibold">{v}</div></div>
        ))}
      </div>
      <div className="px-6 py-5">
        <div className="eyebrow mb-3">Execution timeline (next 30 days)</div>
        <div className="space-y-2">
          {items.map((i, n) => (
            <div key={i.id} className="grid grid-cols-[160px_1fr] items-center gap-3 text-[12.5px]">
              <div className="truncate"><span className="font-mono text-fog-600">{n + 1}.</span> {i.short}</div>
              <div className="relative h-6 rounded-md bg-white/[0.03]">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(i.urgencyDays / 30) * 100}%` }} transition={{ delay: 0.1 + n * 0.08, duration: 0.6 }}
                  className="absolute inset-y-0 left-0 flex items-center justify-end rounded-md bg-gradient-to-r from-mint/20 to-mint/50 pr-2 text-[10.5px] font-medium text-ink-950">{i.urgencyDays}d</motion.div>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10.5px] text-fog-500">{i.owner}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-[11.5px] text-fog-600">Prototype output — modelled values are illustrative and require validation with district agriculture, water-resources and civil-supplies departments.</p>
      </div>
      <div className="flex justify-end gap-2 border-t border-white/[0.06] px-6 py-4">
        <button className="btn-ghost" onClick={() => { navigator.clipboard?.writeText(text).then(() => toast({ tone: 'success', title: 'Plan summary copied to clipboard' }), () => toast({ tone: 'warning', title: 'Clipboard unavailable in this browser' })); }}><ClipboardCopy className="h-4 w-4" />Copy summary</button>
        <button className="btn-primary" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}

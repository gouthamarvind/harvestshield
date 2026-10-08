import { AnimatePresence, motion } from 'framer-motion';
import { Check, CloudRain, Thermometer, Droplets, Waves, RotateCcw, ListPlus, Target, ArrowDown, ArrowUp, Wand2, MapPin, CalendarDays, Ruler, Sprout } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp, type SimState } from '../state/AppState';
import { Panel, PageHeader } from '../components/ui/Panel';
import { Slider } from '../components/ui/Slider';
import { Select } from '../components/ui/Select';
import { Segmented } from '../components/ui/Segmented';
import { RiskRing } from '../components/ui/RiskRing';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { FactorBars } from '../components/ui/FactorBars';
import { Badge, LevelBadge } from '../components/ui/Badge';
import { ChartTooltip } from '../components/ui/ChartTooltip';
import { DISTRICTS, districtById, primaryCrop } from '../data/districts';
import { CROPS, CROP_IDS, type CropId } from '../data/crops';
import { presetById, ensoLabel } from '../data/scenarios';
import { basePlan, evaluatePlan, optimise, objectiveScore, planComplexity, OBJECTIVES, type Objective, type Plan, type PlanOutcome } from '../model/plan';
import { INTERVENTIONS, type InterventionId, type Level } from '../services/interventionService';
import { signalLevel } from '../services/foodSecurityService';
import { riskBand, riskColor } from '../lib/risk';
import { cn } from '../lib/cn';
import { fmtINR, fmtInt, fmtSigned } from '../lib/format';
import { useToast } from '../state/toast';

const SOWING = [
  { value: '-2', label: 'Early', date: '1 Oct' },
  { value: '0', label: 'Standard', date: '15 Oct' },
  { value: '2', label: '+2 wk', date: '29 Oct' },
  { value: '4', label: '+4 wk', date: '12 Nov' },
] as const;

function buildPlan(base: Plan, ids: InterventionId[], share: number): Plan {
  const p = { ...base };
  if (ids.includes('diversify')) p.diversify = share;
  if (ids.includes('switch')) p.diversify = 1;
  if (ids.includes('delay')) p.sowingShift = Math.min(4, base.sowingShift + 2);
  if (ids.includes('awd')) p.awd = true;
  if (ids.includes('protect')) p.protectWater = true;
  if (ids.includes('reserves')) p.reserves = true;
  return p;
}
function planToIds(p: Plan): InterventionId[] {
  const ids: InterventionId[] = [];
  if (p.diversify >= 1) ids.push('switch'); else if (p.diversify > 0) ids.push('diversify');
  if (p.sowingShift > 0) ids.push('delay');
  if (p.awd) ids.push('awd');
  if (p.protectWater) ids.push('protect');
  if (p.reserves) ids.push('reserves');
  return ids;
}
function describePlan(p: Plan): string {
  const parts: string[] = [];
  if (p.diversify >= 1) parts.push(`100% ${CROPS[p.altCrop].name}`);
  else if (p.diversify > 0) parts.push(`${Math.round((1 - p.diversify) * 100)}% ${CROPS[p.crop].name} · ${Math.round(p.diversify * 100)}% ${CROPS[p.altCrop].name}`);
  else parts.push(`100% ${CROPS[p.crop].name}`);
  return parts.join('');
}

export default function Simulator() {
  const { sim, setSim, presetId, togglePlan, plan: responsePlan, navigate } = useApp();
  const toast = useToast();
  const preset = presetById(presetId);
  const d = districtById(sim.districtId)!;
  const p = sim.params;

  const baseline: Plan = useMemo(() => ({ ...basePlan(sim.crop), sowingShift: sim.sowingShift }), [sim.crop, sim.sowingShift]);
  const active: Plan = useMemo(() => buildPlan(baseline, sim.interventions, sim.diversifyShare), [baseline, sim.interventions, sim.diversifyShare]);
  const base = useMemo(() => evaluatePlan(p, baseline, sim.areaHa, d), [p, baseline, sim.areaHa, d]);
  const out = useMemo(() => evaluatePlan(p, active, sim.areaHa, d), [p, active, sim.areaHa, d]);
  const rec = useMemo(() => optimise(p, sim.crop, sim.areaHa, sim.objective, d), [p, sim.crop, sim.areaHa, sim.objective, d]);
  const hasInt = sim.interventions.length > 0;

  const setParam = (k: keyof SimState['params'], v: number) => setSim({ params: { ...p, [k]: v } });
  const toggle = (id: InterventionId) => {
    let next = sim.interventions.includes(id) ? sim.interventions.filter((x) => x !== id) : [...sim.interventions, id];
    if (id === 'switch' && next.includes('switch')) next = next.filter((x) => x !== 'diversify');
    if (id === 'diversify' && next.includes('diversify')) next = next.filter((x) => x !== 'switch');
    setSim({ interventions: next });
  };
  const applyRec = () => {
    setSim({ interventions: planToIds(rec.plan), diversifyShare: rec.plan.diversify > 0 && rec.plan.diversify < 1 ? rec.plan.diversify : sim.diversifyShare });
    toast({ tone: 'success', title: 'Recommended plan applied', body: `Optimised for ${OBJECTIVES.find((o) => o.id === sim.objective)!.label.toLowerCase()}.` });
  };
  const sendToPlanner = () => {
    const ids = sim.interventions.filter((i) => !responsePlan.includes(i));
    ids.forEach(togglePlan);
    toast({ tone: 'success', title: `${ids.length || 'No new'} intervention${ids.length === 1 ? '' : 's'} added to response plan`, body: ids.length ? 'Review and finalise in the Intervention Planner.' : 'Selected interventions are already in the plan.' });
    navigate('planner');
  };
  const drift = (Object.keys(p) as (keyof typeof p)[]).some((k) => p[k] !== preset.params[k]);

  return (
    <div>
      <PageHeader eyebrow="What-if engine · Counterfactual simulation" title={<>Climate Scenario Lab</>}
        subtitle={<>Change the future before it happens. Adjust climate drivers and farm decisions for <span className="text-fog-100">{d.name}</span> and watch risk, yield, water and food security respond instantly.</>}
        actions={<>
          <button className="btn-ghost" onClick={() => setSim({ params: { ...preset.params }, interventions: [], sowingShift: 0, crop: primaryCrop(d) })}><RotateCcw className="h-4 w-4" />Reset</button>
          <button className="btn-primary" onClick={sendToPlanner} disabled={!hasInt}><ListPlus className="h-4 w-4" />Add to response plan</button>
        </>} />

      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        {/* CONTROLS */}
        <Panel eyebrow="Scenario controls" title="Inputs" className="xl:sticky xl:top-0 xl:self-start"
          actions={drift ? <Badge tone="amber">Custom</Badge> : <Badge tone="neutral">{preset.short}</Badge>}>
          <div className="space-y-5">
            <div className="space-y-4">
              <div className="eyebrow">Climate drivers</div>
              {p.local?.[sim.districtId] && <div className="rounded-lg border border-mint/20 bg-mint/[0.05] px-3 py-2 text-[11.5px] leading-relaxed text-fog-300">Using observed data for {districtById(sim.districtId)?.name}: rainfall {p.local[sim.districtId].rainfall > 0 ? '+' : ''}{p.local[sim.districtId].rainfall.toFixed(0)}%, temperature {p.local[sim.districtId].temperature >= 0 ? '+' : ''}{p.local[sim.districtId].temperature.toFixed(1)}°C. Moving the rainfall or temperature slider switches to a what-if value.</div>}
              <Slider label="El Niño intensity" icon={<Waves className="h-3.5 w-3.5 text-amber" />} value={p.enso} min={-0.5} max={3} step={0.1} onChange={(v) => setParam('enso', v)} format={(v) => `${v.toFixed(1)}°C`} hint={ensoLabel(p.enso).toLowerCase()} accent="#F5B83D" baseline={preset.params.enso} />
              <Slider label="Rainfall anomaly" icon={<CloudRain className="h-3.5 w-3.5 text-cyan" />} value={p.rainfall} min={-45} max={20} onChange={(v) => setParam('rainfall', v)} format={(v) => fmtSigned(v, 0, '%')} hint="vs long-period avg" accent="#4FE3F0" baseline={preset.params.rainfall} />
              <Slider label="Temperature anomaly" icon={<Thermometer className="h-3.5 w-3.5 text-ember" />} value={p.temperature} min={-0.5} max={3} step={0.1} onChange={(v) => setParam('temperature', v)} format={(v) => fmtSigned(v, 1, '°C')} accent="#FF7A3D" baseline={preset.params.temperature} />
              <Slider label="Water availability" icon={<Droplets className="h-3.5 w-3.5 text-[#7C9CFF]" />} value={p.water} min={10} max={100} onChange={(v) => setParam('water', v)} format={(v) => `${v}%`} hint="reservoir storage" accent="#7C9CFF" baseline={preset.params.water} />
            </div>
            <div className="divider" />
            <div className="space-y-4">
              <div className="eyebrow">Farm plan</div>
              <div>
                <div className="mb-1.5 flex items-center gap-2 text-[12.5px] font-medium text-fog-300"><MapPin className="h-3.5 w-3.5 text-fog-500" />District</div>
                <Select value={sim.districtId} label="District" onChange={(id) => setSim({ districtId: id, crop: primaryCrop(districtById(id)!), interventions: [] })}
                  options={DISTRICTS.map((x) => ({ value: x.id, label: x.name, hint: x.driver }))} />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-2 text-[12.5px] font-medium text-fog-300"><Sprout className="h-3.5 w-3.5 text-fog-500" />Crop</div>
                <Select<CropId> value={sim.crop} label="Crop" onChange={(c) => setSim({ crop: c, interventions: sim.interventions.filter((i) => c !== 'millet' || (i !== 'diversify' && i !== 'switch')) })}
                  options={CROP_IDS.map((c) => ({ value: c, label: CROPS[c].name, hint: `Water need ${Math.round(CROPS[c].waterNeed * 100)} · base yield ${CROPS[c].baseYield} t/ha`, icon: <span className="h-2 w-2 rounded-full" style={{ background: CROPS[c].color }} /> }))} />
              </div>
              <Slider label="Farm area" icon={<Ruler className="h-3.5 w-3.5 text-fog-500" />} value={sim.areaHa} min={1} max={500} onChange={(v) => setSim({ areaHa: v })} format={(v) => `${v} ha`} hint={`${(sim.areaHa * 2.47).toFixed(0)} acres`} />
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[12.5px] font-medium text-fog-300"><span className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-fog-500" />Sowing date</span><span className="font-mono text-[12px] text-fog-100">{SOWING.find((s) => Number(s.value) === sim.sowingShift)!.date} 2026</span></div>
                <Segmented className="w-full" value={String(sim.sowingShift) as (typeof SOWING)[number]['value']} onChange={(v) => setSim({ sowingShift: Number(v) })}
                  options={SOWING.map((s) => ({ value: s.value, label: s.label }))} />
              </div>
            </div>
          </div>
        </Panel>

        {/* OUTPUTS */}
        <div className="min-w-0 space-y-4">
          <LiveOutput base={base} out={out} hasInt={hasInt} />
          <Comparison base={base} out={out} baseline={baseline} active={active} hasInt={hasInt} interventions={sim.interventions} />
          <Panel eyebrow="Counterfactual levers" title="Intervention options" delay={0.1}
            actions={
              <div className="flex items-center gap-2">
                <Target className="hidden h-4 w-4 text-fog-500 sm:block" />
                <span className="hidden text-[12px] text-fog-500 sm:inline">Optimize for</span>
                <Select<Objective> value={sim.objective} onChange={(o) => setSim({ objective: o })} label="Optimize for" align="right" className="w-[250px]" menuClass="w-[300px]"
                  options={OBJECTIVES.map((o) => ({ value: o.id, label: o.label, hint: o.hint }))} />
              </div>}>
            <Recommendation rec={rec} base={base} onApply={applyRec} current={sim.interventions} objective={sim.objective} />
            <InterventionGrid baseline={baseline} base={base} toggle={toggle} />
          </Panel>
          <div className="grid gap-4 2xl:grid-cols-2">
            <Sensitivity baseline={baseline} active={active} hasInt={hasInt} />
            <Panel eyebrow="Explainability" title="Why is the risk what it is?" delay={0.15}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div><div className="mb-3 text-[12px] font-medium text-fog-400">Current plan · <span className="num" style={{ color: riskColor(base.risk) }}>{base.risk.toFixed(0)}%</span></div><FactorBars factors={base.factors} max={32} compact /></div>
                <div><div className="mb-3 text-[12px] font-medium text-fog-400">{hasInt ? 'With interventions' : 'Select an intervention'} · <span className="num" style={{ color: riskColor(out.risk) }}>{out.risk.toFixed(0)}%</span></div><FactorBars factors={out.factors} max={32} compact /></div>
              </div>
              <p className="mt-4 text-[11.5px] leading-relaxed text-fog-600">Additive contributions (risk points) from the transparent prototype heuristic. Each factor is a named, inspectable term — not a black box.</p>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Live output ------------------------------ */
function Delta({ v, unit = '', goodWhenNegative = true, dp = 0 }: { v: number; unit?: string; goodWhenNegative?: boolean; dp?: number }) {
  if (Math.abs(v) < 0.05) return <span className="text-[11px] text-fog-600">no change</span>;
  const good = goodWhenNegative ? v < 0 : v > 0;
  const Icon = v < 0 ? ArrowDown : ArrowUp;
  return <span className={cn('num inline-flex items-center gap-0.5 font-mono text-[11.5px]', good ? 'text-mint' : 'text-ember')}><Icon className="h-3 w-3" />{Math.abs(v).toFixed(dp)}{unit}</span>;
}

function LiveOutput({ base, out, hasInt }: { base: PlanOutcome; out: PlanOutcome; hasInt: boolean }) {
  const lvl = signalLevel(out.foodExposure);
  const tiles = [
    { k: 'Expected yield', v: <AnimatedNumber value={out.yieldTHa} decimals={2} duration={450} />, u: 't/ha', d: <Delta v={((out.yieldTHa - base.yieldTHa) / base.yieldTHa) * 100} unit="%" goodWhenNegative={false} dp={1} />, sub: <>Production <span className="num text-fog-300">{fmtInt(out.productionT)} t</span></> },
    { k: 'Water requirement', v: <AnimatedNumber value={out.waterML} duration={450} />, u: 'ML', d: <Delta v={((out.waterML - base.waterML) / base.waterML) * 100} unit="%" />, sub: <>{fmtInt(out.waterML * 1000)} m³ per season</> },
    { k: 'Potential production loss', v: <AnimatedNumber value={out.lossT} duration={450} />, u: 't', d: <Delta v={out.lossT - base.lossT} unit=" t" />, sub: <>{((out.lossT / Math.max(1, out.potentialT)) * 100).toFixed(0)}% of normal-season output</> },
    { k: 'Food-security exposure', v: <AnimatedNumber value={out.foodExposure} duration={450} />, u: '/100', d: <Delta v={out.foodExposure - base.foodExposure} />, sub: <LevelBadge level={lvl} className="!py-0 !text-[10px]" /> },
  ];
  return (
    <Panel eyebrow="Live simulation output" title={hasInt ? 'Intervention plan outcome' : 'Current plan outcome'} bodyClass="pt-2"
      actions={<span className="flex items-center gap-1.5 text-[11px] text-fog-500"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" />Recomputed in real time</span>}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex shrink-0 items-center gap-5">
          <RiskRing value={out.risk} size={176} label="Crop risk" sublabel={riskBand(out.risk)} />
          <AnimatePresence>
            {hasInt && Math.abs(base.risk - out.risk) > 0.5 && (
              <motion.div initial={{ opacity: 0, x: -8, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0 }} className="lg:hidden xl:block">
                <div className="eyebrow">vs current</div>
                <div className={cn('num mt-1 text-[28px] font-semibold leading-none', out.risk < base.risk ? 'text-mint glow-text' : 'text-ember')}>{out.risk < base.risk ? '−' : '+'}<AnimatedNumber value={Math.abs(base.risk - out.risk)} /></div>
                <div className="mt-1 text-[11px] text-fog-500">percentage points</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2.5">
          {tiles.map((t) => (
            <div key={t.k} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <div className="flex items-center justify-between"><div className="eyebrow">{t.k}</div>{hasInt && t.d}</div>
              <div className="mt-2 flex items-baseline gap-1"><span className="num text-[24px] font-semibold leading-none">{t.v}</span><span className="text-[12px] text-fog-500">{t.u}</span></div>
              <div className="mt-1.5 text-[11px] text-fog-500">{t.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------ Comparison ------------------------------ */
function Comparison({ base, out, baseline, active, hasInt, interventions }: { base: PlanOutcome; out: PlanOutcome; baseline: Plan; active: Plan; hasInt: boolean; interventions: InterventionId[] }) {
  const riskDelta = out.risk - base.risk;
  const waterDelta = ((out.waterML - base.waterML) / base.waterML) * 100;
  const foodDelta = out.foodExposure - base.foodExposure;
  const incomeDelta = out.netIncome - base.netIncome;
  const labels = interventions.map((i) => INTERVENTIONS.find((x) => x.id === i)!.short.replace('Diversify 30%', `Diversify ${Math.round(active.diversify * 100)}%`));
  return (
    <Panel eyebrow="Baseline vs intervention" title="What changes if we act now?" delay={0.05}>
      <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
        <PlanCard tone="base" title="Current plan" plan={describePlan(baseline)} o={base} />
        <div className="flex flex-row items-center justify-center gap-3 md:flex-col md:px-2">
          <AnimatePresence mode="popLayout">
            {hasInt ? (
              <motion.div key="d" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-row gap-2 md:flex-col">
                <DeltaPill label="risk" value={`${riskDelta <= 0 ? '−' : '+'}${Math.abs(riskDelta).toFixed(0)} pts`} good={riskDelta <= 0} big />
                <DeltaPill label="water demand" value={`${waterDelta <= 0 ? '−' : '+'}${Math.abs(waterDelta).toFixed(0)}%`} good={waterDelta <= 0} />
                <DeltaPill label="food exposure" value={`${foodDelta <= 0 ? '−' : '+'}${Math.abs(foodDelta).toFixed(0)}`} good={foodDelta <= 0} />
                <DeltaPill label="net income" value={`${incomeDelta >= 0 ? '+' : '−'}${fmtINR(Math.abs(incomeDelta))}`} good={incomeDelta >= 0} />
              </motion.div>
            ) : (
              <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-[160px] text-center text-[12px] leading-relaxed text-fog-500">
                <Wand2 className="mx-auto mb-2 h-5 w-5 text-fog-600" />Select an intervention below or apply the recommendation to see the counterfactual.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <PlanCard tone="int" title={hasInt ? 'Intervention plan' : 'Intervention plan (empty)'} plan={describePlan(active)} o={out} chips={labels} muted={!hasInt} />
      </div>
    </Panel>
  );
}
function DeltaPill({ label, value, good, big }: { label: string; value: string; good: boolean; big?: boolean }) {
  return (
    <div className={cn('rounded-xl border px-3 py-2 text-center', good ? 'border-mint/25 bg-mint/[0.07]' : 'border-ember/25 bg-ember/[0.07]')}>
      <div className={cn('num font-mono font-semibold', big ? 'text-[20px]' : 'text-[14px]', good ? 'text-mint' : 'text-ember')}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-fog-500">{label}</div>
    </div>
  );
}
function PlanCard({ tone, title, plan, o, chips, muted }: { tone: 'base' | 'int'; title: string; plan: string; o: PlanOutcome; chips?: string[]; muted?: boolean }) {
  return (
    <motion.div layout className={cn('relative overflow-hidden rounded-2xl border p-4', tone === 'int' && !muted ? 'border-mint/30 bg-gradient-to-br from-mint/[0.08] to-transparent' : 'border-white/[0.07] bg-white/[0.02]', muted && 'opacity-60')}>
      <div className="eyebrow" style={{ color: tone === 'int' && !muted ? '#3DF58A' : undefined }}>{title}</div>
      <div className="mt-1 text-[15px] font-semibold">{plan}</div>
      <div className="mt-2 flex min-h-[22px] flex-wrap gap-1">{chips?.map((c) => <Badge key={c} tone="mint">{c}</Badge>)}{!chips?.length && <span className="text-[11.5px] text-fog-600">No interventions</span>}</div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div><div className="text-[10.5px] text-fog-500">Risk</div><div className="num text-[22px] font-semibold" style={{ color: riskColor(o.risk) }}><AnimatedNumber value={o.risk} duration={500} />%</div></div>
        <div><div className="text-[10.5px] text-fog-500">Yield</div><div className="num text-[22px] font-semibold"><AnimatedNumber value={o.yieldTHa} decimals={1} duration={500} /><span className="text-[12px] text-fog-500">t</span></div></div>
        <div><div className="text-[10.5px] text-fog-500">Water</div><div className="num text-[22px] font-semibold"><AnimatedNumber value={o.waterML} duration={500} /><span className="text-[12px] text-fog-500">ML</span></div></div>
      </div>
    </motion.div>
  );
}

/* ------------------------------ Recommendation ------------------------------ */
function Recommendation({ rec, base, onApply, current, objective }: { rec: { plan: Plan; outcome: PlanOutcome }; base: PlanOutcome; onApply: () => void; current: InterventionId[]; objective: Objective }) {
  const ids = planToIds(rec.plan);
  const applied = ids.length === current.length && ids.every((i) => current.includes(i));
  const obj = OBJECTIVES.find((o) => o.id === objective)!;
  return (
    <motion.div key={objective + ids.join()} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex flex-col gap-4 rounded-2xl border border-mint/25 bg-[radial-gradient(500px_160px_at_0%_0%,rgba(61,245,138,0.12),transparent)] p-4 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><Badge tone="mint" dot>Recommended</Badge><span className="text-[11.5px] text-fog-500">{obj.label}</span></div>
        <div className="mt-2 text-[16px] font-semibold">{describePlan(rec.plan)}{ids.length > 0 && <span className="text-fog-400"> + {ids.filter((i) => i !== 'diversify' && i !== 'switch').map((i) => INTERVENTIONS.find((x) => x.id === i)!.short).join(' + ') || 'no other levers'}</span>}</div>
        <div className="mt-1 text-[12px] text-fog-500">{ids.length === 0 ? 'Under this objective the current plan is already optimal.' : `${planComplexity(rec.plan)} coordinated levers · searched ~160 counterfactual plans · keeps ≥50% staple acreage`}</div>
      </div>
      <div className="flex shrink-0 items-center gap-5">
        <div><div className="text-[10.5px] text-fog-500">Risk</div><div className="num text-[18px] font-semibold" style={{ color: riskColor(rec.outcome.risk) }}>{rec.outcome.risk.toFixed(0)}% <span className="text-[12px] text-mint">{fmtSigned(rec.outcome.risk - base.risk, 0)}</span></div></div>
        <div><div className="text-[10.5px] text-fog-500">Production</div><div className="num text-[18px] font-semibold">{fmtInt(rec.outcome.productionT)}<span className="text-[11px] text-fog-500"> t</span></div></div>
        <div className="hidden sm:block"><div className="text-[10.5px] text-fog-500">Water</div><div className="num text-[18px] font-semibold">{fmtSigned(((rec.outcome.waterML - base.waterML) / base.waterML) * 100, 0, '%')}</div></div>
        <button className={applied ? 'btn-ghost' : 'btn-primary'} onClick={onApply} disabled={applied || ids.length === 0}>{applied ? <><Check className="h-4 w-4" />Applied</> : <><Wand2 className="h-4 w-4" />Apply</>}</button>
      </div>
    </motion.div>
  );
}

/* ------------------------------ Intervention grid ------------------------------ */
const levelTone = (l: Level, inverse = false) => (l === 'LOW' ? (inverse ? 'danger' : 'mint') : l === 'MEDIUM' ? 'amber' : inverse ? 'mint' : 'ember') as 'mint' | 'amber' | 'ember' | 'danger';

function InterventionGrid({ baseline, base, toggle }: { baseline: Plan; base: PlanOutcome; toggle: (id: InterventionId) => void }) {
  const { sim, setSim } = useApp();
  const d = districtById(sim.districtId)!;
  const cards = useMemo(() => {
    return INTERVENTIONS.map((iv) => {
      const disabled = sim.crop === 'millet' && (iv.id === 'diversify' || iv.id === 'switch');
      const o = evaluatePlan(sim.params, buildPlan(baseline, [iv.id], sim.diversifyShare), sim.areaHa, d);
      const benefit = objectiveScore(base, sim.objective, base, 0) - objectiveScore(o, sim.objective, base, 0);
      return { iv, o, disabled, benefit, riskRed: base.risk - o.risk, riskRedPct: ((base.risk - o.risk) / base.risk) * 100, water: ((o.waterML - base.waterML) / base.waterML) * 100, food: base.foodExposure - o.foodExposure };
    }).sort((a, b) => Number(a.disabled) - Number(b.disabled) || Number(!!a.iv.guardrail) - Number(!!b.iv.guardrail) || b.benefit - a.benefit);
  }, [sim.params, sim.crop, sim.areaHa, sim.diversifyShare, sim.objective, baseline, base, d]);
  return (
    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {cards.map(({ iv, disabled, riskRed, riskRedPct, water, food, benefit }, idx) => {
        const on = sim.interventions.includes(iv.id);
        const best = idx < 2 && benefit > 0.5 && !disabled && !iv.guardrail;
        return (
          <motion.div layout key={iv.id} transition={{ type: 'spring', stiffness: 400, damping: 36 }}
            className={cn('group relative rounded-2xl border p-4 transition-colors', on ? 'border-mint/45 bg-mint/[0.07] shadow-[0_0_0_1px_rgba(61,245,138,0.15),0_10px_30px_-12px_rgba(61,245,138,0.35)]' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.16]', disabled && 'pointer-events-none opacity-40')}>
            <button className="absolute inset-0 rounded-2xl" aria-pressed={on} aria-label={`${on ? 'Remove' : 'Apply'} ${iv.name}`} onClick={() => toggle(iv.id)} />
            <div className="pointer-events-none relative flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2"><span className="text-[14px] font-semibold">{iv.id === 'diversify' ? `Diversify ${Math.round(sim.diversifyShare * 100)}%` : iv.name}</span>{best && <Badge tone="lime">Best fit</Badge>}{iv.guardrail && <Badge tone="amber">Guardrail</Badge>}</div>
                <div className="mt-0.5 text-[11px] text-fog-500">{iv.category} · {iv.owner}</div>
              </div>
              <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md border transition', on ? 'border-mint bg-mint text-ink-950' : 'border-white/20')}>{on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
            </div>
            <p className="pointer-events-none relative mt-2 text-[12px] leading-relaxed text-fog-400">{iv.description}</p>
            {iv.id === 'diversify' && on && (
              <div className="relative z-10 mt-3 rounded-lg border border-white/[0.06] bg-black/20 p-2.5" onClick={(e) => e.stopPropagation()}>
                <Slider label="Share moved to millet" value={Math.round(sim.diversifyShare * 100)} min={10} max={50} step={5} onChange={(v) => setSim({ diversifyShare: v / 100 })} format={(v) => `${v}%`} />
              </div>
            )}
            <div className="pointer-events-none relative mt-3 grid grid-cols-3 gap-2 border-t border-white/[0.05] pt-3">
              <div><div className="text-[10px] uppercase tracking-wider text-fog-600">Risk reduction</div><div className={cn('num font-mono text-[15px] font-semibold', riskRed > 0.5 ? 'text-mint' : 'text-fog-400')}>{riskRed > 0.5 ? `−${riskRedPct.toFixed(0)}%` : food > 1 ? '—' : '0%'}</div></div>
              <div><div className="text-[10px] uppercase tracking-wider text-fog-600">Water</div><div className={cn('num font-mono text-[15px] font-semibold', water < -0.5 ? 'text-cyan' : 'text-fog-400')}>{fmtSigned(water, 0, '%')}</div></div>
              <div><div className="text-[10px] uppercase tracking-wider text-fog-600">Food exp.</div><div className={cn('num font-mono text-[15px] font-semibold', food > 0.5 ? 'text-mint' : 'text-fog-400')}>{food > 0.5 ? `−${food.toFixed(0)}` : '0'}</div></div>
            </div>
            <div className="pointer-events-none relative mt-3 flex flex-wrap items-center gap-1.5">
              <Badge tone={levelTone(iv.cost)}>Cost {iv.cost.toLowerCase()}</Badge>
              <Badge tone={levelTone(iv.complexity)}>Effort {iv.complexity.toLowerCase()}</Badge>
              <span className="ml-auto text-[11px] text-fog-500">Confidence <span className="num text-fog-300">{Math.round(iv.confidence * 100)}%</span></span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ------------------------------ Sensitivity ------------------------------ */
function Sensitivity({ baseline, active, hasInt }: { baseline: Plan; active: Plan; hasInt: boolean }) {
  const { sim } = useApp();
  const d = districtById(sim.districtId)!;
  const [driver, setDriver] = useState<'rainfall' | 'water' | 'enso'>('rainfall');
  const cfg = { rainfall: { min: -45, max: 20, step: 5, unit: '%', label: 'Rainfall anomaly' }, water: { min: 10, max: 100, step: 5, unit: '%', label: 'Water availability' }, enso: { min: -0.5, max: 3, step: 0.25, unit: '°C', label: 'El Niño intensity' } }[driver];
  const data = useMemo(() => {
    const rows = [];
    for (let x = cfg.min; x <= cfg.max + 1e-9; x += cfg.step) {
      const pp = { ...sim.params, [driver]: +x.toFixed(2) };
      rows.push({ x: +x.toFixed(2), baseline: +evaluatePlan(pp, baseline, sim.areaHa, d).risk.toFixed(1), intervention: hasInt ? +evaluatePlan(pp, active, sim.areaHa, d).risk.toFixed(1) : null });
    }
    return rows;
  }, [driver, cfg, sim.params, sim.areaHa, baseline, active, hasInt, d]);
  const cur = sim.params[driver];
  const curBase = evaluatePlan(sim.params, baseline, sim.areaHa, d).risk;
  return (
    <Panel eyebrow="Sensitivity" title="How fragile is this plan?" delay={0.1}
      actions={<Segmented value={driver} onChange={setDriver} options={[{ value: 'rainfall', label: 'Rain' }, { value: 'water', label: 'Water' }, { value: 'enso', label: 'ENSO' }]} />}>
      <div className="h-[250px]">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="x" type="number" domain={[cfg.min, cfg.max]} tickFormatter={(v) => `${v}${cfg.unit}`} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
            <ReferenceLine y={70} stroke="#FF4D5E" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Critical', position: 'insideTopRight', fill: '#FF4D5E', fontSize: 10 }} />
            <ReferenceLine x={cur} stroke="rgba(255,255,255,0.25)" strokeDasharray="2 3" />
            <Tooltip content={<ChartTooltip unit={{ baseline: '%', intervention: '%' }} labelFormat={(l) => `${cfg.label}: ${l}${cfg.unit}`} digits={0} />} />
            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: '#7E978A' }} />
            <Line type="monotone" dataKey="baseline" name="Current plan" stroke="#FF7A3D" strokeWidth={2} dot={false} animationDuration={500} />
            {hasInt && <Line type="monotone" dataKey="intervention" name="Intervention plan" stroke="#3DF58A" strokeWidth={2.4} dot={false} animationDuration={500} />}
            <ReferenceDot x={cur} y={curBase} r={4} fill="#FF7A3D" stroke="#06110D" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[11.5px] text-fog-600">Risk across the full range of {cfg.label.toLowerCase()} holding other drivers at current values. The gap between the lines is the risk the plan prevents.</p>
    </Panel>
  );
}


import { motion } from 'framer-motion';
import { Droplets, Wand2, RotateCcw, Home, Tractor, Gauge } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../state/AppState';
import { PageHeader, Panel } from '../components/ui/Panel';
import { Kpi } from '../components/Kpi';
import { Slider } from '../components/ui/Slider';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { Badge } from '../components/ui/Badge';
import { SECTORS, DEFAULT_ALLOCATION, bestAllocation, evaluateAllocation, getReservoirs, rebalance, type Allocation, type Sector } from '../services/waterService';
import { useToast } from '../state/toast';
import { cn } from '../lib/cn';

export default function Water() {
  const { params } = useApp();
  const toast = useToast();
  const [alloc, setAlloc] = useState<Allocation>(DEFAULT_ALLOCATION);
  const res = useMemo(() => getReservoirs(params), [params]);
  const out = useMemo(() => evaluateAllocation(params, alloc), [params, alloc]);
  const def = useMemo(() => evaluateAllocation(params, DEFAULT_ALLOCATION), [params]);
  const best = useMemo(() => bestAllocation(params), [params]);
  const bestOut = useMemo(() => evaluateAllocation(params, best), [params, best]);
  const isBest = (Object.keys(best) as Sector[]).every((k) => best[k] === alloc[k]);
  const agri = 100 - alloc.domestic;

  const metrics = [
    { k: 'Projected crop loss', v: out.cropLoss, d: out.cropLoss - def.cropLoss, unit: '%', goodLow: true, color: '#FF7A3D' },
    { k: 'Food production', v: out.foodProduction, d: out.foodProduction - def.foodProduction, unit: '%', goodLow: false, color: '#C6F432' },
    { k: 'Water stress', v: out.waterStress, d: out.waterStress - def.waterStress, unit: '', goodLow: true, color: '#7C9CFF' },
    { k: 'Domestic coverage', v: out.domesticCoverage, d: out.domesticCoverage - def.domesticCoverage, unit: '%', goodLow: false, color: '#4FE3F0' },
  ];

  return (
    <div>
      <PageHeader eyebrow="Water intelligence" title="Reservoirs & allocation trade-offs" subtitle="Every litre allocated to one use is a litre denied to another. Test allocations across domestic supply, staple crops and livelihoods before release schedules are fixed." />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Available water" accent="#7C9CFF" icon={<Droplets className="h-3 w-3" />} value={<><AnimatedNumber value={params.water} />%</>} sub="of normal reservoir storage" />
        <Kpi label="Agricultural demand" accent="#C6F432" icon={<Tractor className="h-3 w-3" />} delay={0.05} value={<><AnimatedNumber value={agri} />%</>} sub="of current allocation" />
        <Kpi label="Domestic demand" accent="#4FE3F0" icon={<Home className="h-3 w-3" />} delay={0.1} value={<><AnimatedNumber value={alloc.domestic} />%</>} sub={<>coverage {out.domesticCoverage.toFixed(0)}% of need</>} />
        <Kpi label="Supply gap" accent="#FF4D5E" icon={<Gauge className="h-3 w-3" />} delay={0.15} value={<><AnimatedNumber value={Math.max(0, 100 - params.water / 0.9)} />%</>} sub="vs normal-year requirement" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <Panel eyebrow="Reservoir storage" title="Major reservoirs · % of capacity" delay={0.05}>
          <div className="space-y-3.5">
            {res.map((r, i) => (
              <div key={r.name}>
                <div className="mb-1.5 flex justify-between text-[12.5px]"><span className="text-fog-100">{r.name} <span className="text-fog-500">· {r.basin}</span></span><span className="num font-mono text-fog-300">{r.storage.toFixed(0)}% <span className="text-fog-600">of {r.capacity} TMC</span></span></div>
                <div className="relative h-2.5 overflow-hidden rounded-full bg-white/[0.05]">
                  <motion.div className="h-full rounded-full" style={{ background: r.storage < 35 ? 'linear-gradient(90deg,#FF4D5E88,#FF4D5E)' : r.storage < 60 ? 'linear-gradient(90deg,#F5B83D88,#F5B83D)' : 'linear-gradient(90deg,#4FE3F088,#4FE3F0)' }}
                    initial={{ width: 0 }} animate={{ width: `${r.storage}%` }} transition={{ duration: 0.8, delay: i * 0.05 }} />
                  <div className="absolute inset-y-0 w-px bg-white/30" style={{ left: '60%' }} title="Normal for date" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-fog-600">Marker = typical storage for this date. Prototype values scaled from scenario water availability.</div>
        </Panel>

        <Panel eyebrow="Allocation simulator" title="Drag to reallocate available water" delay={0.1}
          actions={<><button className="btn-subtle h-8 text-[12px]" onClick={() => setAlloc(DEFAULT_ALLOCATION)}><RotateCcw className="h-3.5 w-3.5" />Current release plan</button></>}>
          <div className="mb-5 flex h-9 overflow-hidden rounded-xl border border-white/[0.06]">
            {SECTORS.map((s) => (
              <motion.div key={s.id} layout className="flex items-center justify-center overflow-hidden text-[11px] font-semibold text-ink-950" style={{ background: s.color }} animate={{ width: `${alloc[s.id]}%` }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
                {alloc[s.id] >= 8 && <span className="truncate px-1">{s.label} {alloc[s.id]}%</span>}
              </motion.div>
            ))}
          </div>
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            {SECTORS.map((s) => <Slider key={s.id} label={s.label} value={alloc[s.id]} min={0} max={70} onChange={(v) => setAlloc((a) => rebalance(a, s.id, v))} format={(v) => `${v}%`} accent={s.color} baseline={DEFAULT_ALLOCATION[s.id]} />)}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {metrics.map((m) => {
              const good = m.goodLow ? m.d < -0.5 : m.d > 0.5;
              const bad = m.goodLow ? m.d > 0.5 : m.d < -0.5;
              return (
                <div key={m.k} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="text-[10.5px] uppercase tracking-wider text-fog-500">{m.k}</div>
                  <div className="num mt-1 text-[22px] font-semibold" style={{ color: m.color }}><AnimatedNumber value={m.v} duration={400} />{m.unit}</div>
                  <div className={cn('num font-mono text-[11px]', good ? 'text-mint' : bad ? 'text-ember' : 'text-fog-600')}>{Math.abs(m.d) < 0.5 ? 'baseline' : `${m.d > 0 ? '+' : '−'}${Math.abs(m.d).toFixed(0)} vs plan`}</div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel className="mt-4" eyebrow="Best resilience allocation" title="Recommended release plan" delay={0.15}
        actions={<Badge tone="neutral">Grid search · {`>`}1,000 allocations evaluated</Badge>}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="flex-1">
            <div className="flex h-3 overflow-hidden rounded-full">{SECTORS.map((s) => <div key={s.id} style={{ width: `${best[s.id]}%`, background: s.color }} />)}</div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px]">
              {SECTORS.map((s) => <span key={s.id} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} /><span className="text-fog-400">{s.label}</span><span className="num font-mono text-fog-100">{best[s.id]}%</span>{best[s.id] !== DEFAULT_ALLOCATION[s.id] && <span className={cn('num font-mono text-[11px]', best[s.id] > DEFAULT_ALLOCATION[s.id] ? 'text-mint' : 'text-ember')}>{best[s.id] > DEFAULT_ALLOCATION[s.id] ? '+' : '−'}{Math.abs(best[s.id] - DEFAULT_ALLOCATION[s.id])}</span>}</span>)}
            </div>
            <p className="mt-3 max-w-2xl text-[12.5px] leading-relaxed text-fog-400">
              Secures drinking water first ({bestOut.domesticCoverage.toFixed(0)}% coverage), then shifts marginal water toward millets and vegetables, which produce more food per litre under scarcity. Food production {bestOut.foodProduction > def.foodProduction ? '+' : '−'}{Math.abs(bestOut.foodProduction - def.foodProduction).toFixed(0)} pts and water stress {bestOut.waterStress < def.waterStress ? '−' : '+'}{Math.abs(bestOut.waterStress - def.waterStress).toFixed(0)} pts vs the current release plan.
            </p>
          </div>
          <button className={isBest ? 'btn-ghost' : 'btn-primary'} disabled={isBest} onClick={() => { setAlloc(best); toast({ tone: 'success', title: 'Best resilience allocation applied' }); }}>
            <Wand2 className="h-4 w-4" />{isBest ? 'Applied' : 'Apply recommendation'}
          </button>
        </div>
      </Panel>
    </div>
  );
}

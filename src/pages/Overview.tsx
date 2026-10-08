import { motion } from 'framer-motion';
import { ArrowRight, CloudRain, Thermometer, FlaskConical, Droplets, Wheat, ShieldCheck, AlertOctagon, Package, Activity, ChevronRight } from 'lucide-react';
import { useApp } from '../state/AppState';
import { Panel } from '../components/ui/Panel';
import { Kpi } from '../components/Kpi';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { LevelBadge, levelColor, RiskBadge } from '../components/ui/Badge';
import { ClimateSignalChart } from '../components/ClimateSignalChart';
import { ensoLabel, presetById } from '../data/scenarios';
import { riskColor } from '../lib/risk';
import { fmtSigned, fmtInt } from '../lib/format';
import { signalLevel } from '../services/foodSecurityService';

const waterLevel = (v: number) => (v >= 70 ? 'CRITICAL' : v >= 50 ? 'HIGH' : v >= 25 ? 'MEDIUM' : 'LOW');

export default function Overview() {
  const { params, presetId, summary, food, risks, openDistrict, navigate, simulateDistrict } = useApp();
  const preset = presetById(presetId);
  const top = risks.slice(0, 5);
  const enso = ensoLabel(params.enso);
  const wl = waterLevel(summary.waterStress);

  return (
    <div className="space-y-4">
      {/* HERO */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="panel relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_300px_at_85%_0%,rgba(61,245,138,0.12),transparent_70%)]" />
        <div className="relative grid gap-6 p-6 md:p-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="eyebrow flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="absolute h-full w-full animate-ping rounded-full bg-mint opacity-60" /><span className="relative h-2 w-2 rounded-full bg-mint" /></span>Live climate briefing · Tamil Nadu · {preset.name}</div>
            <h1 className="mt-3 max-w-xl text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-[40px]">
              El Niño is changing the <span className="bg-gradient-to-r from-mint via-lime to-cyan bg-clip-text text-transparent">agricultural risk landscape.</span>
            </h1>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-fog-400">HarvestShield transforms El Niño climate signals into localized agricultural and food-security risk, then simulates the interventions that can reduce the impact before it happens.</p>
            <div className="mt-5 flex flex-wrap items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em]">
              {['Predict', 'Understand', 'Simulate', 'Intervene', 'Protect'].map((s, i) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className={`rounded-md border px-2 py-1 ${i === 2 ? 'border-mint/40 bg-mint/10 text-mint' : 'border-white/10 bg-white/[0.03] text-fog-400'}`}>{s}</span>
                  {i < 4 && <ChevronRight className="h-3 w-3 text-fog-600" />}
                </span>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button className="btn-primary" onClick={() => simulateDistrict(risks[0].district.id)}><FlaskConical className="h-4 w-4" />Simulate {risks[0].district.name}</button>
              <button className="btn-ghost" onClick={() => navigate('risk-map')}>Open risk map <ArrowRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="glass self-center rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="eyebrow">ENSO status · Niño-3.4</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="num text-[56px] font-semibold leading-none tracking-tight text-amber" style={{ textShadow: '0 0 30px rgba(245,184,61,0.35)' }}><AnimatedNumber value={params.enso} decimals={1} /></span>
                  <span className="text-[13px] text-fog-500">°C anomaly</span>
                </div>
              </div>
              <LevelBadge level={enso === 'VERY STRONG' || enso === 'STRONG' ? 'HIGH' : enso === 'MODERATE' ? 'MEDIUM' : 'LOW'} className="!text-[10px]" />
            </div>
            <div className="mt-1 text-[13px] font-semibold tracking-[0.12em] text-fog-100">{enso}{params.enso >= 0.5 ? ' EL NIÑO' : ''}</div>
            {/* strength scale */}
            <div className="relative mt-4 h-2 rounded-full bg-gradient-to-r from-cyan/40 via-mint/40 via-40% to-danger/70">
              <motion.div className="absolute -top-1 h-4 w-1 rounded bg-white shadow-[0_0_10px_white]" animate={{ left: `${((params.enso + 1) / 4) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-fog-600"><span>La Niña</span><span>Neutral</span><span>Moderate</span><span>Strong</span><span>Very strong</span></div>
            <div className="divider my-4" />
            <div className="grid grid-cols-2 gap-3">
              <div><div className="flex items-center gap-1.5 text-[11px] text-fog-500"><CloudRain className="h-3.5 w-3.5 text-cyan" />Rainfall anomaly</div><div className="num mt-1 text-[22px] font-semibold text-cyan"><AnimatedNumber value={params.rainfall} format={(v) => fmtSigned(v, 0, '%')} /></div></div>
              <div><div className="flex items-center gap-1.5 text-[11px] text-fog-500"><Thermometer className="h-3.5 w-3.5 text-ember" />Temperature</div><div className="num mt-1 text-[22px] font-semibold text-ember"><AnimatedNumber value={params.temperature} format={(v) => fmtSigned(v, 1, '°C')} /></div></div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Crop risk" accent={riskColor(summary.cropRisk)} delay={0.05} icon={<Activity className="h-3 w-3" />} info="Monitored-area weighted modelled probability of severe yield loss." onClick={() => navigate('crops')}
          value={<><AnimatedNumber value={summary.cropRisk} /><span className="text-[16px] text-fog-500">%</span></>} sub={<RiskBadge score={summary.cropRisk} />} />
        <Kpi label="Food security risk" accent={levelColor(food.level)} delay={0.1} icon={<Wheat className="h-3 w-3" />} info="Population-weighted food-system exposure index." onClick={() => navigate('food')}
          value={<span style={{ color: levelColor(food.level) }}>{food.level}</span>} sub={<>Index <span className="num text-fog-300">{food.index.toFixed(0)}</span> / 100</>} />
        <Kpi label="Water stress" accent={levelColor(wl)} delay={0.15} icon={<Droplets className="h-3 w-3" />} onClick={() => navigate('water')}
          value={<span style={{ color: levelColor(wl) }}>{wl}</span>} sub={<>Reservoirs at <span className="num text-fog-300">{params.water}%</span> of normal</>} />
        <Kpi label="Preventable risk" accent="#3DF58A" delay={0.2} icon={<ShieldCheck className="h-3 w-3" />} info="Share of current risk the optimiser can avoid with feasible interventions (62% adoption assumed)." onClick={() => navigate('planner')}
          value={<span className="text-mint glow-text"><AnimatedNumber value={summary.preventableRisk} /><span className="text-[16px] text-mint/60">%</span></span>} sub="with modelled interventions" />
        <Kpi label="Critical districts" accent="#FF4D5E" delay={0.25} icon={<AlertOctagon className="h-3 w-3" />} onClick={() => navigate('risk-map')}
          value={<AnimatedNumber value={summary.criticalDistricts} />} sub="risk ≥ 70% threshold" />
        <Kpi label="Output at risk" accent="#F5B83D" delay={0.3} icon={<Package className="h-3 w-3" />} info="Expected shortfall vs. normal season across the pilot monitoring network." onClick={() => navigate('food')}
          value={<><AnimatedNumber value={summary.productionAtRiskT} /><span className="ml-1 text-[14px] text-fog-500">t</span></>} sub={<>across <span className="num">{fmtInt(summary.monitoredHa)}</span> ha monitored</>} />
      </div>

      {/* Causal chain */}
      <Panel eyebrow="Impact chain" title="From climate signal to food security — and where we can intervene" delay={0.1}>
        <ImpactChain />
      </Panel>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" eyebrow="Live climate signal" title="Rainfall, temperature & ENSO anomalies" delay={0.15}
          actions={<button className="btn-subtle h-8 text-[12px]" onClick={() => navigate('climate')}>Climate intelligence <ArrowRight className="h-3.5 w-3.5" /></button>}>
          <ClimateSignalChart />
        </Panel>
        <Panel eyebrow="Top risk regions" title="Where impact concentrates" delay={0.2} bodyClass="px-2 pb-2"
          actions={<button className="btn-subtle h-8 text-[12px]" onClick={() => navigate('risk-map')}>Map <ArrowRight className="h-3.5 w-3.5" /></button>}>
          <ul>
            {top.map((r, i) => (
              <motion.li key={r.district.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.05 }}>
                <button onClick={() => openDistrict(r.district.id)} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.04]">
                  <span className="num w-5 font-mono text-[11px] text-fog-600">{String(i + 1).padStart(2, '0')}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[14px] font-medium">{r.district.name}</div>
                    <div className="truncate text-[11.5px] text-fog-500">{r.cropLabel} · {r.district.driver}</div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.05]"><motion.div className="h-full rounded-full" style={{ background: riskColor(r.score) }} initial={{ width: 0 }} animate={{ width: `${r.score}%` }} transition={{ duration: 0.8, delay: 0.3 + i * 0.05 }} /></div>
                  </div>
                  <div className="text-right">
                    <div className="num text-[20px] font-semibold" style={{ color: riskColor(r.score) }}><AnimatedNumber value={r.score} />%</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-fog-600 transition group-hover:translate-x-0.5 group-hover:text-fog-300" />
                </button>
              </motion.li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function ImpactChain() {
  const { params, summary, food, risks } = useApp();
  const top = risks[0];
  const steps = [
    { k: 'El Niño', v: `${params.enso.toFixed(1)}°C`, s: ensoLabel(params.enso).toLowerCase(), c: '#F5B83D' },
    { k: 'Climate anomaly', v: fmtSigned(params.rainfall, 0, '%'), s: `rain · ${fmtSigned(params.temperature, 1, '°C')}`, c: '#4FE3F0' },
    { k: 'Water stress', v: `${summary.waterStress.toFixed(0)}`, s: 'index / 100', c: '#7C9CFF' },
    { k: 'Crop vulnerability', v: `${top.score.toFixed(0)}%`, s: `${top.district.name} ${top.cropLabel.toLowerCase()}`, c: riskColor(top.score) },
    { k: 'Yield loss', v: `${fmtInt(summary.productionAtRiskT)} t`, s: 'production at risk', c: '#FF7A3D' },
    { k: 'Food-security risk', v: food.level, s: `${food.reserveDays} days reserve`, c: levelColor(food.level) },
    { k: 'Intervention', v: `−${summary.preventableRisk.toFixed(0)}%`, s: 'preventable risk', c: '#3DF58A', cta: true },
  ];
  const { navigate } = useApp();
  return (
    <div className="relative grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {steps.map((s, i) => (
        <motion.div key={s.k} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.07 }}
          className={`relative rounded-xl border p-3 ${s.cta ? 'cursor-pointer border-mint/30 bg-mint/[0.07] hover:bg-mint/[0.12]' : 'border-white/[0.06] bg-white/[0.02]'}`}
          onClick={s.cta ? () => navigate('simulator') : undefined}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-fog-500">{String(i + 1).padStart(2, '0')} · {s.k}</div>
          <div className="num mt-2 text-[19px] font-semibold" style={{ color: s.c }}>{s.v}</div>
          <div className="mt-0.5 truncate text-[11px] text-fog-500">{s.s}</div>
          {i < steps.length - 1 && <ArrowRight className="absolute -right-[11px] top-1/2 z-10 hidden h-3.5 w-3.5 -translate-y-1/2 text-fog-600 lg:block" />}
          {s.cta && <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-mint">Simulate <ArrowRight className="h-3 w-3" /></div>}
        </motion.div>
      ))}
      <div className="col-span-full mt-1 text-[11px] text-fog-600">Signal of {signalLevel(food.index).toLowerCase()} severity propagates from ocean to plate; every step is recomputed when the scenario changes.</div>
    </div>
  );
}

import { motion } from 'framer-motion';
import { Award, Check, FlaskConical, MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Legend } from 'recharts';
import { useApp } from '../state/AppState';
import { PageHeader, Panel } from '../components/ui/Panel';
import { Select } from '../components/ui/Select';
import { FactorBars } from '../components/ui/FactorBars';
import { RiskBadge, Badge } from '../components/ui/Badge';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { compareCrops } from '../services/cropRiskService';
import { DISTRICTS, districtById, primaryCrop } from '../data/districts';
import { CROPS, type CropId } from '../data/crops';
import { riskColor } from '../lib/risk';
import { cn } from '../lib/cn';

const METRICS = [
  { key: 'climateSensitivity', label: 'Climate sensitivity', good: 'low', color: '#F5B83D', fmt: (v: number) => v.toFixed(0) },
  { key: 'waterRequirement', label: 'Water requirement', good: 'low', color: '#7C9CFF', fmt: (v: number) => v.toFixed(0) },
  { key: 'expectedYield', label: 'Expected yield', good: 'high', color: '#C6F432', fmt: (v: number) => `${v.toFixed(1)} t/ha`, max: 5.5 },
  { key: 'risk', label: 'Risk', good: 'low', color: '#FF7A3D', fmt: (v: number) => `${v.toFixed(0)}%` },
  { key: 'resilience', label: 'Resilience', good: 'high', color: '#3DF58A', fmt: (v: number) => v.toFixed(0) },
] as const;

export default function Crops() {
  const { params, sim, simulateDistrict, setSim } = useApp();
  const [districtId, setDistrictId] = useState(sim.districtId);
  const d = districtById(districtId)!;
  const rows = useMemo(() => compareCrops(params, d), [params, d]);
  const current = primaryCrop(d);
  const best = useMemo(() => [...rows].sort((a, b) => b.resilience - a.resilience)[0], [rows]);
  const [selected, setSelected] = useState<CropId | null>(null);
  const sel = rows.find((r) => r.crop === (selected ?? current))!;
  const cur = rows.find((r) => r.crop === current)!;

  const why = useMemo(() => {
    const b = CROPS[best.crop], c = CROPS[current];
    const out: string[] = [];
    if (b.waterNeed < c.waterNeed) out.push(`${Math.round((1 - b.waterNeed / c.waterNeed) * 100)}% lower water dependency than ${c.name.toLowerCase()}`);
    if (b.heatSensitivity < c.heatSensitivity) out.push('Stronger heat tolerance during flowering');
    if (b.rainSensitivity < c.rainSensitivity) out.push('Lower sensitivity to monsoon rainfall deficits');
    if (b.ensoSensitivity < c.ensoSensitivity) out.push('Historically weaker yield response to El Niño years');
    if (out.length === 0) out.push(`Already the most resilient option for ${d.name} under this scenario`);
    return out;
  }, [best, current, d]);

  const radar = METRICS.map((m) => ({
    metric: m.label.replace(' requirement', '').replace('Climate ', ''),
    [cur.name]: m.good === 'low' ? 100 - (cur[m.key] as number) : ((cur[m.key] as number) / ('max' in m ? m.max : 100)) * 100,
    [best.name]: m.good === 'low' ? 100 - (best[m.key] as number) : ((best[m.key] as number) / ('max' in m ? m.max : 100)) * 100,
  }));

  return (
    <div>
      <PageHeader eyebrow="Crop intelligence" title="Which crop holds up under this El Niño?"
        subtitle="Compare climate sensitivity, water demand, yield and risk across crops for a district's specific exposure profile."
        actions={<Select value={districtId} onChange={(v) => { setDistrictId(v); setSelected(null); }} label="District" icon={<MapPin className="h-3.5 w-3.5" />} className="w-[220px]" options={DISTRICTS.map((x) => ({ value: x.id, label: x.name, hint: x.driver }))} />} />

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Panel eyebrow={`${d.name} · ${d.driver}`} title="Crop comparison" bodyClass="pt-3">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[150px_repeat(5,1fr)] gap-3 border-b border-white/[0.06] px-2 pb-2">
                <div className="eyebrow">Crop</div>
                {METRICS.map((m) => <div key={m.key} className="eyebrow">{m.label}<span className="ml-1 normal-case tracking-normal text-fog-600">({m.good === 'low' ? 'lower better' : 'higher better'})</span></div>)}
              </div>
              {rows.map((r, i) => {
                const isSel = (selected ?? current) === r.crop;
                return (
                  <motion.button key={r.crop} onClick={() => setSelected(r.crop)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                    className={cn('grid w-full grid-cols-[150px_repeat(5,1fr)] items-center gap-3 rounded-xl px-2 py-3.5 text-left transition', isSel ? 'bg-white/[0.05] ring-1 ring-white/10' : 'hover:bg-white/[0.03]')}>
                    <div className="flex items-center gap-2.5">
                      <span className="h-8 w-1 rounded-full" style={{ background: CROPS[r.crop].color, boxShadow: `0 0 10px ${CROPS[r.crop].color}` }} />
                      <div><div className="text-[14px] font-semibold uppercase tracking-wide">{r.name}</div>
                        <div className="flex gap-1">{r.crop === current && <span className="text-[10px] text-fog-500">current</span>}{r.crop === best.crop && <span className="text-[10px] text-mint">best</span>}</div></div>
                    </div>
                    {METRICS.map((m) => {
                      const v = r[m.key] as number;
                      const w = Math.max(3, Math.min(100, (v / ('max' in m ? m.max : 100)) * 100));
                      const color = m.key === 'risk' ? riskColor(v) : m.color;
                      return (
                        <div key={m.key}>
                          <div className="num mb-1 font-mono text-[12px] text-fog-100">{m.fmt(v)}</div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                            <motion.div className="h-full rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}66` }} initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ duration: 0.7, delay: 0.1 + i * 0.05 }} />
                          </div>
                        </div>
                      );
                    })}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </Panel>

        <Panel eyebrow="Best crop under current scenario" title={<span className="flex items-center gap-2"><Award className="h-4 w-4 text-mint" />Recommendation</span>}>
          <motion.div key={best.crop + d.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-[34px] font-semibold uppercase tracking-[0.06em] text-mint glow-text">{best.name}</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5"><div className="text-[10px] uppercase tracking-wider text-fog-500">Risk</div><div className="num text-[20px] font-semibold" style={{ color: riskColor(best.risk) }}><AnimatedNumber value={best.risk} />%</div></div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5"><div className="text-[10px] uppercase tracking-wider text-fog-500">Water demand</div><div className="text-[15px] font-semibold text-cyan">{best.waterRequirement < 35 ? 'LOW' : best.waterRequirement < 70 ? 'MEDIUM' : 'HIGH'}</div></div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5"><div className="text-[10px] uppercase tracking-wider text-fog-500">Resilience</div><div className="text-[15px] font-semibold text-mint">{best.resilience > 65 ? 'HIGH' : best.resilience > 40 ? 'MEDIUM' : 'LOW'}</div></div>
            </div>
            <div className="eyebrow mb-2 mt-5">Why?</div>
            <ul className="space-y-2">{why.map((w) => <li key={w} className="flex gap-2 text-[13px] text-fog-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />{w}</li>)}</ul>
            <div className="mt-4 rounded-lg border border-white/[0.06] bg-black/20 p-3 text-[12px] text-fog-400">
              vs. <span className="text-fog-100">{cur.name}</span> today: risk <span className="num font-mono text-mint">−{Math.max(0, cur.risk - best.risk).toFixed(0)} pts</span>, yield {best.expectedYield < cur.expectedYield ? <span className="text-ember">lower ({best.expectedYield.toFixed(1)} vs {cur.expectedYield.toFixed(1)} t/ha)</span> : 'comparable'} — a full switch trades output for stability, so the Scenario Lab tests partial diversification.
            </div>
            <button className="btn-primary mt-4 w-full" onClick={() => { simulateDistrict(d.id); setSim({ interventions: best.crop === current ? [] : ['diversify'], diversifyShare: 0.3 }); }}><FlaskConical className="h-4 w-4" />Test 30% diversification in Scenario Lab</button>
          </motion.div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel eyebrow="Explainable risk" title={<span className="flex items-center gap-2">Risk contributors · {sel.name} <RiskBadge score={sel.risk} /></span>} delay={0.1}
          actions={<Badge tone="neutral">Total {sel.risk.toFixed(0)}%</Badge>}>
          <FactorBars factors={sel.factors} max={32} />
          <p className="mt-4 text-[11.5px] text-fog-600">Click any crop row to inspect its contributors. Values are additive risk points from the prototype heuristic.</p>
        </Panel>
        <Panel eyebrow="Profile" title={`${cur.name} vs ${best.name}`} delay={0.15}>
          <div className="h-[280px]">
            <ResponsiveContainer>
              <RadarChart data={radar} outerRadius="72%">
                <PolarGrid stroke="rgba(160,255,200,0.1)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#7E978A', fontSize: 11 }} />
                <Radar name={cur.name} dataKey={cur.name} stroke="#FF7A3D" fill="#FF7A3D" fillOpacity={0.15} strokeWidth={2} />
                {best.crop !== cur.crop && <Radar name={best.name} dataKey={best.name} stroke="#3DF58A" fill="#3DF58A" fillOpacity={0.18} strokeWidth={2} />}
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-[11px] text-fog-600">Outward = better (sensitivity, water and risk inverted).</p>
        </Panel>
      </div>
    </div>
  );
}

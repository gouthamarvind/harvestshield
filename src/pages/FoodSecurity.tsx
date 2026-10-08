import { motion } from 'framer-motion';
import { Package, Percent, CalendarClock, Users, Plus, Check, Radio } from 'lucide-react';
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../state/AppState';
import { PageHeader, Panel } from '../components/ui/Panel';
import { Kpi } from '../components/Kpi';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { Badge, LevelBadge, levelColor } from '../components/ui/Badge';
import { Sankey, type SLink, type SNode } from '../components/Sankey';
import { ChartTooltip } from '../components/ui/ChartTooltip';
import { CROPS, CROP_IDS, type CropId } from '../data/crops';
import { cropRisk } from '../model/risk';
import { localize } from '../model/localize';
import { NORMAL } from '../model/plan';
import { fmtInt } from '../lib/format';
import { useToast } from '../state/toast';
import type { InterventionId } from '../services/interventionService';

export default function FoodSecurity() {
  const { food, risks, params, plan, togglePlan, navigate } = useApp();
  const toast = useToast();

  const { nodes, links, byCrop } = useMemo(() => {
    const climate: Record<string, number> = { rain: 0, water: 0, heat: 0, enso: 0 };
    const cropLoss: Record<CropId, number> = { rice: 0, maize: 0, millet: 0, groundnut: 0, sorghum: 0 };
    const cropNormal: Record<CropId, number> = { rice: 0, maize: 0, millet: 0, groundnut: 0, sorghum: 0 };
    const cl: Record<string, number> = {};
    for (const r of risks) for (const c of CROP_IDS) {
      const share = r.district.mix[c];
      if (share <= 0) continue;
      const L = localize(params, r.district); const now = cropRisk(L.p, c, L.exp), nor = cropRisk(NORMAL, c, L.exp);
      const ha = r.district.monitoredHa * share;
      const loss = Math.max(0, ha * (nor.yieldTHa - now.yieldTHa));
      cropLoss[c] += loss; cropNormal[c] += ha * nor.yieldTHa;
      const tot = now.factors.reduce((s, f) => s + f.value, 0) || 1;
      for (const f of now.factors) {
        const k = f.key === 'rainfall' ? 'rain' : f.key === 'water' ? 'water' : f.key === 'temperature' ? 'heat' : 'enso';
        const v = loss * (f.value / tot);
        climate[k] += v;
        const key = `${k}|${c === 'rice' || c === 'maize' ? c : 'other'}`;
        cl[key] = (cl[key] ?? 0) + v;
      }
    }
    const nodes: SNode[] = [
      { id: 'rain', label: 'Rainfall deficit', col: 0, color: '#4FE3F0' }, { id: 'water', label: 'Water shortfall', col: 0, color: '#7C9CFF' },
      { id: 'heat', label: 'Heat stress', col: 0, color: '#FF7A3D' }, { id: 'enso', label: 'ENSO & exposure', col: 0, color: '#F5B83D' },
      { id: 'rice', label: 'Rice loss', col: 1, color: CROPS.rice.color }, { id: 'maize', label: 'Maize loss', col: 1, color: CROPS.maize.color }, { id: 'other', label: 'Millet / pulses / oilseed', col: 1, color: '#3DF58A' },
      { id: 'staple', label: 'Staple supply gap', col: 2, color: '#FF4D5E' }, { id: 'market', label: 'Feed & market supply', col: 2, color: '#F5B83D' },
      { id: 'hv', label: 'High-vulnerability HH', col: 3, color: '#FF4D5E' }, { id: 'mv', label: 'Moderate exposure', col: 3, color: '#F5B83D' }, { id: 'pds', label: 'Buffered by PDS', col: 3, color: '#3DF58A' },
    ];
    const links: SLink[] = Object.entries(cl).map(([k, v]) => { const [s, t] = k.split('|'); return { source: s, target: t, value: v }; });
    const other = cropLoss.millet + cropLoss.groundnut + cropLoss.sorghum;
    const st = { rice: cropLoss.rice * 0.85, maize: cropLoss.maize * 0.2, other: other * 0.6 };
    links.push({ source: 'rice', target: 'staple', value: st.rice }, { source: 'rice', target: 'market', value: cropLoss.rice - st.rice },
      { source: 'maize', target: 'staple', value: st.maize }, { source: 'maize', target: 'market', value: cropLoss.maize - st.maize },
      { source: 'other', target: 'staple', value: st.other }, { source: 'other', target: 'market', value: other - st.other });
    const staple = st.rice + st.maize + st.other, market = cropLoss.rice + cropLoss.maize + other - staple;
    const hvShare = Math.min(0.5, 0.15 + food.index / 200);
    links.push({ source: 'staple', target: 'hv', value: staple * hvShare }, { source: 'staple', target: 'mv', value: staple * 0.3 }, { source: 'staple', target: 'pds', value: staple * (0.7 - hvShare) },
      { source: 'market', target: 'mv', value: market * 0.4 }, { source: 'market', target: 'pds', value: market * 0.6 });
    const byCrop = CROP_IDS.map((c) => ({ crop: CROPS[c].name, normal: Math.round(cropNormal[c]), expected: Math.round(cropNormal[c] - cropLoss[c]), color: CROPS[c].color }));
    return { nodes, links, byCrop };
  }, [risks, params, food.index]);

  const actions: { id: InterventionId; label: string; why: string }[] = [
    { id: 'reserves', label: 'Pre-position reserves', why: `Extend reserve coverage beyond ${food.reserveDays} days in exposed blocks` },
    { id: 'diversify', label: 'Diversify crops', why: 'Lower staple loss exposure in rice-heavy districts' },
    { id: 'protect', label: 'Prioritize irrigation', why: 'Protect water for critical crop stages' },
  ];
  const message = food.level === 'LOW' ? 'Production outlook is within the normal range; local food systems are adequately buffered.'
    : `Projected rice production decline may increase local food-system vulnerability if conditions persist. ${risks.slice(0, 3).map((r) => r.district.name).join(', ')} carry the highest exposure.`;

  return (
    <div>
      <PageHeader eyebrow="SDG 2 · Zero Hunger" title="Food Security" subtitle="How climate-driven crop loss propagates into food supply and household exposure — and which early actions keep it from becoming a crisis."
        actions={<Badge tone="neutral">SDG 2 · Target 2.4 resilient agriculture</Badge>} />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Potential production loss" accent="#FF7A3D" icon={<Package className="h-3 w-3" />} value={<><AnimatedNumber value={food.productionLossT} /><span className="ml-1 text-[14px] text-fog-500">t</span></>} sub="modelled area, vs normal season" />
        <Kpi label="Food supply exposure" accent="#F5B83D" icon={<Percent className="h-3 w-3" />} delay={0.05} value={<><AnimatedNumber value={food.supplyExposurePct} decimals={1} /><span className="text-[16px] text-fog-500">%</span></>} sub="of local staple supply" />
        <Kpi label="Reserve coverage" accent={food.reserveDays < 30 ? '#FF7A3D' : '#3DF58A'} icon={<CalendarClock className="h-3 w-3" />} delay={0.1} value={<><AnimatedNumber value={food.reserveDays} /><span className="ml-1 text-[14px] text-fog-500">days</span></>} sub="PDS buffer in exposed districts" />
        <Kpi label="Vulnerable population" accent="#FF4D5E" icon={<Users className="h-3 w-3" />} delay={0.15} value={<>~<AnimatedNumber value={Math.round(food.vulnerablePopulation / 1000) * 1000} /></>} sub="people in high-exposure households" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_380px]">
        <Panel eyebrow="Impact propagation" title="Climate → crop loss → food supply → population exposure" delay={0.1}>
          <Sankey nodes={nodes} links={links} columns={['Climate', 'Crop loss', 'Food supply', 'Population']} height={400} format={(v) => `${fmtInt(v)}t`} />
          <p className="mt-2 text-[11.5px] text-fog-600">Band width ∝ tonnes of production at risk. Hover nodes to isolate a pathway.</p>
        </Panel>
        <Panel eyebrow="Early food-security signal" title={<span className="flex items-center gap-2"><Radio className="h-4 w-4" style={{ color: levelColor(food.level) }} />Signal</span>} delay={0.15}>
          <div className="flex items-center gap-3">
            <motion.div key={food.level} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-[38px] font-semibold tracking-tight" style={{ color: levelColor(food.level), textShadow: `0 0 30px ${levelColor(food.level)}55` }}>{food.level}</motion.div>
            <LevelBadge level={food.level} />
          </div>
          <div className="mt-2 flex h-1.5 gap-1">{['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((l, i) => <div key={l} className="flex-1 rounded-full" style={{ background: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].indexOf(food.level) >= i ? levelColor(l) : 'rgba(255,255,255,0.06)' }} />)}</div>
          <p className="mt-4 text-[13px] leading-relaxed text-fog-300">“{message}”</p>
          <div className="eyebrow mb-2 mt-5">Recommended actions</div>
          <div className="space-y-2">
            {actions.map((a) => {
              const added = plan.includes(a.id);
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="min-w-0 flex-1"><div className="text-[13px] font-medium">{a.label}</div><div className="text-[11.5px] text-fog-500">{a.why}</div></div>
                  <button className={added ? 'btn-ghost h-8 px-2.5 text-[12px]' : 'btn-subtle h-8 border border-mint/25 px-2.5 text-[12px] text-mint'} onClick={() => { togglePlan(a.id); if (!added) toast({ tone: 'success', title: `${a.label} added to response plan` }); }}>
                    {added ? <><Check className="h-3.5 w-3.5" />Added</> : <><Plus className="h-3.5 w-3.5" />Plan</>}
                  </button>
                </div>
              );
            })}
          </div>
          <button className="btn-ghost mt-3 w-full" onClick={() => navigate('planner')}>Open Intervention Planner</button>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel eyebrow="Expected crop production" title="Normal season vs current scenario (modelled area, t)" delay={0.2}>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <BarChart data={byCrop} margin={{ top: 8, right: 8, left: -10, bottom: 0 }} barGap={4}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="crop" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip unit={{ normal: ' t', expected: ' t' }} digits={0} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="normal" name="Normal season" fill="rgba(160,255,200,0.14)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expected" name="Current scenario" radius={[4, 4, 0, 0]}>{byCrop.map((d) => <Cell key={d.crop} fill={d.color} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel eyebrow="Supply–demand balance" title="Local staple supply vs demand (demand = 100)" delay={0.25}>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <BarChart data={food.supplyDemand} layout="vertical" margin={{ top: 4, right: 16, left: 30, bottom: 0 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" domain={[50, 115]} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="district" tickLine={false} axisLine={false} width={90} />
                <ReferenceLine x={100} stroke="#E8F3EC" strokeOpacity={0.4} strokeDasharray="3 3" label={{ value: 'Demand', fill: '#7E978A', fontSize: 10, position: 'top' }} />
                <Tooltip content={<ChartTooltip unit={{ supply: '' }} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="supply" name="Supply index" radius={[0, 4, 4, 0]} barSize={14}>{food.supplyDemand.map((d) => <Cell key={d.district} fill={d.supply < 90 ? '#FF4D5E' : d.supply < 100 ? '#F5B83D' : '#3DF58A'} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}

import { motion } from 'framer-motion';
import { Layers, Search, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../state/AppState';
import { PageHeader, Panel } from '../components/ui/Panel';
import { TamilNaduMap, MapLegend, type MapPalette } from '../components/map/TamilNaduMap';
import { RiskBadge } from '../components/ui/Badge';
import { Switch } from '../components/ui/Switch';
import type { DistrictRisk } from '../services/cropRiskService';
import { riskColor } from '../lib/risk';
import { fmtSigned } from '../lib/format';
import { cn } from '../lib/cn';

type LayerId = 'crop' | 'water' | 'food' | 'rain' | 'temp' | 'pop';
const LAYERS: { id: LayerId; label: string; palette: MapPalette; get: (r: DistrictRisk) => number; fmt: (r: DistrictRisk) => string }[] = [
  { id: 'crop', label: 'Crop risk', palette: 'risk', get: (r) => r.score, fmt: (r) => `${r.score.toFixed(0)}%` },
  { id: 'water', label: 'Water stress', palette: 'water', get: (r) => r.waterStress, fmt: (r) => `${r.waterStress.toFixed(0)} / 100` },
  { id: 'food', label: 'Food security', palette: 'food', get: (r) => r.foodExposure, fmt: (r) => `${r.foodExposure.toFixed(0)} / 100` },
  { id: 'rain', label: 'Rainfall anomaly', palette: 'rain', get: (r) => Math.min(100, Math.max(0, -r.rainfallAnomaly * 2.6)), fmt: (r) => fmtSigned(r.rainfallAnomaly, 0, '%') },
  { id: 'temp', label: 'Temperature', palette: 'heat', get: (r) => Math.min(100, r.temperatureAnomaly * 38), fmt: (r) => fmtSigned(r.temperatureAnomaly, 1, '°C') },
  { id: 'pop', label: 'Population vulnerability', palette: 'pop', get: (r) => r.populationVulnerability, fmt: (r) => `${r.populationVulnerability.toFixed(0)} / 100` },
];

export default function RiskMap() {
  const { risks, openDistrict, drawerDistrict } = useApp();
  const [on, setOn] = useState<Record<LayerId, boolean>>({ crop: true, water: true, food: false, rain: false, temp: false, pop: false });
  const [q, setQ] = useState('');
  const active = LAYERS.filter((l) => on[l.id]);
  const palette: MapPalette = active.length === 1 ? active[0].palette : 'risk';
  const values = useMemo(() => Object.fromEntries(risks.map((r) => [r.district.id, active.length ? active.reduce((s, l) => s + l.get(r), 0) / active.length : 0])), [risks, active]);
  const byId = useMemo(() => Object.fromEntries(risks.map((r) => [r.district.id, r])), [risks]);
  const ranked = useMemo(() => [...risks].sort((a, b) => values[b.district.id] - values[a.district.id]).filter((r) => r.district.name.toLowerCase().includes(q.toLowerCase())), [risks, values, q]);
  const crit = risks.filter((r) => r.score >= 70).map((r) => r.district.id);

  return (
    <div>
      <PageHeader eyebrow="Spatial intelligence" title="Risk Map" subtitle="District-level exposure across Tamil Nadu. Combine layers to build a composite hazard view; click any district to drill down and simulate." />
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Panel className="relative overflow-hidden" bodyClass="p-0">
          <div className="relative h-[620px] md:h-[720px]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_400px_at_60%_50%,rgba(61,245,138,0.06),transparent)]" />
            <TamilNaduMap values={values} palette={palette} selectedId={drawerDistrict} onSelect={openDistrict} pulseIds={crit} labelIds={risks.slice(0, 4).map((r) => r.district.id)}
              tooltip={(id) => {
                const r = byId[id];
                return (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3"><span className="text-[13px] font-semibold text-fog-100">{r.district.name}</span><RiskBadge score={r.score} /></div>
                    {(active.length ? active : LAYERS.slice(0, 1)).map((l) => <div key={l.id} className="flex justify-between gap-4 py-0.5 text-fog-400"><span>{l.label}</span><span className="num font-mono text-fog-100">{l.fmt(r)}</span></div>)}
                    <div className="mt-1.5 border-t border-white/[0.06] pt-1.5 text-[11px] text-fog-500">{r.cropLabel} · click to open</div>
                  </div>
                );
              }} />
            {/* Layer control */}
            <div className="glass absolute left-4 top-4 w-[230px] rounded-xl p-3">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold"><Layers className="h-3.5 w-3.5 text-mint" />Layers</div>
              <div className="space-y-1.5">
                {LAYERS.map((l) => (
                  <label key={l.id} className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-1 py-0.5 text-[12.5px] text-fog-300 hover:text-fog-100">
                    {l.label}
                    <Switch checked={on[l.id]} onChange={(v) => setOn((s) => ({ ...s, [l.id]: v }))} label={l.label} />
                  </label>
                ))}
              </div>
            </div>
            <div className="glass absolute bottom-4 left-4 rounded-xl p-3">
              <MapLegend palette={palette} label={active.length > 1 ? `Composite of ${active.length} layers` : active[0]?.label ?? 'No layer selected'} />
              <div className="mt-2 flex items-center gap-2 text-[10.5px] text-fog-500"><span className="relative h-2.5 w-2.5"><span className="absolute inset-0 rounded-full border border-danger" /><span className="absolute inset-[3px] rounded-full bg-danger" /></span>Critical (crop risk ≥ 70%)</div>
            </div>
            {active.length === 0 && <div className="absolute inset-0 grid place-items-center"><div className="glass rounded-xl px-5 py-4 text-center text-[13px] text-fog-400">Enable at least one layer to colour the map.</div></div>}
          </div>
        </Panel>
        <Panel eyebrow={active.length > 1 ? 'Composite ranking' : `${active[0]?.label ?? 'Crop risk'} ranking`} title="Districts" bodyClass="px-2 pb-2 pt-3">
          <div className="relative mx-3 mb-2">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fog-600" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter districts" className="h-8 w-full rounded-lg border border-white/[0.07] bg-white/[0.03] pl-8 pr-2 text-[12.5px] placeholder:text-fog-600 focus:border-mint/40 focus:outline-none" />
          </div>
          <div className="max-h-[640px] overflow-y-auto">
            {ranked.length === 0 && <div className="px-4 py-8 text-center text-[12px] text-fog-500">No districts match “{q}”.</div>}
            {ranked.map((r, i) => (
              <motion.button layout key={r.district.id} onClick={() => openDistrict(r.district.id)}
                className={cn('group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white/[0.04]', drawerDistrict === r.district.id && 'bg-mint/[0.07]')}>
                <span className="num w-5 font-mono text-[10.5px] text-fog-600">{i + 1}</span>
                <span className="h-2 w-2 rounded-full" style={{ background: riskColor(r.score), boxShadow: `0 0 6px ${riskColor(r.score)}` }} />
                <span className="min-w-0 flex-1"><span className="block truncate text-[13px]">{r.district.name}</span><span className="block truncate text-[10.5px] text-fog-600">{r.cropLabel}</span></span>
                <span className="num font-mono text-[12.5px] text-fog-300">{values[r.district.id].toFixed(0)}</span>
                <ChevronRight className="h-3.5 w-3.5 text-fog-600 group-hover:text-fog-400" />
              </motion.button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

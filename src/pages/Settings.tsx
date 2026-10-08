import { Database, Cpu, Bell, MapPin, Languages, Ruler, Palette, FlaskConical, CheckCircle2, CircleDashed } from 'lucide-react';
import { useState } from 'react';
import { useApp, type Lang } from '../state/AppState';
import { PageHeader, Panel } from '../components/ui/Panel';
import { Switch } from '../components/ui/Switch';
import { Slider } from '../components/ui/Slider';
import { Segmented } from '../components/ui/Segmented';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../state/toast';
import { DATA_NOTE, DATA_NOTE_TITLE } from '../lib/dataNote';
import { ONI, ONI_LABEL, WEATHER } from '../data/observed';

const SOURCES = [
  { n: 'NOAA CPC · Oceanic Niño Index', s: 'Active', d: `Monthly ENSO observations · latest ${ONI_LABEL} (${ONI.latest.value.toFixed(2)}°C) · as of ${ONI.asOf}` },
  { n: 'NASA POWER · daily rainfall & temperature', s: WEATHER ? 'Active' : 'Not fetched', d: WEATHER ? `37 district points · ${WEATHER.windowStart} → ${WEATHER.windowEnd} vs 2001–2020 normals` : 'Run `npm run fetch:climate` to load district weather' },
  { n: 'IMD gridded rainfall (0.25°)', s: 'Planned', d: 'Official Indian rainfall product' },
  { n: 'TN WRD reservoir bulletins', s: 'Planned', d: 'Storage levels' },
  { n: 'DES district crop statistics', s: 'Planned', d: 'Area, production, yield history' },
  { n: 'Illustrative seed data', s: 'Active', d: 'Crop mix, reservoirs, population, what-if scenarios' },
];

export default function Settings() {
  const { lang, setLang } = useApp();
  const toast = useToast();
  const [th, setTh] = useState({ crop: 70, water: 60, food: 48 });
  const [notify, setNotify] = useState({ email: true, sms: false, digest: true });
  const [units, setUnits] = useState<'metric' | 'local'>('metric');
  return (
    <div>
      <PageHeader eyebrow="System" title="Settings" subtitle="Configure data sources, model behaviour, thresholds and workspace preferences."
        actions={<Badge tone="amber" dot>Prototype mode</Badge>} />
      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber/25 bg-amber/[0.06] p-4">
        <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-amber" />
        <div><div className="text-[14px] font-semibold text-amber">{DATA_NOTE_TITLE}</div><div className="mt-0.5 text-[12.5px] leading-relaxed text-fog-400">{DATA_NOTE}</div></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel eyebrow={<span className="flex items-center gap-1.5"><Database className="h-3 w-3" />Data sources</span>} title="Connectors">
          <ul className="divide-y divide-white/[0.05]">
            {SOURCES.map((s) => (
              <li key={s.n} className="flex items-center gap-3 py-2.5">
                {s.s === 'Active' ? <CheckCircle2 className="h-4 w-4 text-mint" /> : <CircleDashed className="h-4 w-4 text-fog-600" />}
                <div className="min-w-0 flex-1"><div className="truncate text-[13px]">{s.n}</div><div className="text-[11px] text-fog-500">{s.d}</div></div>
                <Badge tone={s.s === 'Active' ? 'mint' : 'neutral'}>{s.s}</Badge>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel eyebrow={<span className="flex items-center gap-1.5"><Cpu className="h-3 w-3" />Model configuration</span>} title="Risk engine">
          <div className="space-y-3 text-[13px]">
            {[['Risk model', 'Heuristic v0.3 (transparent, additive)'], ['Optimiser', 'Exhaustive search · ≤4 levers · ≥50% staple retained'], ['Adoption assumption', '62% within season'], ['Yield-loss ceiling', '45% at risk = 100'], ['Spatial unit', 'District (37) · modelled area 18,770 ha']].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-white/[0.04] pb-2.5"><span className="text-fog-500">{k}</span><span className="text-right text-fog-100">{v}</span></div>
            ))}
            <div className="text-[11.5px] text-fog-600">Production path: replace with calibrated crop models (e.g. DSSAT/APSIM emulators) validated against historical district yields.</div>
          </div>
        </Panel>
        <Panel eyebrow={<span className="flex items-center gap-1.5"><Bell className="h-3 w-3" />Alert thresholds</span>} title="When should we alert?">
          <div className="space-y-5">
            <Slider label="Crop risk threshold" value={th.crop} min={40} max={90} onChange={(v) => setTh((t) => ({ ...t, crop: v }))} format={(v) => `${v}%`} accent="#FF4D5E" />
            <Slider label="Water stress threshold" value={th.water} min={30} max={90} onChange={(v) => setTh((t) => ({ ...t, water: v }))} format={(v) => `${v}`} accent="#7C9CFF" />
            <Slider label="Food-security index threshold" value={th.food} min={20} max={80} onChange={(v) => setTh((t) => ({ ...t, food: v }))} format={(v) => `${v}`} accent="#F5B83D" />
            <div className="space-y-2.5 border-t border-white/[0.05] pt-4">
              {([['email', 'Email alerts'], ['sms', 'SMS for high priority'], ['digest', 'Daily digest']] as const).map(([k, l]) => (
                <div key={k} className="flex items-center justify-between text-[13px]"><span className="text-fog-300">{l}</span><Switch checked={notify[k]} onChange={(v) => setNotify((n) => ({ ...n, [k]: v }))} label={l} /></div>
              ))}
            </div>
            <button className="btn-primary" onClick={() => toast({ tone: 'success', title: 'Thresholds saved', body: 'Stored for this session (prototype).' })}>Save thresholds</button>
          </div>
        </Panel>
        <Panel eyebrow="Workspace" title="Preferences">
          <div className="space-y-4 text-[13px]">
            <Row icon={<MapPin className="h-4 w-4" />} label="Region"><span className="text-fog-100">Tamil Nadu · 37 districts</span></Row>
            <Row icon={<Languages className="h-4 w-4" />} label="Language"><Segmented<Lang> value={lang} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'ta', label: <span className="tamil">தமிழ்</span> }]} /></Row>
            <Row icon={<Ruler className="h-4 w-4" />} label="Units"><Segmented value={units} onChange={setUnits} options={[{ value: 'metric', label: 'Hectares · tonnes' }, { value: 'local', label: 'Acres · quintals' }]} /></Row>
            <Row icon={<Palette className="h-4 w-4" />} label="Theme"><Segmented value="dark" onChange={() => toast({ tone: 'info', title: 'Light theme is on the roadmap' })} options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} /></Row>
            <div className="text-[11.5px] text-fog-600">Language applies to the farmer-facing view. Unit conversion applies in a later release.</div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.04] pb-3"><span className="flex items-center gap-2 text-fog-400">{icon}{label}</span>{children}</div>;
}

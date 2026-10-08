import { useMemo, useState } from 'react';
import { Area, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useApp } from '../state/AppState';
import { getClimateSeries, sliceSeries } from '../services/climateService';
import { ChartTooltip } from './ui/ChartTooltip';
import { cn } from '../lib/cn';

const LAYERS = [
  { key: 'rainfall', name: 'Rainfall anomaly', color: '#4FE3F0', unit: '%' },
  { key: 'temperature', name: 'Temperature anomaly', color: '#FF7A3D', unit: '°C' },
  { key: 'enso', name: 'ENSO index', color: '#F5B83D', unit: '°C' },
] as const;
type LayerKey = (typeof LAYERS)[number]['key'];

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
const fmtDay = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function ClimateSignalChart({ height = 280 }: { height?: number }) {
  const { params, timeRange } = useApp();
  const [on, setOn] = useState<Record<LayerKey, boolean>>({ rainfall: true, temperature: true, enso: true });
  const data = useMemo(() => sliceSeries(getClimateSeries(params), timeRange), [params, timeRange]);
  const today = data.find((d) => d.t === 0)?.date;
  const last = data[data.length - 1]?.date;
  const short = timeRange === '30d' || timeRange === '90d';
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {LAYERS.map((l) => (
          <button key={l.key} onClick={() => setOn((s) => ({ ...s, [l.key]: !s[l.key] }))} aria-pressed={on[l.key]}
            className={cn('flex items-center gap-2 rounded-md border px-2.5 py-1 text-[11.5px] font-medium transition', on[l.key] ? 'border-white/12 bg-white/[0.05] text-fog-100' : 'border-white/[0.05] text-fog-600 line-through')}>
            <span className="h-2 w-2 rounded-full" style={{ background: on[l.key] ? l.color : '#3F5449', boxShadow: on[l.key] ? `0 0 8px ${l.color}` : 'none' }} />{l.name}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-fog-500"><span className="h-2.5 w-4 rounded-sm border border-dashed border-white/20 bg-white/[0.04]" />Forecast</span>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="rainFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4FE3F0" stopOpacity={0.05} /><stop offset="1" stopColor="#4FE3F0" stopOpacity={0.3} /></linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickFormatter={short ? (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : fmtDate} tickLine={false} axisLine={false} minTickGap={40} />
            <YAxis yAxisId="l" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={['auto', 'auto']} />
            <YAxis yAxisId="r" orientation="right" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}°`} domain={[-1, 3]} width={34} />
            {today && last && <ReferenceArea yAxisId="l" x1={today} x2={last} fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />}
            {today && <ReferenceLine yAxisId="l" x={today} stroke="#3DF58A" strokeOpacity={0.6} strokeDasharray="2 3" label={{ value: 'TODAY', position: 'insideTopLeft', fill: '#3DF58A', fontSize: 10 }} />}
            <ReferenceLine yAxisId="l" y={0} stroke="rgba(255,255,255,0.12)" />
            <Tooltip content={<ChartTooltip unit={{ rainfall: '%', temperature: '°C', enso: '°C' }} labelFormat={fmtDay} />} cursor={{ stroke: 'rgba(255,255,255,0.15)' }} />
            {on.rainfall && <Area yAxisId="l" type="monotone" dataKey="rainfall" name="Rainfall anomaly" stroke="#4FE3F0" strokeWidth={1.6} fill="url(#rainFill)" baseValue={0} dot={false} isAnimationActive animationDuration={700} />}
            {on.temperature && <Line yAxisId="r" type="monotone" dataKey="temperature" name="Temperature anomaly" stroke="#FF7A3D" strokeWidth={1.8} dot={false} animationDuration={700} />}
            {on.enso && <Line yAxisId="r" type="monotone" dataKey="enso" name="ENSO index" stroke="#F5B83D" strokeWidth={2.2} dot={false} animationDuration={700} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

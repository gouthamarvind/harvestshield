import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, CartesianGrid, ComposedChart, ErrorBar, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { useApp } from '../state/AppState';
import { PageHeader, Panel } from '../components/ui/Panel';
import { ChartTooltip } from '../components/ui/ChartTooltip';
import { ClimateSignalChart } from '../components/ClimateSignalChart';
import { TamilNaduMap, MapLegend } from '../components/map/TamilNaduMap';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { Badge } from '../components/ui/Badge';
import { ANALOGS, ANALOG_MONTHS, NOW_INDEX, CURRENT_YEAR, analogSimilarity, currentTrajectory, getOutlook } from '../services/climateService';
import { ONI, ONI_LABEL, WEATHER, WEATHER_WINDOW_LABEL } from '../data/observed';
import { ensoLabel } from '../data/scenarios';
import { fmtSigned } from '../lib/format';
import { useCountUp } from '../lib/useCountUp';
import { cn } from '../lib/cn';

const ANALOG_COLORS: Record<string, string> = { '1997': '#A78BFA', '2009': '#7C9CFF', '2015': '#FF7A3D', '2023': '#4FE3F0' };

export default function Climate() {
  const { params, risks, presetId } = useApp();
  const sims = useMemo(() => analogSimilarity(params), [params]);
  const [shown, setShown] = useState<Record<string, boolean>>({ '1997': true, '2009': false, '2015': true, '2023': true });
  const cur = currentTrajectory();
  const histData = ANALOG_MONTHS.map((m, i) => ({ m, current: cur[i], ...Object.fromEntries(ANALOGS.map((a) => [a.id, a.oni[i]])) }));
  const outlook = useMemo(() => getOutlook(params).map((o) => ({ ...o, rainErr: [o.rainfall - o.rainLo, o.rainHi - o.rainfall] })), [params]);
  const rainValues = Object.fromEntries(risks.map((r) => [r.district.id, Math.max(0, Math.min(100, -r.rainfallAnomaly * 2.6))]));

  return (
    <div>
      <PageHeader eyebrow="Climate intelligence" title="ENSO & regional climate signal" subtitle={`Real El Niño observations from NOAA (latest: ${ONI_LABEL}, ONI ${ONI.latest.value >= 0 ? '+' : ''}${ONI.latest.value.toFixed(2)}°C)${WEATHER ? ` and NASA POWER district weather for ${WEATHER_WINDOW_LABEL}` : ''}, compared with past El Niño years.`} />
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Panel eyebrow={presetId === 'observed' ? `El Niño strength · NOAA ${ONI_LABEL}` : 'El Niño strength · scenario value'} title="Niño-3.4 anomaly (ONI)">
          <EnsoGauge value={params.enso} />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[['Rainfall', fmtSigned(params.rainfall, 0, '%'), '#4FE3F0'], ['Temp.', fmtSigned(params.temperature, 1, '°'), '#FF7A3D'], ['Storage', `${params.water}%`, '#7C9CFF']].map(([k, v, c]) => (
              <div key={k} className="rounded-lg border border-white/[0.06] bg-white/[0.02] py-2"><div className="text-[10.5px] text-fog-500">{k}</div><div className="num font-mono text-[15px] font-semibold" style={{ color: c }}>{v}</div></div>
            ))}
          </div>
        </Panel>
        <Panel eyebrow="Analog years" title={<>{CURRENT_YEAR} so far is most similar to <span className="text-mint">{sims[0].analog.label}</span></>}
          actions={<span className="text-[11px] text-fog-500">Similarity of observed ONI, {ANALOG_MONTHS[0]}–{ANALOG_MONTHS[NOW_INDEX]}</span>}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {sims.map((s, i) => (
              <motion.button key={s.analog.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                onClick={() => setShown((x) => ({ ...x, [s.analog.id]: !x[s.analog.id] }))} aria-pressed={shown[s.analog.id]}
                className={cn('rounded-xl border p-3.5 text-left transition', i === 0 ? 'border-mint/30 bg-mint/[0.06]' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15')}>
                <div className="flex items-center justify-between"><span className="text-[15px] font-semibold">{s.analog.label}</span>{i === 0 ? <Badge tone="mint">Best match</Badge> : <span className="h-2 w-2 rounded-full" style={{ background: ANALOG_COLORS[s.analog.id] }} />}</div>
                <div className="num mt-2 text-[26px] font-semibold" style={{ color: i === 0 ? '#3DF58A' : '#E8F3EC' }}><AnimatedNumber value={s.similarity} />%</div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.05]"><motion.div className="h-full rounded-full" style={{ background: ANALOG_COLORS[s.analog.id] }} initial={{ width: 0 }} animate={{ width: `${s.similarity}%` }} transition={{ duration: 0.8 }} /></div>
                <div className="mt-2 text-[11px] text-fog-500">Peak ONI {s.analog.peak.toFixed(2)}°C</div>
                <div className="mt-0.5 text-[11px] text-fog-400">{s.analog.impact}</div>
                <div className="mt-2 text-[10.5px] text-fog-600">{shown[s.analog.id] ? 'Shown on chart · click to hide' : 'Click to compare'}</div>
              </motion.button>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel eyebrow="Historical comparison" title={`${CURRENT_YEAR} ONI vs past El Niño years (NOAA)`} delay={0.05}>
          <div className="h-[290px]">
            <ResponsiveContainer>
              <LineChart data={histData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="m" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} domain={[-1, 3]} tickFormatter={(v) => `${v}°`} />
                <ReferenceLine y={0.5} stroke="#F5B83D" strokeOpacity={0.35} strokeDasharray="3 3" label={{ value: 'El Niño threshold', fill: '#F5B83D', fontSize: 10, position: 'insideBottomRight' }} />
                <ReferenceLine x={ANALOG_MONTHS[NOW_INDEX]} stroke="#3DF58A" strokeOpacity={0.5} strokeDasharray="2 3" label={{ value: 'LATEST', fill: '#3DF58A', fontSize: 10, position: 'insideTopLeft' }} />
                <Tooltip content={<ChartTooltip unit={{}} />} />
                {ANALOGS.filter((a) => shown[a.id]).map((a) => <Line key={a.id} dataKey={a.id} name={a.label} stroke={ANALOG_COLORS[a.id]} strokeWidth={1.4} strokeOpacity={0.75} dot={false} />)}
                <Line dataKey="current" name={`${CURRENT_YEAR} (observed)`} stroke="#3DF58A" strokeWidth={3} dot={{ r: 2.5, fill: '#3DF58A' }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel eyebrow="Observed timeline" title={WEATHER ? 'ONI, Tamil Nadu rainfall & temperature anomalies' : 'ONI timeline (district weather not fetched)'} delay={0.1}>
          <ClimateSignalChart height={250} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        <Panel eyebrow="Scenario projection · not a forecast" title="Rainfall anomaly outlook" delay={0.1}>
          <div className="h-[200px]">
            <ResponsiveContainer>
              <ComposedChart data={outlook} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                <Tooltip content={<ChartTooltip unit={{ rainfall: '%' }} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="rainfall" name="Rainfall anomaly" radius={[3, 3, 3, 3]} barSize={18}>
                  {outlook.map((o) => <Cell key={o.month} fill={o.rainfall < -10 ? '#FF7A3D' : o.rainfall < 0 ? '#F5B83D' : '#4FE3F0'} />)}
                  <ErrorBar dataKey="rainErr" stroke="rgba(232,243,236,0.4)" width={6} />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel eyebrow="Scenario projection · not a forecast" title="Temperature anomaly outlook" delay={0.15}>
          <div className="h-[200px]">
            <ResponsiveContainer>
              <AreaChart data={outlook} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <defs><linearGradient id="tFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF7A3D" stopOpacity={0.35} /><stop offset="1" stopColor="#FF7A3D" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v}°`} />
                <Tooltip content={<ChartTooltip unit={{ temperature: '°C' }} digits={2} />} />
                <Area type="monotone" dataKey="temperature" name="Temperature anomaly" stroke="#FF7A3D" strokeWidth={2} fill="url(#tFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel eyebrow="Scenario projection · not a forecast" title="Water stress outlook" delay={0.2}>
          <div className="h-[200px]">
            <ResponsiveContainer>
              <AreaChart data={outlook} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <defs><linearGradient id="wFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7C9CFF" stopOpacity={0.4} /><stop offset="1" stopColor="#7C9CFF" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                <ReferenceLine y={60} stroke="#FF4D5E" strokeOpacity={0.4} strokeDasharray="3 3" />
                <Tooltip content={<ChartTooltip unit={{ waterStress: '/100' }} digits={0} />} />
                <Area type="monotone" dataKey="waterStress" name="Water stress" stroke="#7C9CFF" strokeWidth={2} fill="url(#wFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel eyebrow="Regional" title={WEATHER ? 'Observed rainfall deficit by district' : 'Rainfall deficit by district (scenario)'} delay={0.25} bodyClass="p-0">
          <div className="relative h-[240px]">
            <TamilNaduMap values={rainValues} palette="rain" interactive={false} />
            <div className="absolute bottom-2 left-3 scale-90 origin-bottom-left"><MapLegend palette="rain" label="Deficit" min="Normal" max="Severe" /></div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function EnsoGauge({ value }: { value: number }) {
  const min = -1, max = 3;
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const R = 110, cx = 140, cy = 130;
  const arc = (a0: number, a1: number) => {
    const p = (a: number) => [cx + R * Math.cos(Math.PI * (1 - a)), cy - R * Math.sin(Math.PI * (1 - a))];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `M${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1}`;
  };
  const bands = [[0, 0.125, '#4FE3F0'], [0.125, 0.375, '#3DF58A'], [0.375, 0.5, '#C6F432'], [0.5, 0.625, '#F5B83D'], [0.625, 0.875, '#FF7A3D'], [0.875, 1, '#FF4D5E']] as const;
  const deg = useCountUp((t - 0.5) * 180, 1100);
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <svg viewBox="0 0 280 150" className="w-full">
        {bands.map(([a, b, c]) => <path key={a} d={arc(a + 0.004, b - 0.004)} stroke={c} strokeOpacity={0.85} strokeWidth={12} fill="none" />)}
        <g transform={`rotate(${deg} ${cx} ${cy})`}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - R + 18} stroke="#E8F3EC" strokeWidth={2.5} strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,.6))' }} />
        </g>
        <circle cx={cx} cy={cy} r={6} fill="#E8F3EC" />
        <text x={30} y={148} fill="#5B7266" fontSize={10}>−1.0</text>
        <text x={232} y={148} fill="#5B7266" fontSize={10}>+3.0</text>
      </svg>
      <div className="-mt-5 text-center">
        <div className="num text-[34px] font-semibold text-amber"><AnimatedNumber value={value} decimals={1} />°C</div>
        <div className="text-[12px] font-semibold tracking-[0.14em] text-fog-300">{ensoLabel(value)}</div>
      </div>
    </div>
  );
}

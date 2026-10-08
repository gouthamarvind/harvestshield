import { useId } from 'react';

interface Props {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
  format?: (v: number) => string; hint?: string; accent?: string; baseline?: number; icon?: React.ReactNode;
}
/** Labelled range input with filled track and an optional baseline marker (shows drift from the scenario). */
export function Slider({ label, value, min, max, step = 1, onChange, format = (v) => String(v), hint, accent = '#3DF58A', baseline, icon }: Props) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  const bpct = baseline !== undefined ? ((baseline - min) / (max - min)) * 100 : null;
  return (
    <div className="group">
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="flex items-center gap-2 text-[12.5px] font-medium text-fog-300">{icon}{label}</label>
        <span className="num rounded-md border border-white/[0.07] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[12px] text-fog-100">{format(value)}</span>
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/[0.07]" />
        <div className="pointer-events-none absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}55, ${accent})`, boxShadow: `0 0 12px ${accent}66` }} />
        {bpct !== null && Math.abs(bpct - pct) > 0.5 && (
          <div className="pointer-events-none absolute top-1/2 h-3 w-px -translate-y-1/2 bg-fog-400/70" style={{ left: `${bpct}%` }} title="Scenario baseline" />
        )}
        <input id={id} type="range" className="slider relative" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      </div>
      {hint && <div className="mt-0.5 flex justify-between text-[10.5px] text-fog-600"><span>{format(min)}</span><span className="text-fog-500">{hint}</span><span>{format(max)}</span></div>}
    </div>
  );
}

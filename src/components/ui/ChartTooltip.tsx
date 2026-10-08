import type { TooltipProps } from 'recharts';

interface Extra { unit?: Record<string, string>; labelFormat?: (l: string) => string; digits?: number }
/** Shared Recharts tooltip in the glass style. */
export function ChartTooltip({ active, payload, label, unit = {}, labelFormat, digits = 1 }: TooltipProps<number, string> & Extra) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass min-w-[160px] rounded-lg px-3 py-2 text-[12px] shadow-xl shadow-black/40">
      <div className="mb-1.5 text-[11px] text-fog-500">{labelFormat ? labelFormat(String(label)) : label}</div>
      {payload.filter((p) => p.value !== null && p.value !== undefined).map((p) => (
        <div key={String(p.dataKey)} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-2 text-fog-300"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}</span>
          <span className="num font-mono text-fog-100">{typeof p.value === 'number' ? p.value.toFixed(digits) : p.value}{unit[String(p.dataKey)] ?? ''}</span>
        </div>
      ))}
    </div>
  );
}

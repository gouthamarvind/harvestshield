import { CalendarClock, ChevronDown } from 'lucide-react';
import { Panel } from './ui/Panel';
import { getWarningStatus, RULES, type WarningLevel } from '../services/earlyWarning';

const META: Record<WarningLevel, { label: string; color: string; summary: string }> = {
  NORMAL: { label: 'Normal', color: '#3DF58A', summary: 'No early-warning rule is currently met.' },
  WATCH: { label: 'Watch', color: '#4FE3F0', summary: 'El Niño conditions are emerging. Start preparedness.' },
  WARNING: { label: 'Warning', color: '#F5B83D', summary: 'Anticipate impacts: issue advisories and pre-position support.' },
  SEVERE: { label: 'Severe', color: '#FF4D5E', summary: 'Serious deficit under strong El Niño: activate contingency plans.' },
};

export function EarlyWarningPanel() {
  const ew = getWarningStatus();
  const m = META[ew.level];
  const w = ew.nextWindow;
  const when = w.open ? 'Open now' : `In ${w.daysAway} days`;
  return (
    <Panel eyebrow="Early warning · observed conditions and NOAA outlook" title="Current warning level" delay={0.02}
      actions={<span className="text-[11.5px] text-fog-500">Data as of {ew.asOf}</span>}>
      <div className="grid gap-5 md:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-1.5 rounded-full" style={{ background: m.color, boxShadow: `0 0 12px ${m.color}` }} />
            <div>
              <div className="text-[30px] font-semibold leading-none" style={{ color: m.color }}>{m.label.toUpperCase()}</div>
              <div className="mt-1 text-[13px] text-fog-300">{m.summary}</div>
            </div>
          </div>
          <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-fog-500">Why</div>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[12.5px] text-fog-300">
            {ew.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-fog-500"><CalendarClock className="h-3.5 w-3.5" />Next sowing window</div>
            <div className="mt-1.5 text-[14px] font-semibold">{w.crop}</div>
            <div className="text-[12.5px] text-fog-400">Opens {w.start} · {when}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-500">Recommended actions</div>
            <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-[12.5px] text-fog-300">
              {ew.actions.slice(0, 3).map((a) => <li key={a}>{a}</li>)}
            </ol>
          </div>
        </div>
      </div>
      <details className="group mt-4 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-2.5">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[12.5px] font-medium text-fog-300">
          Rule set used for this level
          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-2 text-[12px] text-fog-400">
          {RULES.map((r) => (
            <div key={r.when}><span className="font-semibold text-fog-200">{r.level}</span> when {r.when}. {r.meaning}</div>
          ))}
          <div className="pt-1 text-fog-500">These thresholds are a transparent working rule set, not an official standard.</div>
        </div>
      </details>
    </Panel>
  );
}

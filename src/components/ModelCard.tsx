import { ShieldCheck, FlaskConical } from 'lucide-react';
import { Panel } from './ui/Panel';
import { Badge } from './ui/Badge';
import { W } from '../model/risk';
import { MODEL_VERSION } from '../data/provenance';
import { VALIDATION } from '../data/observed';

const fmt = (v: number | null | undefined, dp = 1) => (v == null || !Number.isFinite(v) ? '—' : v.toFixed(dp));
const pct = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '—' : `${Math.round(v * 100)}%`);

const TERMS: { label: string; weight: number; input: string; direction: string; source: string }[] = [
  { label: 'Rainfall anomaly', weight: W.rainfall, input: 'Seasonal rainfall against normal (%)', direction: 'A deficit raises risk', source: 'NASA POWER daily, by district, when loaded; otherwise the scenario slider' },
  { label: 'Water availability', weight: W.water, input: 'Effective water supply (% of normal)', direction: 'Less water raises risk', source: 'Reservoir storage is assumed at 60% in this prototype' },
  { label: 'Temperature', weight: W.temperature, input: 'Temperature anomaly (°C)', direction: 'Warmer raises risk', source: 'NASA POWER daily 2 m temperature, by district, when loaded' },
  { label: 'ENSO forcing', weight: W.enso, input: 'Oceanic Niño Index (°C)', direction: 'Warmer (El Niño) raises risk', source: 'NOAA CPC ONI, bundled snapshot' },
  { label: 'Coastal exposure', weight: W.coastal, input: 'Coastal flag per district', direction: 'Exposed districts raise risk', source: 'Illustrative flag, not a measured hazard' },
];

const MODEL_LIMITS = [
  'Weights are hand-set. They are not fitted to yield history, and the backtest does not tune them.',
  'The score ranks districts for review. It is not a yield forecast, an insurance loss estimate or a probability.',
  'Crop sensitivities, sowing windows, coastal flags and reservoir storage are assumptions and are labelled as such.',
  'Terms add together, so a strong term can mask a weak one. Read the factor breakdown, not only the total.',
];

export function ModelCardPanel() {
  return (
    <Panel eyebrow={<span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" />Model card</span>} title={`${MODEL_VERSION} · what the score is`}>
      <div className="space-y-4 text-[13px]">
        <p className="leading-relaxed text-fog-300">
          A transparent additive score from 2 to 98 that ranks districts for review. Each term is shown with its weight, its direction and where its input comes from.
        </p>
        <div className="divide-y divide-white/[0.05]">
          {TERMS.map((t) => (
            <div key={t.label} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 py-2.5">
              <div className="text-fog-100">{t.label} <span className="text-fog-500">· weight {t.weight}</span></div>
              <div className="text-right text-[11.5px] text-fog-500">{t.direction}</div>
              <div className="col-span-2 text-[11.5px] leading-relaxed text-fog-500">Input: {t.input}. Source: {t.source}.</div>
            </div>
          ))}
        </div>
        <div className="text-[11.5px] text-fog-500">
          Also in the score without a fixed weight: crop sensitivity (set per crop), a sowing-window penalty and a diversification buffer for mixed plans.
        </div>
        <div>
          <div className="mb-1.5 text-[12px] font-medium text-fog-300">Limitations</div>
          <ul className="list-disc space-y-1 pl-5 text-[12px] leading-relaxed text-fog-400">
            {MODEL_LIMITS.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </div>
      </div>
    </Panel>
  );
}

export function ValidationPanel() {
  const v = VALIDATION;
  const tone = v.status === 'ok' ? 'mint' : v.status === 'insufficient' ? 'amber' : 'neutral';
  const label = v.status === 'ok' ? 'Backtest run' : v.status === 'insufficient' ? 'Insufficient data' : 'Not run';
  return (
    <Panel
      eyebrow={<span className="flex items-center gap-1.5"><FlaskConical className="h-3 w-3" />Historical backtest</span>}
      title="Does the rainfall signal predict yield losses?"
      actions={<Badge tone={tone} dot>{label}</Badge>}
    >
      <div className="space-y-4 text-[13px]">
        {v.status === 'not_run' && <p className="leading-relaxed text-fog-400">{v.message}</p>}
        {v.status === 'insufficient' && <p className="leading-relaxed text-fog-400">{v.reason}</p>}
        {v.status === 'ok' && v.metrics && (
          <>
            <p className="text-[12px] leading-relaxed text-fog-400">{v.scope}</p>
            <div className="space-y-2">
              {([
                ['Held-out district-years', `${v.metrics.outOfSamplePairs} · ${v.metrics.districts} districts · ${v.metrics.years} years`],
                ['Pearson r (predicted vs observed anomaly)', fmt(v.metrics.pearson_r, 2)],
                ['Spearman ρ', fmt(v.metrics.spearman_rho, 2)],
                ['Mean absolute error', `${fmt(v.metrics.mae_pct)} pts (trend-only: ${fmt(v.metrics.naive_mae_pct)} pts)`],
                ['Skill against trend-only', fmt(v.metrics.skill_vs_zero, 2)],
                [`Loss years (yield ≤ ${v.thresholds?.lossYearPct ?? -10}%)`, `${v.metrics.lossYears}`],
                [`Flagged (predicted ≤ ${v.thresholds?.predictedLossPct ?? -5}%)`, `${v.metrics.flaggedYears}`],
                ['Loss recall · precision', `${pct(v.metrics.lossRecall)} · ${pct(v.metrics.lossPrecision)}`],
              ] as [string, string][]).map(([k, val]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-white/[0.04] pb-2">
                  <span className="text-fog-500">{k}</span>
                  <span className="text-right text-fog-100">{val}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="mb-1.5 text-[12px] font-medium text-fog-300">Event seasons</div>
              <ul className="space-y-1.5 text-[12px] text-fog-400">
                {v.events.map((e) => {
                  const parts: string[] = [];
                  if (e.statewideRainAnomPct != null) parts.push(`statewide rainfall ${fmt(e.statewideRainAnomPct)}%`);
                  if (e.districtsScored > 0) parts.push(`mean observed yield ${fmt(e.meanObservedYieldAnomPct)}% against predicted ${fmt(e.meanPredictedYieldAnomPct)}%, ${e.districtsFlagged} of ${e.districtsScored} districts flagged`);
                  return (
                    <li key={e.id}>
                      <span className="text-fog-200">{e.label}</span>
                      {parts.length ? `: ${parts.join('; ')}.` : ''}
                      {e.districtsScored === 0 && e.note ? ` ${e.note}` : ''}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <div className="mb-1.5 text-[12px] font-medium text-fog-300">Limitations</div>
              <ul className="list-disc space-y-1 pl-5 text-[12px] leading-relaxed text-fog-400">
                {(v.limitations ?? []).map((l) => <li key={l}>{l}</li>)}
              </ul>
            </div>
            <div className="text-[11px] text-fog-600">
              Run {v.generatedAt ? new Date(v.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} · {v.inputs?.yieldRowsTotal ?? '—'} yield rows · seasonal baseline {v.inputs?.seasonalBaseline ?? '—'}
            </div>
          </>
        )}
        {v.status !== 'ok' && (
          <div className="text-[11.5px] text-fog-600">
            No accuracy is claimed until this runs. Commands: npm run normalize:yields, npm run build:seasonal, npm run backtest.
          </div>
        )}
      </div>
    </Panel>
  );
}

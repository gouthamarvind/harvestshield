/**
 * climateService — ENSO, rainfall and temperature signals.
 * History is REAL: NOAA CPC ONI (bundled snapshot / refreshed by the fetch script) and, once
 * `npm run fetch:climate` has run, NASA POWER monthly rainfall & temperature anomalies for Tamil Nadu.
 * The month-ahead outlook remains a scenario projection, not a forecast.
 */
import type { ScenarioParams } from '../data/scenarios';
import { clamp } from '../lib/format';
import { ONI, WEATHER } from '../data/observed';

export interface ClimatePoint { date: string; t: number; enso: number | null; rainfall: number | null; temperature: number | null; forecast: boolean }
export type TimeRange = '30d' | '90d' | '12m' | '24m';
export const TIME_RANGES: { id: TimeRange; label: string; days: number; months: number }[] = [
  { id: '30d', label: 'Last 3 months', days: 90, months: 3 },
  { id: '90d', label: 'Last 6 months', days: 180, months: 6 },
  { id: '12m', label: 'Last 12 months', days: 365, months: 12 },
  { id: '24m', label: 'Last 24 months', days: 730, months: 24 },
];

/** Monthly observed series (ONI by season-centre month; rainfall/temperature anomalies when fetched). */
export function getClimateSeries(_p?: ScenarioParams): ClimatePoint[] {
  const byMonth = new Map<string, ClimatePoint>();
  const get = (m: string) => {
    if (!byMonth.has(m)) byMonth.set(m, { date: `${m}-15`, t: 0, enso: null, rainfall: null, temperature: null, forecast: false });
    return byMonth.get(m)!;
  };
  for (const o of ONI.monthly) get(o.month).enso = o.value;
  for (const w of WEATHER?.monthly ?? []) { const pt = get(w.month); pt.rainfall = w.rainAnomPct; pt.temperature = w.tempAnomC; }
  const all = [...byMonth.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  all.forEach((pt, i) => (pt.t = i - (all.length - 1)));
  return all;
}

export function sliceSeries(series: ClimatePoint[], range: TimeRange): ClimatePoint[] {
  const months = TIME_RANGES.find((r) => r.id === range)!.months;
  return series.slice(-Math.max(months, 3));
}

/** Historical El Niño analogues, real ONI on an Apr → Apr axis. */
export interface AnalogYear { id: string; label: string; peak: number; impact: string; oni: (number | null)[] }
export const ANALOG_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];

/** Apr(y) … Apr(y+1) using season-centre months: Apr = MAM … Dec = NDJ, Jan = DJF(y+1) … Apr = MAM(y+1). */
function trajectory(y: number): (number | null)[] {
  const a = ONI.table[y] ?? Array(12).fill(null), b = ONI.table[y + 1] ?? Array(12).fill(null);
  return [...a.slice(3, 12), ...b.slice(0, 4)];
}
const IMPACTS: Record<string, string> = {
  '1997': 'Very strong event; all-India monsoon still near normal',
  '2009': 'Moderate event; severe all-India monsoon drought',
  '2015': 'Very strong event; Chennai floods in Dec 2015',
  '2023': 'Strong event; Dec 2023 floods in Chennai & south TN',
};
export const ANALOGS: AnalogYear[] = [1997, 2009, 2015, 2023].map((y) => {
  const oni = trajectory(y);
  return { id: String(y), label: `${y}–${String(y + 1).slice(2)}`, peak: Math.max(...oni.filter((v): v is number => v != null)), impact: IMPACTS[y], oni };
});

export const CURRENT_YEAR = ONI.latest.year;
/** The current season's observed ONI on the same axis. */
export function currentTrajectory(_p?: ScenarioParams): (number | null)[] {
  return trajectory(CURRENT_YEAR);
}
/** Index of the latest observed month on the Apr→Apr axis. */
export const NOW_INDEX = (() => { const t = trajectory(CURRENT_YEAR); let i = -1; t.forEach((v, k) => { if (v != null) i = k; }); return i; })();
/** No official forecast is ingested, so no forecast line is drawn. */
export function forecastTrajectory(_p?: ScenarioParams): (number | null)[] {
  return ANALOG_MONTHS.map(() => null);
}

/** Similarity = 100 − scaled RMSE over the months observed so far this season. */
export function analogSimilarity(_p?: ScenarioParams): { analog: AnalogYear; similarity: number }[] {
  const cur = currentTrajectory();
  return ANALOGS.map((a) => {
    const pairs = cur.map((v, i) => [v, a.oni[i]] as const).filter(([v, w]) => v != null && w != null) as [number, number][];
    const err = Math.sqrt(pairs.reduce((s, [v, w]) => s + (v - w) ** 2, 0) / Math.max(1, pairs.length));
    return { analog: a, similarity: clamp(100 - err * 60, 5, 99) };
  }).sort((x, y) => y.similarity - x.similarity);
}

/** Month-ahead outlook for rainfall, temperature and water stress (state aggregate). */
export function getOutlook(p: ScenarioParams) {
  const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  const decay = [1, 1.08, 1.05, 0.92, 0.8, 0.66];
  return months.map((m, i) => {
    const rain = p.rainfall * decay[i];
    const temp = p.temperature * (0.9 + i * 0.04);
    const water = clamp((90 - p.water * (1 - i * 0.04)) * 1.1 + Math.max(0, -rain) * 0.6, 0, 100);
    return { month: m, rainfall: +rain.toFixed(1), rainLo: +(rain - 6 - i * 1.5).toFixed(1), rainHi: +(rain + 6 + i * 1.5).toFixed(1), temperature: +temp.toFixed(2), waterStress: +water.toFixed(0) };
  });
}

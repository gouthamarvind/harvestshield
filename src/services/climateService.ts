/**
 * climateService — ENSO, rainfall and temperature signals.
 * Prototype: deterministic synthetic series shaped by the active scenario.
 * Production: swap for NOAA CPC ONI / IMD gridded rainfall / ERA5 temperature adapters with the same return types.
 */
import type { ScenarioParams } from '../data/scenarios';
import { mulberry32 } from '../lib/prng';
import { clamp } from '../lib/format';

export interface ClimatePoint { date: string; t: number; enso: number; rainfall: number; temperature: number; forecast: boolean }
export type TimeRange = '30d' | '90d' | '12m' | '24m';
export const TIME_RANGES: { id: TimeRange; label: string; days: number }[] = [
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
  { id: '12m', label: 'Last 12 months', days: 365 },
  { id: '24m', label: 'Last 24 months', days: 730 },
];

const TODAY = new Date('2026-10-08T00:00:00Z');
const DAY = 86400000;

/** Daily signal for the past 730 days + 90 forecast days, scaled to the scenario's current state. */
export function getClimateSeries(p: ScenarioParams): ClimatePoint[] {
  const rnd = mulberry32(42);
  const out: ClimatePoint[] = [];
  let rN = 0, tN = 0, eN = 0;
  for (let i = -730; i <= 90; i++) {
    // Past: smooth ramp from ENSO-neutral (~14 months ago) to today's scenario state. Future: brief peak, then decay.
    const tt = clamp((i + 420) / 420, 0, 1);
    const k = i <= 0 ? tt * tt * (3 - 2 * tt) : i <= 45 ? 1 + 0.08 * (i / 45) : 1.08 - (i - 45) / 300;
    eN = eN * 0.94 + (rnd() - 0.5) * 0.05;
    rN = rN * 0.8 + (rnd() - 0.5) * 3.2;
    tN = tN * 0.85 + (rnd() - 0.5) * 0.12;
    const season = Math.sin(((i + 120) / 365) * Math.PI * 2) * 2.5;
    out.push({
      date: new Date(TODAY.getTime() + i * DAY).toISOString().slice(0, 10),
      t: i,
      enso: +(p.enso * k - 0.35 * (1 - k) + eN).toFixed(2),
      rainfall: +(p.rainfall * k + rN + season).toFixed(1),
      temperature: +(p.temperature * k + tN + 0.15).toFixed(2),
      forecast: i > 0,
    });
  }
  return out;
}

export function sliceSeries(series: ClimatePoint[], range: TimeRange, includeForecast = true): ClimatePoint[] {
  const days = TIME_RANGES.find((r) => r.id === range)!.days;
  const fwd = includeForecast ? Math.max(14, Math.round(days * 0.25)) : 0;
  const s = series.filter((d) => d.t > -days && d.t <= fwd);
  const step = Math.max(1, Math.floor(s.length / 120));
  return s.filter((_, i) => i % step === 0 || s[i].t === 0);
}

/** Historical El Niño analogues (approximate ONI-style trajectories, illustrative). */
export interface AnalogYear { id: string; label: string; peak: number; rainfall: number; impact: string; oni: number[] }
export const ANALOGS: AnalogYear[] = [
  { id: '1997', label: '1997–98', peak: 2.4, rainfall: -12, impact: 'Severe; widespread kharif deficits', oni: [-0.5, -0.3, 0, 0.4, 0.8, 1.2, 1.6, 1.9, 2.1, 2.3, 2.4, 2.2, 1.9] },
  { id: '2009', label: '2009–10', peak: 1.6, rainfall: -22, impact: 'Major drought year nationally', oni: [-0.8, -0.6, -0.2, 0.1, 0.4, 0.6, 0.8, 0.8, 1.0, 1.4, 1.6, 1.6, 1.3] },
  { id: '2015', label: '2015–16', peak: 2.6, rainfall: -14, impact: 'Second consecutive deficit monsoon', oni: [0.5, 0.5, 0.6, 0.7, 0.9, 1.2, 1.5, 1.9, 2.2, 2.4, 2.6, 2.6, 2.5] },
  { id: '2023', label: '2023–24', peak: 2.0, rainfall: -6, impact: 'Uneven monsoon; heat extremes', oni: [-0.4, -0.1, 0.2, 0.5, 0.8, 1.1, 1.3, 1.6, 1.8, 1.9, 2.0, 2.0, 1.8] },
];
export const ANALOG_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];

/** Current-season trajectory on the same monthly axis, ending at the scenario value (index 6 = Oct, "now"). */
export function currentTrajectory(p: ScenarioParams): (number | null)[] {
  const tail = [0.3, 0.32, 0.38, 0.46, 0.6, 0.8, 1].map((f) => +(p.enso * f).toFixed(2));
  return [...tail, null, null, null, null, null, null];
}
export function forecastTrajectory(p: ScenarioParams): (number | null)[] {
  const f = [1, 1.08, 1.12, 1.1, 1.0, 0.85, 0.7].map((x) => +(p.enso * x).toFixed(2));
  return [null, null, null, null, null, null, ...f];
}

/** Similarity = 100 − scaled RMSE between the observed months and each analogue. */
export function analogSimilarity(p: ScenarioParams): { analog: AnalogYear; similarity: number }[] {
  const cur = currentTrajectory(p).slice(0, 7) as number[];
  return ANALOGS.map((a) => {
    const err = Math.sqrt(cur.reduce((s, v, i) => s + (v - a.oni[i]) ** 2, 0) / cur.length);
    const rainErr = Math.abs(p.rainfall - a.rainfall) / 30;
    return { analog: a, similarity: clamp(100 - err * 55 - rainErr * 18, 5, 98) };
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

/**
 * NASA POWER daily point data helpers.
 * Fill value -999 means missing. Precipitation is PRECTOTCORR (bias-corrected, mm/day); temperature is T2M (°C, 2 m mean).
 */
import { mean, sum, longestRun } from './stats.mjs';

export const FILL = -999;
export const SEASON = { startMonthDay: '06-01', endMonthDay: '10-05', label: '1 Jun – 5 Oct (127 days)' };
export const HEAVY_RAIN_MM = 64.5;   // IMD threshold for heavy rainfall, mm/day
export const DRY_DAY_MM = 1.0;       // a day with less than 1 mm counts as dry
const RAIN_MAX = 500, TEMP_MIN = -5, TEMP_MAX = 50;

/** Returns Map<'YYYY-MM-DD', {p: number|null, t: number|null}>. Throws if the response has no usable structure. */
export function parsePowerResponse(json, label = 'POWER response') {
  const par = json?.properties?.parameter;
  if (!par || typeof par !== 'object') throw new Error(`${label}: missing properties.parameter`);
  const P = par.PRECTOTCORR, T = par.T2M;
  if (!P || !T) throw new Error(`${label}: PRECTOTCORR or T2M missing`);
  const out = new Map();
  for (const k of Object.keys(P)) {
    const date = `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`;
    const p = clean(P[k], 0, RAIN_MAX);
    const t = clean(T[k], TEMP_MIN, TEMP_MAX);
    out.set(date, { p, t });
  }
  if (out.size === 0) throw new Error(`${label}: no daily records`);
  return out;
}

/** Fill values and out-of-range values become null (counted by the caller). */
export function clean(v, lo, hi) {
  if (v === FILL || v == null || !Number.isFinite(v)) return null;
  if (v < lo || v > hi) return null;
  return v;
}

/** All dates of one season window in a given year (inclusive). */
export function seasonDates(year) {
  const out = [];
  const start = Date.UTC(year, 5, 1), end = Date.UTC(year, 9, 5);
  for (let t = start; t <= end; t += 86400000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

/**
 * Metrics for one district-year. A season is "complete" only if at least 95% of its days have valid
 * rainfall AND temperature. Incomplete seasons are reported as null rather than estimated.
 */
export function seasonMetrics(year, byDate) {
  const days = seasonDates(year);
  const rows = days.map((d) => byDate.get(d) ?? { p: null, t: null });
  const pv = rows.map((r) => r.p).filter((v) => v != null);
  const tv = rows.map((r) => r.t).filter((v) => v != null);
  const expected = days.length;
  const complete = pv.length / expected >= 0.95 && tv.length / expected >= 0.95;
  if (!complete) return { year, expected, valid: Math.min(pv.length, tv.length), complete: false, rain_mm: null, t_mean: null, extreme_days: null, max_dry_spell: null };
  const dryFlags = rows.map((r) => r.p != null && r.p < DRY_DAY_MM);
  return {
    year,
    expected,
    valid: Math.min(pv.length, tv.length),
    complete: true,
    rain_mm: Math.round(sum(pv) * 10) / 10,
    t_mean: Math.round(mean(tv) * 100) / 100,
    extreme_days: pv.filter((v) => v >= HEAVY_RAIN_MM).length,
    max_dry_spell: longestRun(dryFlags),
  };
}

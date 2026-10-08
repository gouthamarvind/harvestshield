import type { ScenarioParams } from '../data/scenarios';
import type { District } from '../data/districts';
import type { Exposure } from './risk';

/**
 * Resolve the scenario for one district.
 * With observed data, the district's own measured rainfall/temperature anomaly is used and the
 * illustrative spatial multipliers (d.rain, d.heat) are switched off, because the measurement already
 * contains the local variation.
 */
export function localize(p: ScenarioParams, d: District): { p: ScenarioParams; exp: Exposure; observed: boolean } {
  const o = p.local?.[d.id];
  if (o) return { p: { ...p, rainfall: o.rainfall, temperature: o.temperature }, exp: { irrigation: d.irrigation, coastal: d.coastal, heat: 1, rain: 1 }, observed: true };
  return { p, exp: { irrigation: d.irrigation, coastal: d.coastal, heat: d.heat, rain: d.rain }, observed: false };
}

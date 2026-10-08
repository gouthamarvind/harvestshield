/**
 * waterService — reservoir storage and sector allocation trade-offs.
 * Production: CWC reservoir bulletins, TN WRD storage, groundwater (CGWB) and canal release schedules.
 */
import type { ScenarioParams } from '../data/scenarios';
import { clamp } from '../lib/format';

export type Sector = 'domestic' | 'rice' | 'millets' | 'vegetables' | 'livestock';
export const SECTORS: { id: Sector; label: string; color: string; need: number; foodPerUnit: number }[] = [
  // need = share of available water required to fully satisfy the sector under normal storage
  { id: 'domestic', label: 'Domestic', color: '#4FE3F0', need: 22, foodPerUnit: 0 },
  { id: 'rice', label: 'Rice', color: '#7C9CFF', need: 48, foodPerUnit: 1.0 },
  { id: 'millets', label: 'Millets', color: '#3DF58A', need: 10, foodPerUnit: 1.9 },
  { id: 'vegetables', label: 'Vegetables', color: '#C6F432', need: 12, foodPerUnit: 1.4 },
  { id: 'livestock', label: 'Livestock', color: '#F5B83D', need: 8, foodPerUnit: 0.9 },
];
export type Allocation = Record<Sector, number>;
export const DEFAULT_ALLOCATION: Allocation = { domestic: 24, rice: 52, millets: 8, vegetables: 10, livestock: 6 };

export interface Reservoir { name: string; basin: string; capacity: number; storage: number }
const RES: [string, string, number, number][] = [
  ['Mettur (Stanley)', 'Cauvery', 93.5, 1.0], ['Bhavanisagar', 'Bhavani', 32.8, 1.08], ['Vaigai', 'Vaigai', 6.1, 0.82],
  ['Periyar', 'Periyar', 10.6, 1.12], ['Papanasam', 'Thamirabarani', 5.5, 0.95], ['Sathanur', 'Ponnaiyar', 7.3, 0.86],
];
export function getReservoirs(p: ScenarioParams): Reservoir[] {
  return RES.map(([name, basin, capacity, k]) => ({ name, basin, capacity, storage: clamp(p.water * k, 4, 100) }));
}

export interface AllocationOutcome { cropLoss: number; foodProduction: number; waterStress: number; domesticCoverage: number; score: number }

/** Each sector's satisfaction = allocated / need scaled by scarcity; food from weighted satisfaction. */
export function evaluateAllocation(p: ScenarioParams, a: Allocation): AllocationOutcome {
  const scarcity = p.water / 90; // fraction of a normal year's water
  const sat = (s: Sector) => {
    const sec = SECTORS.find((x) => x.id === s)!;
    return clamp((a[s] * scarcity) / sec.need, 0, 1.15);
  };
  const domesticCoverage = clamp(sat('domestic') * 100, 0, 100);
  const cropSat = (sat('rice') * 0.55 + sat('millets') * 0.15 + sat('vegetables') * 0.18 + sat('livestock') * 0.12);
  const resp = (x: number) => 1 - Math.pow(1 - clamp(x, 0, 1), 1.6); // diminishing returns
  const food = SECTORS.filter((s) => s.id !== 'domestic').reduce((sum, s) => sum + resp(sat(s.id)) * s.foodPerUnit * s.need, 0);
  const foodMax = SECTORS.filter((s) => s.id !== 'domestic').reduce((sum, s) => sum + s.foodPerUnit * s.need, 0);
  const foodProduction = (food / foodMax) * 100;
  const cropLoss = clamp((1 - cropSat) * 100 * 0.9, 0, 100);
  const waterStress = clamp(100 - (domesticCoverage * 0.45 + cropSat * 100 * 0.55), 0, 100);
  const domesticPenalty = domesticCoverage < 95 ? (95 - domesticCoverage) * 2.2 : 0;
  return { cropLoss, foodProduction, waterStress, domesticCoverage, score: foodProduction - waterStress * 0.4 - domesticPenalty };
}

/** Grid search (5% steps) for the allocation with the best resilience score. */
export function bestAllocation(p: ScenarioParams): Allocation {
  let best = DEFAULT_ALLOCATION, bestScore = -Infinity;
  for (let d = 15; d <= 40; d += 5)
    for (let r = 10; r <= 60; r += 5)
      for (let m = 0; m <= 30; m += 5)
        for (let v = 0; v <= 25; v += 5) {
          const l = 100 - d - r - m - v;
          if (l < 0 || l > 20) continue;
          const a = { domestic: d, rice: r, millets: m, vegetables: v, livestock: l };
          const s = evaluateAllocation(p, a).score;
          if (s > bestScore) { bestScore = s; best = a; }
        }
  return best;
}

/** Re-balance so the allocation sums to 100 after one sector changes. */
export function rebalance(a: Allocation, changed: Sector, value: number): Allocation {
  const v = clamp(Math.round(value), 0, 100);
  const others = (Object.keys(a) as Sector[]).filter((s) => s !== changed);
  const rest = others.reduce((s, k) => s + a[k], 0);
  const remaining = 100 - v;
  const next = { ...a, [changed]: v } as Allocation;
  others.forEach((k) => { next[k] = rest > 0 ? (a[k] / rest) * remaining : remaining / others.length; });
  // integer rounding fix
  const rounded = Object.fromEntries((Object.keys(next) as Sector[]).map((k) => [k, Math.round(next[k])])) as Allocation;
  const diff = 100 - Object.values(rounded).reduce((s, x) => s + x, 0);
  const fixKey = others.sort((x, y) => rounded[y] - rounded[x])[0];
  rounded[fixKey] += diff;
  return rounded;
}

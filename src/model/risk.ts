/**
 * HarvestShield prototype risk model — a transparent, deterministic heuristic.
 *
 *   Risk = rainfall stress + water stress + temperature stress + ENSO forcing
 *        + coastal exposure + intrinsic crop sensitivity  (− diversification buffer)
 *
 * Every term is returned as a named factor so the UI can explain the score.
 * NOT a validated scientific model: coefficients are illustrative and chosen for plausible behaviour.
 */
import { CROPS, type CropId } from '../data/crops';
import type { ScenarioParams } from '../data/scenarios';
import { clamp } from '../lib/format';

export type FactorKey = 'rainfall' | 'water' | 'temperature' | 'enso' | 'coastal' | 'crop' | 'sowing' | 'portfolio';
export interface Factor { key: FactorKey; label: string; value: number }

export const FACTOR_LABELS: Record<FactorKey, string> = {
  rainfall: 'Rainfall anomaly',
  water: 'Water availability',
  temperature: 'Temperature',
  enso: 'ENSO forcing',
  coastal: 'Coastal exposure',
  crop: 'Crop sensitivity',
  sowing: 'Sowing window',
  portfolio: 'Diversification buffer',
};

export interface Exposure { irrigation: number; coastal: number; heat: number; rain: number }
export const NEUTRAL_EXPOSURE: Exposure = { irrigation: 0.6, coastal: 0, heat: 1, rain: 1 };

export interface CropModifiers {
  /** Effective water availability (% of normal) after allocation decisions. */
  waterEff?: number;
  /** Multiplier on crop water demand (e.g. AWD irrigation). */
  demandMult?: number;
  /** Sowing shift in weeks relative to the standard calendar. */
  sowingShift?: number;
}

export interface CropRisk { crop: CropId; score: number; factors: Factor[]; yieldTHa: number; waterMm: number }

const W = { rainfall: 28, water: 22, temperature: 14, enso: 9, coastal: 5 };

function sowingEffect(shift: number) {
  // Delaying sowing aligns crop water demand with the north-east monsoon window; too late shortens the season.
  if (shift <= -2) return { rainMult: 1.12, penalty: 0 };
  if (shift === 0) return { rainMult: 1, penalty: 0 };
  if (shift <= 2) return { rainMult: 0.8, penalty: 0.5 };
  return { rainMult: 0.7, penalty: 3.5 };
}

export function cropRisk(p: ScenarioParams, cropId: CropId, exp: Exposure = NEUTRAL_EXPOSURE, mod: CropModifiers = {}): CropRisk {
  const c = CROPS[cropId];
  const sow = sowingEffect(mod.sowingShift ?? 0);
  const demand = c.waterNeed * (mod.demandMult ?? 1);
  const waterEff = clamp(mod.waterEff ?? p.water, 0, 110);

  const rainfall = clamp(-p.rainfall / 20, 0, 1.6) * W.rainfall * c.rainSensitivity * exp.rain * sow.rainMult;
  const water = clamp((90 - waterEff) / 50, 0, 1.6) * W.water * demand * (0.6 + 0.5 * exp.irrigation);
  const temperature = clamp(p.temperature / 1.5, 0, 2) * W.temperature * c.heatSensitivity * exp.heat;
  const enso = clamp(p.enso / 1.7, 0, 1.8) * W.enso * c.ensoSensitivity;
  const coastal = exp.coastal * W.coastal * clamp(p.enso / 1.7, 0, 1.5) * c.rainSensitivity;
  const stressNorm = clamp((rainfall + water + temperature + enso) / 70, 0, 1.5);
  const crop = c.intrinsic * (0.4 + 0.6 * stressNorm);
  const sowing = sow.penalty;

  const factors: Factor[] = ([
    ['rainfall', rainfall], ['water', water], ['temperature', temperature], ['enso', enso],
    ['coastal', coastal], ['crop', crop], ['sowing', sowing],
  ] as [FactorKey, number][])
    .filter(([, v]) => v > 0.05)
    .map(([key, value]) => ({ key, label: FACTOR_LABELS[key], value }));

  const score = clamp(factors.reduce((s, f) => s + f.value, 0), 2, 98);
  const yieldTHa = c.baseYield * (1 - (score / 100) * 0.45);
  const waterMm = c.waterMm * (mod.demandMult ?? 1);
  return { crop: cropId, score, factors, yieldTHa, waterMm };
}

/** Merge factor lists with weights (used for mixes and diversified plans). */
export function blendFactors(parts: { factors: Factor[]; weight: number }[]): Factor[] {
  const acc = new Map<FactorKey, number>();
  for (const p of parts) for (const f of p.factors) acc.set(f.key, (acc.get(f.key) ?? 0) + f.value * p.weight);
  return [...acc.entries()].map(([key, value]) => ({ key, label: FACTOR_LABELS[key], value })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

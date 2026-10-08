/**
 * Plan evaluation + intervention optimiser for the Scenario Lab.
 * A plan = primary crop, optional diversification share to an alternative crop, sowing shift and intervention flags.
 */
import { CROPS, type CropId } from '../data/crops';
import type { ScenarioParams } from '../data/scenarios';
import type { District } from '../data/districts';
import { clamp } from '../lib/format';
import { localize } from './localize';
import { cropRisk, blendFactors, type Exposure, type Factor, NEUTRAL_EXPOSURE } from './risk';

export interface Plan {
  crop: CropId;
  altCrop: CropId;
  /** Share of area moved to altCrop (0–1). */
  diversify: number;
  /** Weeks; 0 = standard calendar. */
  sowingShift: number;
  /** Alternate wetting & drying / deficit irrigation. */
  awd: boolean;
  /** Protected agricultural water allocation (+12 pts availability). */
  protectWater: boolean;
  /** Pre-positioned food reserves (reduces food-security exposure). */
  reserves: boolean;
}

export interface PlanOutcome {
  risk: number;
  factors: Factor[];
  yieldTHa: number;
  productionT: number;
  /** Production under normal climate for the same plan, t. */
  potentialT: number;
  lossT: number;
  waterML: number;
  foodExposure: number;
  netIncome: number;
  costINR: number;
}

export const basePlan = (crop: CropId): Plan => ({
  crop, altCrop: crop === 'millet' ? 'sorghum' : 'millet', diversify: 0, sowingShift: 0, awd: false, protectWater: false, reserves: false,
});

export const NORMAL: ScenarioParams = { enso: 0, rainfall: 0, temperature: 0, water: 90 };

const PROTECT_BOOST = 12;

export function evaluatePlan(p0: ScenarioParams, plan: Plan, areaHa: number, d?: District): PlanOutcome {
  const { p, exp }: { p: ScenarioParams; exp: Exposure } = d ? localize(p0, d) : { p: p0, exp: NEUTRAL_EXPOSURE };
  const s = plan.crop === plan.altCrop ? 0 : clamp(plan.diversify, 0, 1);
  const awdMult = (c: CropId) => (plan.awd ? (c === 'rice' ? 0.78 : 0.9) : 1);

  // Water freed by lower-demand crops is re-allocated across the remaining area.
  const demandAll = CROPS[plan.crop].waterNeed;
  const demandPlan = (1 - s) * CROPS[plan.crop].waterNeed + s * CROPS[plan.altCrop].waterNeed;
  const baseWater = p.water + (plan.protectWater ? PROTECT_BOOST : 0);
  const waterEff = clamp(baseWater * (demandAll / Math.max(0.15, demandPlan)), 0, 105);

  const mods = (c: CropId) => ({ waterEff, demandMult: awdMult(c), sowingShift: plan.sowingShift });
  const r1 = cropRisk(p, plan.crop, exp, mods(plan.crop));
  const r2 = cropRisk(p, plan.altCrop, exp, mods(plan.altCrop));

  const portfolio = -(2 * s * (1 - s)) * 0.14 * ((1 - s) * r1.score + s * r2.score);
  const factors = blendFactors([{ factors: r1.factors, weight: 1 - s }, { factors: r2.factors, weight: s }]);
  if (portfolio < -0.05) factors.push({ key: 'portfolio', label: 'Diversification buffer', value: portfolio });
  const risk = clamp((1 - s) * r1.score + s * r2.score + portfolio, 2, 98);

  const awdYield = plan.awd ? 0.985 : 1;
  const yieldTHa = ((1 - s) * r1.yieldTHa + s * r2.yieldTHa) * awdYield;
  const productionT = areaHa * yieldTHa;

  const n1 = cropRisk(NORMAL, plan.crop, exp), n2 = cropRisk(NORMAL, plan.altCrop, exp);
  const potentialT = areaHa * ((1 - s) * n1.yieldTHa + s * n2.yieldTHa);
  const lossT = Math.max(0, potentialT - productionT);

  const waterML = (areaHa * ((1 - s) * r1.waterMm + s * r2.waterMm)) / 100;
  const vuln = d?.vulnerability ?? 0.5;
  const lossFrac = potentialT > 0 ? lossT / potentialT : 0;
  const foodExposure = clamp(lossFrac * 100 * 1.9 * (0.55 + 0.7 * vuln) * (plan.reserves ? 0.62 : 1), 0, 100);

  const costINR = areaHa * (
    (s > 0 ? 1800 * s * 3 : 0) + (plan.sowingShift > 0 ? 300 : 0) + (plan.awd ? 900 : 0) +
    (plan.protectWater ? 2500 : 0) + (plan.reserves ? 1500 : 0));
  const revenue = areaHa * ((1 - s) * r1.yieldTHa * CROPS[plan.crop].pricePerTonne + s * r2.yieldTHa * CROPS[plan.altCrop].pricePerTonne) * awdYield;
  const cultivation = areaHa * ((1 - s) * CROPS[plan.crop].costPerHa + s * CROPS[plan.altCrop].costPerHa);
  const netIncome = revenue - cultivation - costINR;

  return { risk, factors, yieldTHa, productionT, potentialT, lossT, waterML, foodExposure, netIncome, costINR };
}

/* ---------------------------- Optimiser ---------------------------- */

export type Objective = 'food' | 'water' | 'risk' | 'income' | 'resilience';
export const OBJECTIVES: { id: Objective; label: string; hint: string }[] = [
  { id: 'resilience', label: 'Maximum food-security resilience', hint: 'Balances crop risk and community food exposure' },
  { id: 'risk', label: 'Minimum crop risk', hint: 'Lowest modelled probability of severe yield loss' },
  { id: 'food', label: 'Maximum food production', hint: 'Highest expected tonnes harvested' },
  { id: 'water', label: 'Minimum water use', hint: 'Lowest irrigation draw on reservoirs' },
  { id: 'income', label: 'Maximum farmer income', hint: 'Highest expected net farm income' },
];

export function objectiveScore(o: PlanOutcome, obj: Objective, base: PlanOutcome, complexity: number): number {
  const c = complexity * 1.2; // prefer simpler plans when gains are similar
  switch (obj) {
    case 'risk': return o.risk + c;
    case 'food': return -(o.productionT / Math.max(1, base.productionT)) * 100 + o.risk * 0.08 + c * 0.4;
    case 'water': return (o.waterML / Math.max(1, base.waterML)) * 100 + o.risk * 0.12 + c * 0.4;
    case 'income': return -(o.netIncome / Math.max(1, Math.abs(base.netIncome))) * 100 + o.risk * 0.05 + c * 0.4;
    case 'resilience': return 0.55 * o.risk + 0.45 * o.foodExposure + c;
  }
}

export function planComplexity(pl: Plan) {
  return (pl.diversify > 0 ? 1 : 0) + (pl.sowingShift > 0 ? 1 : 0) + (pl.awd ? 1 : 0) + (pl.protectWater ? 1 : 0) + (pl.reserves ? 1 : 0);
}

/** Exhaustive search over a small, explainable intervention space (≈200 plans, <2 ms). */
export function optimise(p: ScenarioParams, crop: CropId, areaHa: number, obj: Objective, d?: District): { plan: Plan; outcome: PlanOutcome } {
  const start = basePlan(crop);
  const base = evaluatePlan(p, start, areaHa, d);
  let best = { plan: start, outcome: base, score: objectiveScore(base, obj, base, 0) };
  // Policy constraint: recommendations keep ≥50% of the staple acreage (food supply + livelihoods).
  const shares = crop === 'millet' ? [0, 0.3] : [0, 0.15, 0.3, 0.5];
  for (const diversify of shares)
    for (const sowingShift of [0, 2])
      for (const awd of [false, true])
        for (const protectWater of [false, true])
          for (const reserves of [false, true]) {
            const plan: Plan = { ...start, diversify, sowingShift, awd, protectWater, reserves };
            const cx = planComplexity(plan);
            if (cx > 4) continue;
            const outcome = evaluatePlan(p, plan, areaHa, d);
            const score = objectiveScore(outcome, obj, base, cx);
            if (score < best.score - 1e-9) best = { plan, outcome, score };
          }
  return { plan: best.plan, outcome: best.outcome };
}

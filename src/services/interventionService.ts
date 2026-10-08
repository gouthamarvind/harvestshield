/**
 * interventionService — intervention catalogue, modelled effects and response-plan aggregation.
 * Effects are computed by re-running the plan model, never hard-coded.
 */
import type { CropId } from '../data/crops';
import type { District } from '../data/districts';
import type { ScenarioParams } from '../data/scenarios';
import { basePlan, evaluatePlan, optimise, type Plan } from '../model/plan';
import type { DistrictRisk } from './cropRiskService';

export type InterventionId = 'diversify' | 'delay' | 'awd' | 'protect' | 'switch' | 'reserves';
export type Level = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Intervention {
  id: InterventionId;
  name: string;
  short: string;
  description: string;
  category: 'Agronomic' | 'Water' | 'Food system';
  cost: Level;
  complexity: Level;
  confidence: number;
  urgencyDays: number;
  owner: string;
  patch: Partial<Plan>;
  /** Exceeds the staple-retention guardrail (keeps ≥50% staple acreage); shown but ranked last. */
  guardrail?: boolean;
}

export const INTERVENTIONS: Intervention[] = [
  { id: 'diversify', name: 'Diversify crops', short: 'Diversify 30%', description: 'Shift 30% of rice acreage to millet; freed water protects the remaining paddy.', category: 'Agronomic', cost: 'LOW', complexity: 'MEDIUM', confidence: 0.78, urgencyDays: 7, owner: 'Agriculture Dept · FPOs', patch: { diversify: 0.3 } },
  { id: 'delay', name: 'Delay sowing', short: 'Delay 2 weeks', description: 'Align nursery and transplanting with the north-east monsoon onset window.', category: 'Agronomic', cost: 'LOW', complexity: 'LOW', confidence: 0.64, urgencyDays: 10, owner: 'Extension officers', patch: { sowingShift: 2 } },
  { id: 'awd', name: 'Reduce irrigation', short: 'AWD irrigation', description: 'Alternate wetting & drying cuts paddy water demand ~22% with minimal yield penalty.', category: 'Water', cost: 'LOW', complexity: 'MEDIUM', confidence: 0.72, urgencyDays: 14, owner: 'Farmers · WUAs', patch: { awd: true } },
  { id: 'protect', name: 'Protect water allocation', short: 'Protect allocation', description: 'Ring-fence a minimum agricultural release from reservoirs for critical crop stages.', category: 'Water', cost: 'MEDIUM', complexity: 'HIGH', confidence: 0.69, urgencyDays: 5, owner: 'WRD · District Collector', patch: { protectWater: true } },
  { id: 'switch', name: 'Change crop', short: 'Switch to millet', description: 'Full switch to millet for the season. Large risk reduction, but affects staple supply.', category: 'Agronomic', cost: 'MEDIUM', complexity: 'HIGH', confidence: 0.74, urgencyDays: 7, owner: 'Farmers · Agriculture Dept', patch: { diversify: 1 }, guardrail: true },
  { id: 'reserves', name: 'Increase food reserves', short: 'Pre-position reserves', description: 'Pre-position PDS grain stocks in exposed blocks before the lean season.', category: 'Food system', cost: 'MEDIUM', complexity: 'MEDIUM', confidence: 0.82, urgencyDays: 21, owner: 'Civil Supplies · NGOs', patch: { reserves: true } },
];
export const interventionById = (id: InterventionId) => INTERVENTIONS.find((i) => i.id === id)!;
export const COST_INR_PER_HA: Record<InterventionId, number> = { diversify: 1620, delay: 300, awd: 900, protect: 2500, switch: 5400, reserves: 1500 };

export function applyInterventions(plan: Plan, ids: InterventionId[]): Plan {
  let next = { ...plan };
  for (const id of ids) next = { ...next, ...interventionById(id).patch };
  if (ids.includes('switch')) next.diversify = 1;
  return next;
}

export interface InterventionEffect {
  id: InterventionId;
  riskBefore: number; riskAfter: number; riskReduction: number; riskReductionPct: number;
  waterSavingPct: number; foodExposureReduction: number; productionChangePct: number;
}

export function interventionEffect(p: ScenarioParams, d: District, crop: CropId, areaHa: number, id: InterventionId, from: Plan = basePlan(crop)): InterventionEffect {
  const before = evaluatePlan(p, from, areaHa, d);
  const after = evaluatePlan(p, applyInterventions(from, [id]), areaHa, d);
  return {
    id,
    riskBefore: before.risk, riskAfter: after.risk,
    riskReduction: before.risk - after.risk,
    riskReductionPct: ((before.risk - after.risk) / before.risk) * 100,
    waterSavingPct: ((before.waterML - after.waterML) / before.waterML) * 100,
    foodExposureReduction: before.foodExposure - after.foodExposure,
    productionChangePct: ((after.productionT - before.productionT) / before.productionT) * 100,
  };
}

export interface ResponsePlanSummary { count: number; riskReductionPct: number; waterSavingsPct: number; foodExposureReduction: number; costINR: number; riskBefore: number; riskAfter: number }

/** Aggregate effect of a response plan across the top-risk districts (area-weighted). */
export function summarisePlan(p: ScenarioParams, targets: DistrictRisk[], ids: InterventionId[]): ResponsePlanSummary {
  let wBefore = 0, wAfter = 0, waterB = 0, waterA = 0, foodB = 0, foodA = 0, cost = 0, area = 0;
  for (const t of targets) {
    const ha = t.district.monitoredHa;
    const base = basePlan(t.primary);
    const b = evaluatePlan(p, base, ha, t.district);
    const a = evaluatePlan(p, applyInterventions(base, ids), ha, t.district);
    wBefore += b.risk * ha; wAfter += a.risk * ha; waterB += b.waterML; waterA += a.waterML;
    foodB += b.foodExposure * ha; foodA += a.foodExposure * ha; area += ha;
    cost += ids.reduce((s, id) => s + COST_INR_PER_HA[id] * ha, 0);
  }
  const rb = wBefore / area, ra = wAfter / area;
  return {
    count: ids.length, riskBefore: rb, riskAfter: ra,
    riskReductionPct: ids.length ? ((rb - ra) / rb) * 100 : 0,
    waterSavingsPct: ids.length ? ((waterB - waterA) / waterB) * 100 : 0,
    foodExposureReduction: (foodB - foodA) / area,
    costINR: cost,
  };
}

/** Share of current risk that the best constrained plan can prevent (area-weighted across districts). */
export function preventableRisk(p: ScenarioParams, risks: DistrictRisk[]): number {
  let before = 0, after = 0;
  for (const r of risks) {
    const ha = r.district.monitoredHa;
    const b = evaluatePlan(p, basePlan(r.primary), ha, r.district);
    const o = optimise(p, r.primary, ha, 'risk', r.district).outcome;
    before += b.risk * ha; after += o.risk * ha;
  }
  return before > 0 ? ((before - after) / before) * 100 * 0.62 : 0; // 0.62 = assumed adoption rate within the season
}

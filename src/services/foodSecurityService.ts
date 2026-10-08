/**
 * foodSecurityService — translates crop loss into food-system exposure (SDG 2).
 * Production: PDS offtake, FCI/TNCSC stock positions, market arrivals and household vulnerability surveys.
 */
import type { DistrictRisk } from './cropRiskService';
import { clamp } from '../lib/format';

export type SignalLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export function signalLevel(v: number): SignalLevel {
  if (v >= 70) return 'CRITICAL';
  if (v >= 48) return 'HIGH';
  if (v >= 18) return 'MEDIUM';
  return 'LOW';
}

export interface FoodSecurity {
  productionLossT: number;
  supplyExposurePct: number;
  reserveDays: number;
  vulnerablePopulation: number;
  index: number;
  level: SignalLevel;
  supplyDemand: { district: string; supply: number; demand: number }[];
  flows: { climate: number; cropLoss: number; supplyGap: number; exposed: number };
}

export function getFoodSecurity(risks: DistrictRisk[], reservesBoost = 0): FoodSecurity {
  const pop = risks.reduce((s, r) => s + r.district.populationLakh, 0);
  const prod = risks.reduce((s, r) => s + r.monitoredProductionT, 0);
  const loss = risks.reduce((s, r) => s + r.productionAtRiskT, 0);
  const lossFrac = loss / prod;
  const index = risks.reduce((s, r) => s + r.foodExposure * r.district.populationLakh, 0) / pop;
  const vulnerable = risks.reduce((s, r) => s + r.district.populationLakh * 1e5 * (r.foodExposure / 100) * r.district.vulnerability * 0.03, 0);
  const reserveDays = clamp(Math.round(52 - index * 0.6 + reservesBoost), 6, 60);
  const top = [...risks].sort((a, b) => b.district.populationLakh * b.foodExposure - a.district.populationLakh * a.foodExposure).slice(0, 8);
  return {
    productionLossT: loss,
    supplyExposurePct: lossFrac * 100 * 0.45,
    reserveDays,
    vulnerablePopulation: vulnerable,
    index,
    level: signalLevel(index),
    supplyDemand: top.map((r) => ({ district: r.district.name, demand: 100, supply: +(100 + 8 - r.foodExposure * 0.55).toFixed(1) })),
    flows: { climate: 100, cropLoss: lossFrac * 100, supplyGap: lossFrac * 100 * 0.45, exposed: index },
  };
}

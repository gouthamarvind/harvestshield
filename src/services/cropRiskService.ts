/**
 * cropRiskService — district & crop-level risk from the active scenario.
 * Production: replace the heuristic in model/risk.ts with a validated model; keep these return shapes.
 */
import { CROPS, CROP_IDS, type CropId } from '../data/crops';
import { DISTRICTS, cropLabel, primaryCrop, type District } from '../data/districts';
import type { ScenarioParams } from '../data/scenarios';
import { blendFactors, cropRisk, type Factor } from '../model/risk';
import { clamp } from '../lib/format';
import { localize } from '../model/localize';

export const exposureOf = (d: District) => ({ irrigation: d.irrigation, coastal: d.coastal, heat: d.heat, rain: d.rain });

export interface DistrictRisk {
  district: District;
  score: number;
  factors: Factor[];
  primary: CropId;
  cropLabel: string;
  /** Area-weighted yield change vs normal, %. */
  yieldChange: number;
  waterStress: number;
  waterAvailability: number;
  foodExposure: number;
  rainfallAnomaly: number;
  temperatureAnomaly: number;
  populationVulnerability: number;
  /** Production at risk in the monitored pilot area, t. */
  productionAtRiskT: number;
  monitoredProductionT: number;
}

export function districtRisk(p0: ScenarioParams, d: District): DistrictRisk {
  const { p, exp } = localize(p0, d);
  const parts = CROP_IDS.filter((c) => d.mix[c] > 0).map((c) => ({ c, w: d.mix[c], r: cropRisk(p, c, exp), n: cropRisk({ enso: 0, rainfall: 0, temperature: 0, water: 90 }, c, exp) }));
  const weighted = parts.reduce((s, x) => s + x.w * x.r.score, 0);
  // Socio-economic vulnerability amplifies agronomic risk at district scale.
  const score = clamp(weighted * 1.04 + d.vulnerability * 5, 2, 98);
  const factors = blendFactors(parts.map((x) => ({ factors: x.r.factors, weight: x.w * 1.04 })));
  const yNow = parts.reduce((s, x) => s + x.w * x.r.yieldTHa, 0);
  const yNorm = parts.reduce((s, x) => s + x.w * x.n.yieldTHa, 0);
  const yieldChange = (yNow / yNorm - 1) * 100;
  const waterStress = clamp(((90 - p.water) + Math.max(0, -p.rainfall * exp.rain) * 0.8) * (0.6 + 0.5 * d.irrigation) + Math.max(0, p.temperature) * exp.heat * 4, 0, 100);
  const foodExposure = clamp(-yieldChange * 1.9 * (0.55 + 0.7 * d.vulnerability) + d.coastal * 4 * Math.max(0, p.enso), 0, 100);
  return {
    district: d, score, factors, primary: primaryCrop(d), cropLabel: cropLabel(d), yieldChange, waterStress,
    waterAvailability: clamp(p.water * (1.08 - d.irrigation * 0.2), 0, 100),
    foodExposure,
    rainfallAnomaly: p.rainfall * exp.rain,
    temperatureAnomaly: p.temperature * exp.heat,
    populationVulnerability: d.vulnerability * 100,
    productionAtRiskT: d.monitoredHa * (yNorm - yNow),
    monitoredProductionT: d.monitoredHa * yNorm,
  };
}

export function allDistrictRisks(p: ScenarioParams): DistrictRisk[] {
  return DISTRICTS.map((d) => districtRisk(p, d)).sort((a, b) => b.score - a.score);
}

export interface StateSummary {
  cropRisk: number;
  waterStress: number;
  foodRisk: number;
  criticalDistricts: number;
  productionAtRiskT: number;
  monitoredHa: number;
  preventableRisk: number;
}

export function stateSummary(_p: ScenarioParams, risks: DistrictRisk[], preventableRisk: number): StateSummary {
  const ha = risks.reduce((s, r) => s + r.district.monitoredHa, 0);
  const w = (f: (r: DistrictRisk) => number) => risks.reduce((s, r) => s + f(r) * r.district.monitoredHa, 0) / ha;
  return {
    cropRisk: w((r) => r.score),
    waterStress: w((r) => r.waterStress),
    foodRisk: w((r) => r.foodExposure),
    criticalDistricts: risks.filter((r) => r.score >= 70).length,
    productionAtRiskT: risks.reduce((s, r) => s + r.productionAtRiskT, 0),
    monitoredHa: ha,
    preventableRisk,
  };
}

export interface CropComparison {
  crop: CropId; name: string; risk: number; climateSensitivity: number; waterRequirement: number;
  expectedYield: number; yieldChange: number; resilience: number; factors: Factor[];
}

/** Compare all crops for one district's exposure under the scenario. */
export function compareCrops(p0: ScenarioParams, d: District): CropComparison[] {
  const { p, exp } = localize(p0, d);
  return CROP_IDS.map((c) => {
    const r = cropRisk(p, c, exp);
    const n = cropRisk({ enso: 0, rainfall: 0, temperature: 0, water: 90 }, c, exp);
    const pr = CROPS[c];
    const sens = (pr.rainSensitivity * 0.45 + pr.heatSensitivity * 0.3 + pr.ensoSensitivity * 0.25) * 100;
    return {
      crop: c, name: pr.name, risk: r.score, climateSensitivity: sens, waterRequirement: pr.waterNeed * 100,
      expectedYield: r.yieldTHa, yieldChange: (r.yieldTHa / n.yieldTHa - 1) * 100,
      resilience: clamp(100 - r.score * 0.7 - pr.waterNeed * 25, 0, 100), factors: r.factors,
    };
  });
}

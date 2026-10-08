/**
 * Crop response profiles used by the prototype heuristic model.
 * Sensitivities are relative (0–1, rice = reference). Illustrative — not calibrated agronomic coefficients.
 */
export type CropId = 'rice' | 'maize' | 'millet' | 'groundnut' | 'sorghum';

export interface CropProfile {
  id: CropId;
  name: string;
  tamil: string;
  /** Relative seasonal water requirement (rice = 1). */
  waterNeed: number;
  /** Typical seasonal crop water use, mm. */
  waterMm: number;
  rainSensitivity: number;
  heatSensitivity: number;
  ensoSensitivity: number;
  /** Intrinsic physiological sensitivity points added at full stress. */
  intrinsic: number;
  /** Normal-season yield, t/ha. */
  baseYield: number;
  /** Farm-gate reference price, ₹ per tonne (MSP-referenced, illustrative). */
  pricePerTonne: number;
  /** Cultivation cost, ₹ per ha (illustrative). */
  costPerHa: number;
  /** Relative kcal per tonne vs rice. */
  nutrition: number;
  color: string;
}

export const CROPS: Record<CropId, CropProfile> = {
  rice: { id: 'rice', name: 'Rice', tamil: 'நெல்', waterNeed: 1, waterMm: 1250, rainSensitivity: 1, heatSensitivity: 1, ensoSensitivity: 1, intrinsic: 5, baseYield: 4.2, pricePerTonne: 23000, costPerHa: 52000, nutrition: 1, color: '#4FE3F0' },
  maize: { id: 'maize', name: 'Maize', tamil: 'மக்காச்சோளம்', waterNeed: 0.55, waterMm: 650, rainSensitivity: 0.62, heatSensitivity: 0.8, ensoSensitivity: 0.7, intrinsic: 3.5, baseYield: 5.2, pricePerTonne: 22250, costPerHa: 42000, nutrition: 1.03, color: '#C6F432' },
  millet: { id: 'millet', name: 'Millet', tamil: 'சிறுதானியம்', waterNeed: 0.26, waterMm: 380, rainSensitivity: 0.3, heatSensitivity: 0.34, ensoSensitivity: 0.4, intrinsic: 1, baseYield: 2.4, pricePerTonne: 31000, costPerHa: 24000, nutrition: 1.06, color: '#3DF58A' },
  groundnut: { id: 'groundnut', name: 'Groundnut', tamil: 'நிலக்கடலை', waterNeed: 0.42, waterMm: 520, rainSensitivity: 0.56, heatSensitivity: 0.6, ensoSensitivity: 0.6, intrinsic: 2.5, baseYield: 2.1, pricePerTonne: 67800, costPerHa: 61000, nutrition: 1.6, color: '#F5B83D' },
  sorghum: { id: 'sorghum', name: 'Sorghum', tamil: 'சோளம்', waterNeed: 0.32, waterMm: 450, rainSensitivity: 0.36, heatSensitivity: 0.4, ensoSensitivity: 0.45, intrinsic: 1.5, baseYield: 2.6, pricePerTonne: 33700, costPerHa: 27000, nutrition: 0.98, color: '#A78BFA' },
};
export const CROP_IDS = Object.keys(CROPS) as CropId[];

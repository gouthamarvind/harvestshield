/** Scenario presets drive every view. Values are illustrative demo inputs, not forecasts. */
export interface ScenarioParams {
  /** Oceanic Niño Index style anomaly (°C). */
  enso: number;
  /** Seasonal rainfall anomaly vs long-period average, %. */
  rainfall: number;
  /** Mean temperature anomaly, °C. */
  temperature: number;
  /** Reservoir / irrigation water availability, % of normal storage. */
  water: number;
}

export type PresetId = 'normal' | 'moderate' | 'strong' | 'extreme-water' | 'recovery';

export interface ScenarioPreset {
  id: PresetId;
  name: string;
  short: string;
  description: string;
  params: ScenarioParams;
}

export const PRESETS: ScenarioPreset[] = [
  { id: 'normal', name: 'Normal Conditions', short: 'Normal', description: 'ENSO-neutral season with near-average monsoon.', params: { enso: 0.2, rainfall: 3, temperature: 0.3, water: 84 } },
  { id: 'moderate', name: 'Moderate El Niño', short: 'Moderate', description: 'Weak-to-moderate warm phase; modest monsoon deficit.', params: { enso: 1.1, rainfall: -9, temperature: 0.8, water: 63 } },
  { id: 'strong', name: 'Strong El Niño', short: 'Strong', description: 'Strong warm phase similar to 2015–16; significant rainfall deficit.', params: { enso: 1.7, rainfall: -18, temperature: 1.4, water: 45 } },
  { id: 'extreme-water', name: 'Extreme Water Stress', short: 'Extreme', description: 'Very strong event compounding a failed monsoon and depleted reservoirs.', params: { enso: 2.2, rainfall: -29, temperature: 1.9, water: 27 } },
  { id: 'recovery', name: 'Recovery Scenario', short: 'Recovery', description: 'ENSO decaying toward neutral; reservoirs partially refilling.', params: { enso: 0.6, rainfall: -4, temperature: 0.6, water: 69 } },
];

export const presetById = (id: PresetId) => PRESETS.find((p) => p.id === id)!;

export function ensoLabel(v: number) {
  if (v >= 2) return 'VERY STRONG';
  if (v >= 1.5) return 'STRONG';
  if (v >= 1) return 'MODERATE';
  if (v >= 0.5) return 'WEAK';
  if (v > -0.5) return 'NEUTRAL';
  return 'LA NIÑA';
}

import { WEATHER } from '../data/observed';

export type Quality = 'HIGH' | 'MEDIUM' | 'LOW';
export interface DataQuality { level: Quality; reason: string; ta: string }

const TA: Record<Quality, string> = { HIGH: 'அதிகம்', MEDIUM: 'நடுத்தரம்', LOW: 'குறைவு' };

/**
 * Data-quality rating from provenance. This is NOT a statistical confidence:
 * it says which inputs are observed rather than assumed.
 */
export function dataQuality(districtId: string, observedMode: boolean): DataQuality {
  if (!observedMode) return { level: 'LOW', reason: 'Scenario input, not an observation', ta: TA.LOW };
  if (WEATHER?.districts?.[districtId]) return { level: 'HIGH', reason: 'Observed district rainfall and temperature (NASA POWER) with NOAA ONI', ta: TA.HIGH };
  if (WEATHER) return { level: 'MEDIUM', reason: 'State-level observed anomaly; district value unavailable', ta: TA.MEDIUM };
  return { level: 'LOW', reason: 'No observed weather loaded. Run npm run fetch:climate', ta: TA.LOW };
}

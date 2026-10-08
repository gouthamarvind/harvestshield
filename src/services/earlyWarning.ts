/**
 * earlyWarning — transparent rule-based early-warning levels for El Niño-linked threats.
 * Inputs are REAL observations (NOAA ONI, NASA POWER season-to-date anomalies) when available.
 * Every rule is listed in RULES so a reviewer can read exactly why a level was raised.
 */
import { ONI, WEATHER } from '../data/observed';

export type WarningLevel = 'NORMAL' | 'WATCH' | 'WARNING' | 'SEVERE';

export interface Rule { level: WarningLevel; when: string; meaning: string }

export const RULES: Rule[] = [
  { level: 'WATCH', when: 'ONI ≥ +0.5 °C', meaning: 'El Niño conditions are emerging. Start preparedness and check seed and fertiliser stocks.' },
  { level: 'WARNING', when: 'ONI ≥ +1.0 °C and season rainfall ≤ −10%', meaning: 'Moderate El Niño is confirmed in observed rainfall. Issue sowing advisories and pre-position reserves.' },
  { level: 'SEVERE', when: 'ONI ≥ +1.5 °C and (rainfall ≤ −20% or temperature ≥ +1.5 °C)', meaning: 'Strong El Niño with a serious deficit. Activate district contingency plans.' },
];

export interface SowingWindow { crop: string; start: string; end: string; startMonth: number; endMonth: number }

/** Tamil Nadu sowing windows (Kharif = Jun–Sep, Rabi = Oct–Dec, mainly rice and millets). */
export const SOWING_WINDOWS: SowingWindow[] = [
  { crop: 'Samba rice (main Kharif)', start: 'Jun 15', end: 'Jul 31', startMonth: 6, endMonth: 7 },
  { crop: 'Rabi rice / pulses', start: 'Oct 1', end: 'Nov 15', startMonth: 10, endMonth: 11 },
  { crop: 'Summer millets', start: 'Feb 1', end: 'Mar 31', startMonth: 2, endMonth: 3 },
];

export interface WarningStatus {
  level: WarningLevel;
  oni: number;
  rainAnomPct: number | null;
  tempAnomC: number | null;
  reasons: string[];
  nextWindow: { crop: string; start: string; daysAway: number; open: boolean };
  actions: string[];
  asOf: string;
}

const ACTIONS: Record<WarningLevel, string[]> = {
  NORMAL: ['Continue routine monitoring of the NOAA ONI each month.'],
  WATCH: ['Check seed, fertiliser and diesel stocks at PACS and KVK centres.', 'Brief district agriculture officers on the rule set.'],
  WARNING: ['Issue sowing advisories: prefer short-duration varieties and drought-tolerant millets.', 'Advise farmers with canal-tail or rainfed land to delay sowing until rainfall is confirmed.', 'Pre-position PDS and seed reserves in the most exposed blocks.'],
  SEVERE: ['Activate the district contingency plan and convene the District Disaster Management Committee.', 'Enable crop insurance and contingency-crop seed release.', 'Protect drinking water and livestock fodder in deficit blocks.'],
};

const rank: Record<WarningLevel, number> = { NORMAL: 0, WATCH: 1, WARNING: 2, SEVERE: 3 };

/** Next sowing window after a reference date (defaults to today). */
export function nextSowing(ref: Date = new Date()): WarningStatus['nextWindow'] {
  let best: { w: SowingWindow; days: number; open: boolean } | null = null;
  for (const w of SOWING_WINDOWS) {
    const year = ref.getFullYear();
    const start = new Date(year, w.startMonth - 1, 1);
    const end = new Date(year, w.endMonth, 0);
    const open = ref >= start && ref <= end;
    let next = open ? ref : start;
    if (!open && ref > end) next = new Date(year + 1, w.startMonth - 1, 1);
    const days = open ? 0 : Math.round((next.getTime() - ref.getTime()) / 86400000);
    if (!best || days < best.days) best = { w, days, open };
  }
  return best ? { crop: best.w.crop, start: best.w.start, daysAway: best.days, open: best.open } : { crop: '—', start: '—', daysAway: 0, open: false };
}

export function getWarningStatus(ref: Date = new Date()): WarningStatus {
  const oni = ONI.latest.value;
  const rain = WEATHER?.state?.rainAnomPct ?? null;
  const temp = WEATHER?.state?.tempAnomC ?? null;
  const reasons: string[] = [];
  let level: WarningLevel = 'NORMAL';
  const raise = (l: WarningLevel) => { if (rank[l] > rank[level]) level = l; };

  if (oni >= 0.5) { raise('WATCH'); reasons.push(`ONI ${oni >= 0 ? '+' : ''}${oni.toFixed(2)} °C is at or above +0.5 °C.`); }
  if (oni >= 1.0 && rain != null && rain <= -10) { raise('WARNING'); reasons.push(`Season rainfall is ${rain.toFixed(0)}% against normal (threshold −10%).`); }
  if (oni >= 1.5 && ((rain != null && rain <= -20) || (temp != null && temp >= 1.5))) { raise('SEVERE'); reasons.push('Strong El Niño combined with a severe rainfall deficit or heat anomaly.'); }
  if (reasons.length === 0) reasons.push('No early-warning rule is met by the current observations.');

  return {
    level, oni, rainAnomPct: rain, tempAnomC: temp, reasons,
    nextWindow: nextSowing(ref), actions: ACTIONS[level],
    asOf: WEATHER?.windowEnd ?? ONI.latest.year.toString(),
  };
}

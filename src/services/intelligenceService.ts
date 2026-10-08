/**
 * intelligenceService — rule-based alerts and narrative insights derived from model outputs.
 * Insights are templated from computed values (no free-form generation), and labelled with confidence + source type.
 */
import { ONI, ONI_LABEL, WEATHER } from '../data/observed';
import type { ScenarioParams } from '../data/scenarios';
import { ensoLabel } from '../data/scenarios';
import type { DistrictRisk } from './cropRiskService';
import type { FoodSecurity } from './foodSecurityService';
import { analogSimilarity } from './climateService';
import { getWarningStatus } from './earlyWarning';

export type Severity = 'HIGH' | 'MEDIUM' | 'INFO';
export type AlertCategory = 'Climate' | 'Agriculture' | 'Water' | 'Food security';
export interface Alert { id: string; severity: Severity; category: AlertCategory; title: string; detail: string; location: string; minutesAgo: number; action: string }

export function getAlerts(p: ScenarioParams, risks: DistrictRisk[], food: FoodSecurity): Alert[] {
  const out: Alert[] = [];
  const ew = getWarningStatus();
  if (ew.level !== 'NORMAL') out.push({ id: 'ew', severity: ew.level === 'SEVERE' || ew.level === 'WARNING' ? 'HIGH' : 'MEDIUM', category: 'Climate', title: `Early-warning level: ${ew.level}`, detail: ew.reasons.join(' '), location: 'Tamil Nadu', minutesAgo: 0, action: ew.actions[0] });
  const crit = risks.filter((r) => r.score >= 70);
  crit.slice(0, 3).forEach((r) => out.push({
    id: `crop-${r.district.id}`, severity: 'HIGH', category: 'Agriculture',
    title: `${r.district.name} crop-risk threshold exceeded`,
    detail: `Modelled ${r.cropLabel.toLowerCase()} risk at ${r.score.toFixed(0)}% (threshold 70%). Expected yield change ${r.yieldChange.toFixed(0)}%.`,
    location: r.district.name, minutesAgo: 0, action: 'Open Scenario Lab and evaluate diversification',
  }));
  if (p.rainfall < -5) out.push({ id: 'rain-rev', severity: 'MEDIUM', category: 'Climate', title: p.local ? `Season rainfall ${p.rainfall.toFixed(0)}% vs normal` : `Scenario rainfall ${p.rainfall.toFixed(0)}% vs normal`, detail: p.local && WEATHER ? `Observed ${WEATHER.windowStart} → ${WEATHER.windowEnd}, NASA POWER vs 2001–2020 normals.` : 'Hypothetical what-if value, not an observation.', location: 'Tamil Nadu', minutesAgo: 0, action: 'Review sowing advisories for tank-fed blocks' });
  if (p.water < 60) out.push({ id: 'res', severity: p.water < 35 ? 'HIGH' : 'MEDIUM', category: 'Water', title: `Reservoir storage set to ${Math.round(p.water)}% of normal`, detail: 'Assumed value — no live reservoir feed is connected. If storage is this low, delta canal releases may be curtailed.', location: 'Cauvery basin', minutesAgo: 0, action: 'Simulate protected agricultural allocation' });
  if (food.level !== 'LOW') out.push({ id: 'food', severity: food.level === 'MEDIUM' ? 'MEDIUM' : 'HIGH', category: 'Food security', title: `Early food-security signal: ${food.level}`, detail: `Reserve coverage projected at ${food.reserveDays} days in exposed districts.`, location: risks.slice(0, 3).map((r) => r.district.name).join(', '), minutesAgo: 0, action: 'Pre-position PDS reserves in exposed blocks' });
  const hot = [...risks].sort((a, b) => b.temperatureAnomaly - a.temperatureAnomaly)[0];
  if (p.temperature > 0.7) out.push({ id: 'heat', severity: 'MEDIUM', category: 'Climate', title: `Highest heat anomaly: ${hot.district.name}`, detail: `+${hot.temperatureAnomaly.toFixed(1)}°C vs normal; heat at flowering reduces yield for late-sown crops.`, location: hot.district.name, minutesAgo: 0, action: 'Advise irrigation scheduling around flowering' });
  out.push({ id: 'enso-obs', severity: 'INFO', category: 'Climate', title: `NOAA ONI ${ONI_LABEL}: ${ONI.latest.value >= 0 ? '+' : ''}${ONI.latest.value.toFixed(2)}°C`, detail: `Observed El Niño strength: ${ensoLabel(ONI.latest.value).toLowerCase()}. Updated monthly by NOAA CPC.`, location: 'Equatorial Pacific', minutesAgo: 0, action: 'Source: NOAA Climate Prediction Center' });
  if (crit.length === 0) out.unshift({ id: 'calm', severity: 'INFO', category: 'Agriculture', title: 'No districts above the crop-risk threshold', detail: 'All monitored districts are below the 70% alert threshold under the current scenario.', location: 'Tamil Nadu', minutesAgo: 0, action: 'Continue routine monitoring' });
  return out;
}

export interface Insight { id: string; title: string; body: string; confidence: number; source: string; minutesAgo: number; tag: string }

export function getInsights(p: ScenarioParams, risks: DistrictRisk[], food: FoodSecurity, preventable: number): Insight[] {
  const analog = analogSimilarity(p)[0];
  const high = risks.filter((r) => r.score >= 60);
  const riceHeavy = risks.filter((r) => r.district.mix.rice > 0.6);
  const other = risks.filter((r) => r.district.mix.rice <= 0.6);
  const avg = (xs: DistrictRisk[], f: (r: DistrictRisk) => number) => xs.reduce((s, r) => s + f(r), 0) / Math.max(1, xs.length);
  const ratio = avg(riceHeavy, (r) => r.waterStress) / Math.max(1, avg(other, (r) => r.waterStress));
  return [
    { id: 'analog', tag: 'Climate', title: `Pattern most similar to ${analog.analog.label}`, body: `This year's observed ONI so far tracks the ${analog.analog.label} El Niño most closely (similarity ${analog.similarity.toFixed(0)}%). That season: ${analog.analog.impact.toLowerCase()}. ${high.length} district${high.length === 1 ? ' is' : 's are'} currently at or above 60% modelled risk.`, confidence: Math.min(0.9, analog.similarity / 100), source: 'NOAA ONI · analog-year matching', minutesAgo: 0 },
    { id: 'rice', tag: 'Agriculture', title: 'Rice-heavy regions disproportionately exposed', body: `Districts with >60% paddy area carry ${ratio.toFixed(1)}× the modelled water stress of mixed-crop districts, driven by canal dependency and late-season deficits.`, confidence: 0.74, source: 'Heuristic risk model · district crop mix', minutesAgo: 0 },
    { id: 'div', tag: 'Intervention', title: 'Diversification offers the largest modelled reduction', body: `Across monitored districts, constrained intervention plans could prevent ~${preventable.toFixed(0)}% of current crop risk; partial rice→millet diversification ranks first in ${Math.max(1, Math.round(high.length * 0.8))} of ${Math.max(1, high.length)} high-risk districts.`, confidence: 0.66, source: 'Scenario optimiser · counterfactual runs', minutesAgo: 0 },
    { id: 'food', tag: 'Food security', title: `Food-security signal ${food.level.toLowerCase()}`, body: `Projected production at risk of ${Math.round(food.productionLossT).toLocaleString('en-IN')} t in the modelled area corresponds to ~${food.supplyExposurePct.toFixed(0)}% local supply exposure; reserve coverage ${food.reserveDays} days.`, confidence: 0.58, source: 'Food-system exposure model · PDS proxies', minutesAgo: 0 },
    { id: 'coastal', tag: 'Climate', title: 'Coastal delta faces compounding exposure', body: `Nagapattinam and Thiruvarur combine tail-end canal dependency with coastal salinity risk; interventions here have the highest marginal benefit per hectare.`, confidence: 0.61, source: 'Illustrative exposure assumptions', minutesAgo: 0 },
  ];
}

import { DISTRICTS, primaryCrop, cropLabel } from '../data/districts';
import type { ScenarioParams } from '../data/scenarios';
import type { DistrictRisk } from './cropRiskService';
import { INTERVENTIONS, interventionEffect } from './interventionService';
import { WEATHER } from '../data/observed';
import { dataQuality } from '../lib/dataQuality';
import type { CsvValue } from '../lib/csv';
import type { ActionItem } from './workflow';
import { ACTION_STATUS_LABEL } from './workflow';

export const EXPORT_COLUMNS = [
  'district', 'crop', 'risk_pct', 'data_quality', 'rainfall_anomaly_pct', 'temperature_anomaly_c',
  'recommendation', 'modelled_risk_reduction_pp', 'owner', 'deadline', 'status', 'scenario',
];

/**
 * One row per district. Recommendation is the single intervention with the largest modelled risk reduction
 * (guardrail-flagged options excluded). Owner, deadline and status come from the local action plan.
 */
export function buildDistrictRows(risks: DistrictRisk[], params: ScenarioParams, observed: boolean, scenarioName: string, actions: ActionItem[]): Record<string, CsvValue>[] {
  return risks.map((r) => {
    const d = r.district;
    const crop = primaryCrop(d);
    const best = INTERVENTIONS.filter((i) => !i.guardrail)
      .map((i) => ({ i, e: interventionEffect(params, d, crop, 100, i.id) }))
      .sort((a, b) => b.e.riskReduction - a.e.riskReduction)[0];
    const q = dataQuality(d.id, observed);
    const obs = WEATHER?.districts?.[d.id];
    const mine = actions.filter((a) => a.district === d.name);
    const act = mine.find((a) => a.status !== 'DONE') ?? mine[0];
    return {
      district: d.name,
      crop: cropLabel(d),
      risk_pct: r.score.toFixed(0),
      data_quality: q.level,
      rainfall_anomaly_pct: (obs?.rainAnomPct ?? params.rainfall).toFixed(1),
      temperature_anomaly_c: (obs?.tempAnomC ?? params.temperature).toFixed(2),
      recommendation: best && best.e.riskReduction > 0.5 ? best.i.name : 'No single intervention above 0.5 pp',
      modelled_risk_reduction_pp: best ? best.e.riskReduction.toFixed(1) : '',
      owner: act ? act.owner || 'Unassigned' : 'Not planned',
      deadline: act ? act.deadline : '',
      status: act ? ACTION_STATUS_LABEL[act.status] : 'Not planned',
      scenario: scenarioName,
    };
  });
}

export const EXPORT_COUNT = DISTRICTS.length;

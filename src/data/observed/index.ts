/**
 * Observed (real) climate inputs.
 *  - ONI: bundled NOAA snapshot (oni.ts), replaced by a fresher copy when climate.json has one.
 *  - District rainfall & temperature: climate.json, written by `npm run fetch:climate` (NASA POWER).
 *  - Seasonal history (1991–2026): seasonal.json, written by `npm run build:seasonal`.
 *  - Backtest: validation.json, written by `npm run backtest`. Shows "not run" until the pipeline has been run.
 */
import raw from './climate.json';
import seasonalRaw from './seasonal.json';
import validationRaw from './validation.json';
import { ONI_TABLE, ONI_SOURCE, latestOni, oniMonthly, seasonName } from './oni';

export interface DistrictObs {
  window: { start: string; end: string; days: number };
  rainMm: number; rainNormalMm: number; rainAnomPct: number | null;
  tempC: number | null; tempAnomC: number | null; last30RainAnomPct: number | null;
}
interface ClimateFile {
  status: 'ok' | 'pending';
  fetchedAt?: string;
  windowStart?: string;
  sources?: Record<string, string>;
  oni?: Record<string, (number | null)[]> | null;
  districts?: Record<string, DistrictObs>;
  state?: { rainAnomPct: number; tempAnomC: number; last30RainAnomPct: number; end: string };
  monthly?: { month: string; rainAnomPct: number; tempAnomC: number }[];
  failed?: string[];
}

const file = raw as ClimateFile;

/** True when real district rainfall/temperature has been fetched. */
export const HAS_WEATHER = file.status === 'ok' && !!file.state && !!file.districts && Object.keys(file.districts).length > 0;

const oniTable: Record<number, (number | null)[]> = file.oni
  ? Object.fromEntries(Object.entries(file.oni).map(([y, v]) => [Number(y), v]))
  : ONI_TABLE;

export const ONI = {
  table: oniTable,
  latest: latestOni(oniTable),
  monthly: oniMonthly(oniTable),
  source: ONI_SOURCE,
  asOf: file.oni && file.fetchedAt ? file.fetchedAt.slice(0, 10) : ONI_SOURCE.snapshot,
};
export const ONI_LABEL = `${seasonName(ONI.latest.season)} ${ONI.latest.year}`;

export const WEATHER = HAS_WEATHER
  ? {
      fetchedAt: file.fetchedAt!.slice(0, 10),
      windowStart: file.windowStart!,
      windowEnd: file.state!.end,
      state: file.state!,
      districts: file.districts!,
      monthly: file.monthly ?? [],
      failed: file.failed ?? [],
      source: file.sources?.weather ?? 'NASA POWER',
      normals: file.sources?.normals ?? 'NASA POWER climatology 2001–2020',
    }
  : null;

const fmtDate = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const WEATHER_WINDOW_LABEL = WEATHER ? `${fmtDate(WEATHER.windowStart)} – ${fmtDate(WEATHER.windowEnd)}` : '';

/* ---------- Seasonal history (scripts/build-seasonal.mjs) ---------- */

export interface SeasonalDistrict {
  complete: boolean;
  rain_mm?: number; rain_anom_pct?: number;
  t_mean?: number; temp_anom_c?: number;
  extreme_days?: number; max_dry_spell?: number;
}
export interface SeasonalFile {
  status: 'ok' | 'not_run';
  message?: string;
  generatedAt?: string;
  source?: string;
  window?: string;
  baseline?: { period: string; minCompleteYears: number; method: string };
  definitions?: { heavyRainMm: number; dryDayMm: number; completeness: string };
  latestCompleteYear?: number | null;
  districtBaseline?: Record<string, { rain_mm: number; t_mean: number; complete_years: number }>;
  years: Record<string, {
    districts_complete: number;
    state: { rain_anom_pct: number; temp_anom_c: number } | null;
    districts: Record<string, SeasonalDistrict>;
  }>;
}

export const SEASONAL = seasonalRaw as unknown as SeasonalFile;
export const HAS_SEASONAL = SEASONAL.status === 'ok';

/* ---------- Backtest (scripts/backtest.mjs) ---------- */

export interface ValidationMetrics {
  outOfSamplePairs: number; districts: number; years: number;
  pearson_r: number | null; spearman_rho: number | null;
  mae_pct: number | null; rmse_pct: number | null;
  naive_mae_pct: number | null; skill_vs_zero: number | null;
  lossYears: number; flaggedYears: number;
  lossRecall: number | null; lossPrecision: number | null;
}
export interface ValidationEvent {
  id: string; label: string; year: number;
  statewideRainAnomPct: number | null;
  districtsScored: number;
  meanObservedYieldAnomPct: number | null;
  meanPredictedYieldAnomPct: number | null;
  districtsFlagged: number;
  note: string | null;
}
export interface ValidationFile {
  status: 'ok' | 'insufficient' | 'not_run';
  message?: string;
  reason?: string;
  generatedAt?: string;
  pairs?: number; years?: number; districts?: number;
  yieldRows?: number; unpairedYieldRows?: number;
  skippedFolds?: number[];
  metrics: ValidationMetrics | null;
  events: ValidationEvent[];
  scope?: string; target?: string; predictor?: string; method?: string;
  thresholds?: { lossYearPct: number; predictedLossPct: number; minPairs: number; minYears: number; minTrendYears: number };
  limitations?: string[];
  inputs?: {
    yieldSource: { file: string; layout: string; sha256: string }[];
    yieldYearRange: [number, number] | null;
    yieldRowsTotal: number | null;
    seasonalSha256: string; seasonalWindow: string;
    seasonalBaseline: string | null; seasonalLatestYear: number | null;
  };
}

export const VALIDATION = validationRaw as unknown as ValidationFile;
export const HAS_VALIDATION = VALIDATION.status === 'ok';

/**
 * Backtest core: does the seasonal rainfall anomaly predict district rice yield anomalies?
 * Pure functions with no I/O. scripts/backtest.mjs feeds it the processed inputs.
 *
 *   Target     rice yield anomaly (%) = (observed yield − district linear trend) / trend × 100
 *   Predictor  seasonal rainfall anomaly (%), 1 Jun – 5 Oct against the 1991–2020 district mean
 *   Model      one statewide OLS line: yield anomaly = a + b × rainfall anomaly
 *   Test       leave-one-year-out. For each held-out year the district trends and the OLS line
 *              are refit without that year, and only that year's predictions are scored.
 *
 * Reports whatever the data supports. It returns status 'insufficient' instead of metrics when the
 * sample is too small. It never fills gaps.
 */
import { ols, pearson, spearman, mae, rmse, mean, round } from './stats.mjs';

export const THRESHOLDS = {
  lossYearPct: -10,        // an observed yield anomaly at or below this is a loss year
  predictedLossPct: -5,    // a predicted anomaly at or below this is flagged
  minPairs: 60,            // fewer scored district-years than this → insufficient
  minYears: 6,             // fewer distinct years than this → insufficient
  minTrendYears: 5,        // a district needs at least this many training years for a trend
};

export const EVENTS = [
  { id: 'el-nino-1997-98', label: 'El Niño season 1997–98', year: 1997 },
  { id: 'el-nino-2015-16', label: 'El Niño season 2015–16', year: 2015 },
  { id: 'el-nino-2023-24', label: 'El Niño season 2023–24', year: 2023 },
];

export const DESCRIPTION = {
  scope: 'Tests the rainfall-anomaly component of the risk model only. It does not test the water-stock, temperature, ENSO, crop-sensitivity, sowing or intervention terms.',
  target: 'Rice (paddy) district yield anomaly (%) against a per-district linear trend.',
  predictor: 'Seasonal rainfall anomaly (%) for 1 Jun – 5 Oct against the 1991–2020 district mean (NASA POWER PRECTOTCORR).',
  method: 'Leave-one-year-out. Each held-out year is scored with trends and regression refit without that year. Metrics use held-out predictions only.',
  limitations: [
    'The predictor is rainfall only. Irrigation, reservoir storage, pests, prices, input use and policy are not modelled, so they show up as unexplained error.',
    'The 1 Jun – 5 Oct window misses the north-east monsoon (Oct–Dec), which matters for Samba and Thaladi rice in parts of Tamil Nadu. Losses driven by late rain will be missed.',
    'The yield series is the district rice figure as published for each year. Source conventions for crop year and area may differ between years.',
    'The 1991–2020 baseline used for the rainfall anomaly includes the years being tested. This leaks a little information into the test; the effect is small but not zero.',
    'Trends are linear. Technology change, varietal shifts and policy changes can make the trend non-linear, which the test cannot separate from weather.',
    'Yield data ends with the source year (2015 for the ICRISAT district database). Seasons after that are not validated, and the event-season check cannot test them.',
    'No significance test is reported. With a few hundred district-years, the metrics are descriptive, not a claim of forecast accuracy.',
  ],
};

/** Joins yield rows to the seasonal rainfall anomaly for the same district and year. */
export function buildPairs(yieldRows, seasonal) {
  const pairs = [];
  let unpaired = 0;
  for (const r of yieldRows) {
    const s = seasonal?.years?.[r.year]?.districts?.[r.district];
    if (!s || !s.complete || s.rain_anom_pct == null || !Number.isFinite(r.yield_kg_ha)) { unpaired++; continue; }
    pairs.push({ district: r.district, year: r.year, y: r.yield_kg_ha, rain: s.rain_anom_pct });
  }
  return { pairs, unpaired };
}

/** Returns a function giving the trend value for a year, fitted on the rows provided. */
function fitTrend(rows) {
  const { slope, intercept } = ols(rows.map((r) => r.year), rows.map((r) => r.y));
  return (year) => intercept + slope * year;
}

function insufficient(reason, base) {
  return { status: 'insufficient', reason, ...base, metrics: null, events: [] };
}

/**
 * yieldRows: [{district, year, yield_kg_ha}] from data/processed/tn_rice_yields.json
 * seasonal:  object from data/processed/seasonal.json (years → districts → rain_anom_pct)
 */
export function runBacktest({ yieldRows, seasonal }) {
  const { pairs, unpaired } = buildPairs(yieldRows, seasonal);
  const years = [...new Set(pairs.map((p) => p.year))].sort((a, b) => a - b);
  const districts = [...new Set(pairs.map((p) => p.district))].sort();
  const base = { pairs: pairs.length, years: years.length, districts: districts.length, yieldRows: yieldRows.length, unpairedYieldRows: unpaired };

  if (pairs.length < THRESHOLDS.minPairs || years.length < THRESHOLDS.minYears) {
    return insufficient(
      `Only ${pairs.length} district-years with both yield and complete rainfall (need ${THRESHOLDS.minPairs}), across ${years.length} years (need ${THRESHOLDS.minYears}). No accuracy claim is made.`,
      base,
    );
  }

  const oof = [];
  const skippedFolds = [];
  for (const testYear of years) {
    const train = pairs.filter((p) => p.year !== testYear);
    const trends = {};
    for (const d of districts) {
      const rows = train.filter((p) => p.district === d);
      if (rows.length >= THRESHOLDS.minTrendYears) trends[d] = fitTrend(rows);
    }
    const anomaly = (p) => {
      const t = trends[p.district];
      if (!t) return null;
      const tr = t(p.year);
      return tr > 0 ? ((p.y - tr) / tr) * 100 : null;
    };
    const trainFit = train.map((p) => ({ x: p.rain, y: anomaly(p) })).filter((r) => r.y != null);
    const line = ols(trainFit.map((r) => r.x), trainFit.map((r) => r.y));
    if (!Number.isFinite(line.slope)) { skippedFolds.push(testYear); continue; }
    for (const p of pairs.filter((q) => q.year === testYear)) {
      const a = anomaly(p);
      if (a == null) continue;
      oof.push({ district: p.district, year: p.year, obs: a, pred: line.intercept + line.slope * p.rain, rain: p.rain });
    }
  }

  if (oof.length < THRESHOLDS.minPairs) {
    return insufficient(`Only ${oof.length} held-out predictions could be scored (need ${THRESHOLDS.minPairs}).`, base);
  }

  const obs = oof.map((o) => o.obs);
  const pred = oof.map((o) => o.pred);
  const zero = oof.map(() => 0);
  const lossObs = oof.map((o) => o.obs <= THRESHOLDS.lossYearPct);
  const flagged = oof.map((o) => o.pred <= THRESHOLDS.predictedLossPct);
  const lossYears = lossObs.filter(Boolean).length;
  const flaggedYears = flagged.filter(Boolean).length;
  const hits = lossObs.filter((v, i) => v && flagged[i]).length;
  const modelMae = mae(pred, obs);
  const naiveMae = mae(zero, obs);

  const metrics = {
    outOfSamplePairs: oof.length,
    districts: new Set(oof.map((o) => o.district)).size,
    years: new Set(oof.map((o) => o.year)).size,
    pearson_r: round(pearson(pred, obs), 3),
    spearman_rho: round(spearman(pred, obs), 3),
    mae_pct: round(modelMae, 1),
    rmse_pct: round(rmse(pred, obs), 1),
    naive_mae_pct: round(naiveMae, 1),
    skill_vs_zero: naiveMae > 0 ? round(1 - modelMae / naiveMae, 3) : null,
    lossYears,
    flaggedYears,
    lossRecall: lossYears ? round(hits / lossYears, 3) : null,
    lossPrecision: flaggedYears ? round(hits / flaggedYears, 3) : null,
  };

  const events = EVENTS.map((ev) => {
    const rows = oof.filter((o) => o.year === ev.year);
    const st = seasonal?.years?.[ev.year]?.state ?? null;
    return {
      id: ev.id,
      label: ev.label,
      year: ev.year,
      statewideRainAnomPct: st ? st.rain_anom_pct : null,
      districtsScored: rows.length,
      meanObservedYieldAnomPct: rows.length ? round(mean(rows.map((r) => r.obs)), 1) : null,
      meanPredictedYieldAnomPct: rows.length ? round(mean(rows.map((r) => r.pred)), 1) : null,
      districtsFlagged: rows.filter((r) => r.pred <= THRESHOLDS.predictedLossPct).length,
      note: rows.length ? null : 'No district yield data for this season in the processed dataset, so this event is not validated.',
    };
  });

  return { status: 'ok', ...base, skippedFolds, metrics, events };
}

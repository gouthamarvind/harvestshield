#!/usr/bin/env node
/**
 * backtest.mjs — runs the rainfall-anomaly backtest and writes src/data/observed/validation.json.
 *
 *   npm run backtest
 *
 * Needs data/processed/tn_rice_yields.json (npm run normalize:yields) and
 * data/processed/seasonal.json (npm run build:seasonal). Exits non-zero if either is missing or not ok.
 * An insufficient sample is written as status 'insufficient' with no metrics. It is not an error.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { runBacktest, THRESHOLDS, DESCRIPTION } from './lib/backtest-core.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const DATA = process.env.HS_DATA_ROOT || join(REPO, 'data');
const YIELDS = join(DATA, 'processed', 'tn_rice_yields.json');
const SEASONAL = join(DATA, 'processed', 'seasonal.json');
const OUT = process.env.HS_VALIDATION_OUT || join(REPO, 'src', 'data', 'observed', 'validation.json');

const fail = (msg) => { console.error(`\nERROR: ${msg}`); process.exit(1); };
function load(path, hint) {
  if (!existsSync(path)) fail(`missing ${path}. ${hint}`);
  const text = readFileSync(path, 'utf8');
  return { json: JSON.parse(text), sha256: createHash('sha256').update(text).digest('hex') };
}

const y = load(YIELDS, 'Run: npm run normalize:yields');
const s = load(SEASONAL, 'Run: npm run build:seasonal');
if (y.json.status !== 'ok') fail(`${YIELDS} has status "${y.json.status}". Re-run normalize:yields.`);
if (s.json.status !== 'ok') fail(`${SEASONAL} has status "${s.json.status}". Re-run build:seasonal.`);

const result = runBacktest({ yieldRows: y.json.rows, seasonal: s.json });
const out = {
  ...result,
  generatedAt: new Date().toISOString(),
  scope: DESCRIPTION.scope,
  target: DESCRIPTION.target,
  predictor: DESCRIPTION.predictor,
  method: DESCRIPTION.method,
  thresholds: THRESHOLDS,
  limitations: DESCRIPTION.limitations,
  inputs: {
    yieldSource: y.json.report?.files?.map((f) => ({ file: f.file, layout: f.layout, sha256: f.sha256 })) ?? [],
    yieldYearRange: y.json.coverage?.yearRange ?? null,
    yieldRowsTotal: y.json.coverage?.rows ?? null,
    seasonalSha256: s.sha256,
    seasonalWindow: s.json.window,
    seasonalBaseline: s.json.baseline?.period ?? null,
    seasonalLatestYear: s.json.latestCompleteYear ?? null,
  },
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2));

console.log(`Backtest status: ${result.status}`);
console.log(`Scored ${result.pairs} district-years (${result.districts} districts, ${result.years} years).`);
if (result.status === 'insufficient') console.log(`Insufficient: ${result.reason}`);
else {
  const m = result.metrics;
  console.log(`Out-of-sample: Pearson r ${m.pearson_r}, Spearman ${m.spearman_rho}, MAE ${m.mae_pct} pts vs ${m.naive_mae_pct} pts for trend-only (skill ${m.skill_vs_zero}).`);
  console.log(`Loss years (≤${THRESHOLDS.lossYearPct}%): ${m.lossYears}; flagged: ${m.flaggedYears}; recall ${m.lossRecall}; precision ${m.lossPrecision}.`);
}
console.log(`Written: ${OUT}`);

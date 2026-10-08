#!/usr/bin/env node
/**
 * build-seasonal.mjs — converts raw NASA POWER files into seasonal district anomalies.
 *
 *   npm run build:seasonal
 *
 * For each district and year (1991–2026) over the 1 Jun – 5 Oct window (127 days):
 *   rain_mm          total rainfall (mm), from valid days only
 *   rain_anom_pct    % difference from the 1991–2020 mean for that district
 *   t_mean           mean 2 m temperature (°C)
 *   temp_anom_c      difference from the 1991–2020 mean (°C)
 *   extreme_days     days with ≥ 64.5 mm rain
 *   max_dry_spell    longest run of days with < 1 mm rain
 * A season is only reported if ≥ 95% of its days have valid rainfall and temperature. Gaps are never filled.
 *
 * Output: src/data/observed/seasonal.json (read by the app) and data/processed/seasonal.json.
 * Fails loudly if a district has no raw data or fewer than 20 complete baseline years.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DISTRICTS } from './lib/districts.mjs';
import { parsePowerResponse, seasonMetrics, SEASON, HEAVY_RAIN_MM, DRY_DAY_MM } from './lib/power.mjs';
import { mean, round } from './lib/stats.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const DATA = process.env.HS_DATA_ROOT || join(REPO, 'data');
const RAW = join(DATA, 'raw', 'power');
const OUT_APP = process.env.HS_SEASONAL_OUT || join(REPO, 'src', 'data', 'observed', 'seasonal.json');
const OUT_PROC = join(DATA, 'processed', 'seasonal.json');
const BASE_FROM = 1991, BASE_TO = 2020, MIN_BASE_YEARS = 20;
const YEAR_FROM = 1991, YEAR_TO = 2026;

const fail = (msg) => { console.error(`\nERROR: ${msg}`); process.exit(1); };

if (!existsSync(RAW)) fail(`no raw data at ${RAW}. Run: npm run fetch:history`);

// Group raw files by district. Each file name: <id>_<start>_<end>_<retrievalDate>.json
const files = readdirSync(RAW).filter((f) => f.endsWith('.json'));
const byDistrict = {};
for (const f of files) {
  const m = f.match(/^([a-z]+)_(\d{8})_(\d{8})_(\d{8})\.json$/);
  if (!m) continue;
  (byDistrict[m[1]] ??= []).push({ file: f, stamp: m[4] });
}

const maps = {};
const sourceFiles = {};
for (const id of Object.keys(DISTRICTS)) {
  const list = (byDistrict[id] ?? []).sort((a, b) => a.stamp.localeCompare(b.stamp));
  if (list.length === 0) fail(`no raw files for ${id}. Run: npm run fetch:history`);
  const byDate = new Map();
  for (const { file } of list) {  // oldest first, so a later retrieval overrides an earlier one for the same day
    const parsed = parsePowerResponse(JSON.parse(readFileSync(join(RAW, file), 'utf8')), file);
    for (const [d, v] of parsed) byDate.set(d, v);
  }
  maps[id] = byDate;
  sourceFiles[id] = list.map((x) => x.file);
}

const years = Array.from({ length: YEAR_TO - YEAR_FROM + 1 }, (_, i) => YEAR_FROM + i);
const base = {};
const metrics = {};
for (const id of Object.keys(DISTRICTS)) {
  metrics[id] = {};
  for (const y of years) metrics[id][y] = seasonMetrics(y, maps[id]);
  const baseYears = years.filter((y) => y >= BASE_FROM && y <= BASE_TO && metrics[id][y].complete);
  if (baseYears.length < MIN_BASE_YEARS) fail(`${id}: only ${baseYears.length} complete baseline years (${BASE_FROM}–${BASE_TO}); need ${MIN_BASE_YEARS}`);
  base[id] = {
    rain_mm: round(mean(baseYears.map((y) => metrics[id][y].rain_mm)), 1),
    t_mean: round(mean(baseYears.map((y) => metrics[id][y].t_mean)), 2),
    complete_years: baseYears.length,
  };
}

const outYears = {};
for (const y of years) {
  const d = {};
  for (const id of Object.keys(DISTRICTS)) {
    const m = metrics[id][y];
    if (!m.complete) { d[id] = { complete: false }; continue; }
    d[id] = {
      complete: true,
      rain_mm: m.rain_mm,
      rain_anom_pct: round(((m.rain_mm - base[id].rain_mm) / base[id].rain_mm) * 100, 1),
      t_mean: m.t_mean,
      temp_anom_c: round(m.t_mean - base[id].t_mean, 2),
      extreme_days: m.extreme_days,
      max_dry_spell: m.max_dry_spell,
    };
  }
  const ok = Object.values(d).filter((x) => x.complete);
  outYears[y] = {
    districts_complete: ok.length,
    state: ok.length
      ? { rain_anom_pct: round(mean(ok.map((x) => x.rain_anom_pct)), 1), temp_anom_c: round(mean(ok.map((x) => x.temp_anom_c)), 2) }
      : null,
    districts: d,
  };
}

const latestComplete = years.filter((y) => outYears[y].districts_complete > 0).at(-1);
const out = {
  status: 'ok',
  generatedAt: new Date().toISOString(),
  source: 'NASA POWER daily point data: PRECTOTCORR (bias-corrected precipitation, mm/day), T2M (2 m air temperature, °C); community AG',
  window: SEASON.label,
  baseline: { period: `${BASE_FROM}–${BASE_TO}`, minCompleteYears: MIN_BASE_YEARS, method: 'Mean of complete seasons in the baseline period, per district' },
  definitions: { heavyRainMm: HEAVY_RAIN_MM, dryDayMm: DRY_DAY_MM, completeness: '≥95% valid days for both rainfall and temperature' },
  latestCompleteYear: latestComplete ?? null,
  districtBaseline: base,
  years: outYears,
  rawFiles: sourceFiles,
};
const text = JSON.stringify(out);
mkdirSync(dirname(OUT_APP), { recursive: true });
mkdirSync(dirname(OUT_PROC), { recursive: true });
writeFileSync(OUT_APP, text);
writeFileSync(OUT_PROC, JSON.stringify(out, null, 2));
const completeCount = years.reduce((s, y) => s + outYears[y].districts_complete, 0);
console.log(`Seasonal anomalies written: ${completeCount} complete district-seasons across ${years.length} years.`);
console.log(`Baseline ${BASE_FROM}–${BASE_TO}. Latest complete season: ${latestComplete ?? 'none'}.`);
console.log(`App file: ${OUT_APP}`);

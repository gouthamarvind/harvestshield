/**
 * End-to-end pipeline tests on SYNTHETIC inputs written to a temporary directory.
 * Nothing is written to data/ or src/data/observed/. Every run uses HS_DATA_ROOT and output overrides.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DISTRICTS } from '../scripts/lib/districts.mjs';
import { seasonDates } from '../scripts/lib/power.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const script = (name) => join(REPO, 'scripts', name);

function run(name, env) {
  const r = spawnSync(process.execPath, [script(name)], { env: { ...process.env, ...env }, encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
}

function makeRoot() {
  const root = mkdtempSync(join(tmpdir(), 'hs-test-'));
  for (const d of ['raw/power', 'raw/icrisat', 'processed', 'manifests']) mkdirSync(join(root, d), { recursive: true });
  return root;
}

/** Writes one SYNTHETIC POWER file per district covering 1991–2026 Jun–Oct only. Missing days are simply absent. */
function writeSyntheticPower(root, { skipDistrict = null, sparseYear = null } = {}) {
  for (const id of Object.keys(DISTRICTS)) {
    if (id === skipDistrict) continue;
    const P = {}, T = {};
    for (let y = 1991; y <= 2026; y++) {
      seasonDates(y).forEach((d, i) => {
        if (y === sparseYear && i % 2 === 0) return; // 50 % of days missing → incomplete season
        const k = d.replaceAll('-', '');
        P[k] = 2 + ((y * 3 + i * 7) % 11);            // SYNTHETIC rainfall, mm/day
        T[k] = 27 + (i % 4) * 0.5;                    // SYNTHETIC temperature, °C
      });
    }
    const json = { properties: { parameter: { PRECTOTCORR: P, T2M: T } } };
    writeFileSync(join(root, 'raw/power', `${id}_19910101_20261231_20261008.json`), JSON.stringify(json));
  }
}

function writeSyntheticYields(root, years, districtIds) {
  // Same column layout as the ICRISAT file, including the code columns that must not match.
  const header = 'Dist Code,Year,State Code,State Name,Dist Name,RICE AREA (1000 ha),RICE PRODUCTION (1000 tons),RICE YIELD (Kg per ha)';
  const row = (state, dist, y, a, p, yl) => `1,${y},${state === 'Tamil Nadu' ? 33 : 32},${state},${dist},${a},${p},${yl}`;
  const lines = [header];
  districtIds.forEach((id, di) => {
    // SYNTHETIC yields that vary by year and district (3000 kg/ha at the start). Constant yields would make
    // the correlation undefined, which is correct behaviour but tells us nothing here.
    for (const y of years) {
      const yld = 3000 + (((y - years[0]) * 3 + di) % 7) * 40;
      lines.push(row('Tamil Nadu', id.charAt(0).toUpperCase() + id.slice(1), y, 100, 300, yld));
    }
  });
  lines.push(row('Kerala', 'Thrissur', 1991, 100, 300, 3000));                 // not Tamil Nadu → ignored
  lines.push(row('Tamil Nadu', 'Atlantis', 1991, 100, 300, 3000));             // not one of the 37 → reported
  lines.push(row('Tamil Nadu', 'Chengalpattu MGR / Kancheepuram', 1991, 100, 300, 3000)); // two districts → ambiguous
  lines.push(row('Tamil Nadu', 'Madurai', 1991, '', 300, 3000));               // missing area → dropped
  lines.push(row('Tamil Nadu', 'Tanjore', 1991, 10, 500, 50000));              // implausible yield → dropped
  writeFileSync(join(root, 'raw/icrisat', 'synthetic-tn.csv'), lines.join('\n') + '\n');
}

test('build-seasonal, normalize-yields and backtest fail loudly when inputs are missing', () => {
  const root = makeRoot();
  try {
    const seasonalOut = join(root, 'app-seasonal.json');
    const validationOut = join(root, 'app-validation.json');
    const env = { HS_DATA_ROOT: root, HS_SEASONAL_OUT: seasonalOut, HS_VALIDATION_OUT: validationOut };

    const b = run('build-seasonal.mjs', env);
    assert.equal(b.code, 1);
    assert.match(b.out, /no raw files for ariyalur/);
    assert.equal(existsSync(seasonalOut), false, 'no output may be written on failure');

    const n = run('normalize-yields.mjs', env);
    assert.equal(n.code, 1);
    assert.match(n.out, /no CSV files/);

    const v = run('backtest.mjs', env);
    assert.equal(v.code, 1);
    assert.match(v.out, /missing/);
    assert.equal(existsSync(validationOut), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('build-seasonal refuses a district with no raw data', () => {
  const root = makeRoot();
  try {
    writeSyntheticPower(root, { skipDistrict: 'madurai' });
    const r = run('build-seasonal.mjs', { HS_DATA_ROOT: root, HS_SEASONAL_OUT: join(root, 'x.json') });
    assert.equal(r.code, 1);
    assert.match(r.out, /no raw files for madurai/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('SYNTHETIC end-to-end: seasonal → yields → backtest writes a valid, honest result', () => {
  const root = makeRoot();
  try {
    const years = Array.from({ length: 10 }, (_, k) => 1991 + k);
    const ids = ['ariyalur', 'thanjavur', 'madurai', 'salem', 'erode', 'vellore', 'tiruchirappalli', 'coimbatore'];
    writeSyntheticPower(root, { sparseYear: 1995 });
    writeSyntheticYields(root, years, ids);
    const seasonalOut = join(root, 'app-seasonal.json');
    const validationOut = join(root, 'app-validation.json');
    const env = { HS_DATA_ROOT: root, HS_SEASONAL_OUT: seasonalOut, HS_VALIDATION_OUT: validationOut };

    const b = run('build-seasonal.mjs', env);
    assert.equal(b.code, 0, b.out);
    const seasonal = JSON.parse(readFileSync(seasonalOut, 'utf8'));
    assert.equal(seasonal.status, 'ok');
    assert.equal(seasonal.years['1995'].districts.ariyalur.complete, false, 'a 50%-gap season must not be reported');
    assert.equal(seasonal.years['1991'].districts.ariyalur.complete, true);
    assert.equal(seasonal.years['1991'].districts.ariyalur.rain_anom_pct !== undefined, true);

    const n = run('normalize-yields.mjs', env);
    assert.equal(n.code, 0, n.out);
    const yields = JSON.parse(readFileSync(join(root, 'processed', 'tn_rice_yields.json'), 'utf8'));
    assert.equal(yields.status, 'ok');
    assert.equal(yields.coverage.rows, 80, 'eight districts × ten years kept');
    assert.equal(yields.report.notTamilNadu, 1);
    assert.equal(yields.report.unmatchedDistricts.Atlantis, 1);
    assert.equal(yields.report.missingValues, 1);
    assert.equal(yields.report.implausible, 1);
    assert.equal(yields.report.ambiguousDistricts['Chengalpattu MGR / Kancheepuram'], 1);
    assert.equal(yields.rows.find((r) => r.district === 'ariyalur' && r.year === 1991).yield_kg_ha, 3000);

    const v = run('backtest.mjs', env);
    assert.equal(v.code, 0, v.out);
    const val = JSON.parse(readFileSync(validationOut, 'utf8'));
    assert.equal(val.status, 'ok');
    // 1995 is incomplete for every district, so its eight yield rows cannot be paired. Nothing is filled in.
    assert.equal(val.pairs, 72);
    assert.equal(val.unpairedYieldRows, 8);
    assert.equal(val.years, 9);
    assert.equal(val.districts, 8);
    assert.equal(typeof val.metrics.spearman_rho, 'number');
    assert.equal(typeof val.metrics.mae_pct, 'number');
    assert.equal(val.events.length, 3);
    assert.equal(val.events[2].districtsScored, 0, '2023 has no yield data in this synthetic set');
    assert.match(val.events[2].note, /not validated/);
    assert.ok(val.scope.includes('rainfall-anomaly component of the risk model only'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

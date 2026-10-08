/**
 * SYNTHETIC inputs only. The signal is built in on purpose, so these tests check the mechanics,
 * not any real-world accuracy.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runBacktest, buildPairs, THRESHOLDS } from '../scripts/lib/backtest-core.mjs';

// Deterministic pseudo-random generator so the vectors never change between runs.
function lcg(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

function synthetic(nDistricts, years) {
  const rnd = lcg(42);
  const yieldRows = [], seasonal = { years: {} };
  for (const y of years) seasonal.years[y] = { state: null, districts: {} };
  for (let i = 0; i < nDistricts; i++) {
    const id = `synthetic-district-${i + 1}`;
    for (const y of years) {
      const rain = (rnd() * 2 - 1) * 30;               // rainfall anomaly, ±30 %
      const trend = 2000 + 100 * i + 15 * (y - years[0]);
      const noise = (rnd() * 2 - 1) * 0.01;            // ±1 % noise
      const yld = trend * (1 + 0.004 * rain + noise);  // built-in response: 0.4 % per 1 % rain
      yieldRows.push({ district: id, year: y, yield_kg_ha: Math.round(yld) });
      seasonal.years[y].districts[id] = { complete: true, rain_anom_pct: Math.round(rain * 10) / 10 };
    }
  }
  return { yieldRows, seasonal };
}

test('SYNTHETIC: backtest with a built-in signal returns metrics and positive skill', () => {
  const { yieldRows, seasonal } = synthetic(8, Array.from({ length: 10 }, (_, k) => 1991 + k));
  const r = runBacktest({ yieldRows, seasonal });
  assert.equal(r.status, 'ok');
  assert.equal(r.pairs, 80);
  assert.equal(r.years, 10);
  assert.ok(r.metrics.pearson_r > 0.8, `pearson ${r.metrics.pearson_r}`);
  assert.ok(r.metrics.skill_vs_zero > 0.5, `skill ${r.metrics.skill_vs_zero}`);
  assert.ok(r.metrics.mae_pct < r.metrics.naive_mae_pct);
  assert.equal(r.events.length, 3);
});

test('SYNTHETIC: a small sample is reported as insufficient with no metrics', () => {
  const { yieldRows, seasonal } = synthetic(3, [1991, 1992, 1993, 1994]);
  const r = runBacktest({ yieldRows, seasonal });
  assert.equal(r.status, 'insufficient');
  assert.equal(r.metrics, null);
  assert.match(r.reason, new RegExp(`need ${THRESHOLDS.minPairs}`));
});

test('SYNTHETIC: rows without a complete seasonal anomaly are not paired', () => {
  const seasonal = { years: { 2000: { districts: { a: { complete: false }, b: { complete: true, rain_anom_pct: 5 } } } } };
  const rows = [
    { district: 'a', year: 2000, yield_kg_ha: 2500 },
    { district: 'b', year: 2000, yield_kg_ha: 2600 },
    { district: 'c', year: 2000, yield_kg_ha: 2700 },
  ];
  const { pairs, unpaired } = buildPairs(rows, seasonal);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].district, 'b');
  assert.equal(unpaired, 2);
});

/**
 * SYNTHETIC test vectors only. No real NASA POWER values appear in this file.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePowerResponse, seasonDates, seasonMetrics, clean, FILL } from '../scripts/lib/power.mjs';

test('parsePowerResponse maps YYYYMMDD keys to ISO dates and turns -999 into null', () => {
  const json = { properties: { parameter: {
    PRECTOTCORR: { '20200601': 3.2, '20200602': FILL },
    T2M: { '20200601': 28.5, '20200602': 29.0 },
  } } };
  const m = parsePowerResponse(json, 'synthetic');
  assert.deepEqual(m.get('2020-06-01'), { p: 3.2, t: 28.5 });
  assert.deepEqual(m.get('2020-06-02'), { p: null, t: 29.0 });
});

test('parsePowerResponse throws loudly when the structure is missing', () => {
  assert.throws(() => parsePowerResponse({}, 'synthetic'), /missing properties\.parameter/);
  assert.throws(() => parsePowerResponse({ properties: { parameter: { T2M: {} } } }, 'synthetic'), /PRECTOTCORR or T2M missing/);
});

test('clean rejects out-of-range and non-finite values', () => {
  assert.equal(clean(FILL, 0, 500), null);
  assert.equal(clean(-1, 0, 500), null);
  assert.equal(clean(NaN, 0, 500), null);
  assert.equal(clean(12.5, 0, 500), 12.5);
});

test('season window is 1 Jun to 5 Oct inclusive (127 days)', () => {
  assert.equal(seasonDates(2001).length, 127);
  assert.equal(seasonDates(2001)[0], '2001-06-01');
  assert.equal(seasonDates(2001).at(-1), '2001-10-05');
});

test('seasonMetrics is complete with full data and computes totals, heavy days and dry spell (SYNTHETIC)', () => {
  const byDate = new Map();
  const keys = seasonDates(2001);
  keys.forEach((d, i) => {
    // Synthetic pattern: 2 mm/day, except day 10 (70 mm, heavy) and days 20–29 (0 mm, a 10-day dry spell).
    const p = i === 10 ? 70 : i >= 20 && i <= 29 ? 0 : 2;
    byDate.set(d, { p, t: 30 });
  });
  const m = seasonMetrics(2001, byDate);
  assert.equal(m.complete, true);
  assert.equal(m.extreme_days, 1);
  assert.equal(m.max_dry_spell, 10);
  assert.equal(m.t_mean, 30);
  assert.equal(m.rain_mm, Math.round((2 * (127 - 1 - 10) + 70) * 10) / 10);
});

test('seasonMetrics refuses to report a season with more than 5% of days missing', () => {
  const byDate = new Map();
  seasonDates(2002).slice(0, 110).forEach((d) => byDate.set(d, { p: 1, t: 28 }));
  const m = seasonMetrics(2002, byDate);
  assert.equal(m.complete, false);
  assert.equal(m.rain_mm, null);
  assert.equal(m.t_mean, null);
  assert.equal(m.max_dry_spell, null);
});

test('seasonMetrics treats a day with only one variable valid as incomplete', () => {
  const byDate = new Map();
  for (const d of seasonDates(2003)) byDate.set(d, { p: 1, t: null });
  assert.equal(seasonMetrics(2003, byDate).complete, false);
});

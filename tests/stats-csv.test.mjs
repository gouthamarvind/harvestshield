import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ols, spearman, averageRanks, longestRun, round } from '../scripts/lib/stats.mjs';
import { parseCsv, rowsToObjects, areaMultiplier, productionMultiplier } from '../scripts/lib/csv.mjs';
import { districtIdFor, normaliseName, candidateIds, DISTRICTS } from '../scripts/lib/districts.mjs';

test('ols recovers an exact line', () => {
  const { slope, intercept } = ols([1, 2, 3, 4], [3, 5, 7, 9]);
  assert.ok(Math.abs(slope - 2) < 1e-12);
  assert.ok(Math.abs(intercept - 1) < 1e-12);
});

test('spearman is 1 for a monotone relationship and ranks ties by average', () => {
  assert.equal(round(spearman([1, 2, 3, 4, 5], [10, 20, 30, 40, 50]), 6), 1);
  assert.deepEqual(averageRanks([5, 1, 5]), [2.5, 1, 2.5]);
});

test('longestRun counts consecutive true flags', () => {
  assert.equal(longestRun([true, true, false, true, true, true, false]), 3);
  assert.equal(longestRun([]), 0);
});

test('parseCsv handles quoted commas, escaped quotes and CRLF', () => {
  const rows = parseCsv('a,"b, with comma","say ""hi"""\r\n1,2,3\r\n');
  assert.deepEqual(rows, [['a', 'b, with comma', 'say "hi"'], ['1', '2', '3']]);
});

test('rowsToObjects strips a UTF-8 BOM from the first header', () => {
  const { headers, records } = rowsToObjects(parseCsv('﻿State Name,Year\nTamil Nadu,1997\n'));
  assert.deepEqual(headers, ['State Name', 'Year']);
  assert.equal(records[0]['State Name'], 'Tamil Nadu');
});

test('unit multipliers read ICRISAT-style headers and default to 1', () => {
  assert.equal(areaMultiplier('RICE AREA (1000 ha)'), 1000);
  assert.equal(productionMultiplier('RICE PRODUCTION (1000 tons)'), 1000);
  assert.equal(areaMultiplier('RICE AREA (ha)'), 1);
  assert.equal(productionMultiplier('RICE PRODUCTION (tonnes)'), 1);
  assert.equal(productionMultiplier('PADDY PRODUCTION (lakh tonnes)'), 100000);
});

test('districtIdFor maps every registry id and common spellings, and rejects unknown names', () => {
  assert.equal(Object.keys(DISTRICTS).length, 37);
  for (const id of Object.keys(DISTRICTS)) assert.equal(districtIdFor(id), id);
  assert.equal(districtIdFor('Tanjore'), 'thanjavur');
  assert.equal(districtIdFor('Trichy'), 'tiruchirappalli');
  assert.equal(districtIdFor('The Nilgiris'), 'nilgiris');
  assert.equal(districtIdFor('Kanchipuram District'), 'kancheepuram');
  assert.equal(districtIdFor('Atlantis'), null);
  assert.equal(normaliseName(' The  Tiruchi-Rapalli '), 'tiruchirapalli');
});

test('candidateIds resolves ICRISAT composite names and reports ambiguity instead of guessing', () => {
  assert.deepEqual(candidateIds('North Arcot / Vellore'), ['vellore']);
  assert.deepEqual(candidateIds('Periyar (Erode)'), ['erode']);
  assert.deepEqual(candidateIds('Chidambanar / Toothukudi'), ['thoothukkudi']);
  assert.deepEqual(candidateIds('Dindigul Anna'), ['dindigul']);
  assert.deepEqual(candidateIds('Virudhunagar / Kamarajar'), ['virudhunagar']);
  assert.deepEqual(candidateIds('Ramananthapuram'), ['ramanathapuram']);
  assert.equal(candidateIds('Chengalpattu MGR / Kancheepuram').length, 2, 'two districts share one unit: ambiguous');
  assert.deepEqual(candidateIds('North Arcot'), [], 'pre-split unit is not mapped');
  assert.deepEqual(candidateIds('Chingleput'), []);
  assert.deepEqual(candidateIds('Atlantis / Nowhere'), []);
});

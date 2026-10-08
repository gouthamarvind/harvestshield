#!/usr/bin/env node
/**
 * normalize-yields.mjs — normalises Tamil Nadu district rice statistics into one table.
 *
 *   npm run normalize:yields
 *
 * Input: CSV files in data/raw/icrisat/. The source is the ICRISAT District Level Database
 * (Mendeley Data, DOI 10.17632/ywp3y5j9vv.1). Excel files must be saved as CSV first.
 * Supported layouts:
 *   wide: one row per district-year, with columns such as "RICE AREA (1000 ha)" (the ICRISAT layout)
 *   long: one row per district-year-crop, with Crop, Area, Production and Yield columns
 * Output: data/processed/tn_rice_yields.json, one row per district-year: area_ha, production_t, yield_kg_ha.
 * Missing values stay missing. Implausible values are dropped and counted. Nothing is interpolated.
 * A district name that could be more than one of the 37 is reported and dropped, never guessed.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, rowsToObjects, findHeader, areaMultiplier, productionMultiplier } from './lib/csv.mjs';
import { candidateIds } from './lib/districts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = process.env.HS_DATA_ROOT || join(HERE, '..', 'data');
const RAW = join(DATA, 'raw', 'icrisat');
const OUT = join(DATA, 'processed', 'tn_rice_yields.json');
const MAX_YIELD_KG_HA = 12000; // above this, treat the value as a data-entry error

const fail = (msg) => { console.error(`\nERROR: ${msg}`); process.exit(1); };
const num = (v) => {
  if (v == null || String(v).trim() === '') return null;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
};

if (!existsSync(RAW)) fail(`no folder ${RAW}. Save the ICRISAT district file (DOI 10.17632/ywp3y5j9vv.1) as CSV in that folder.`);
const files = readdirSync(RAW).filter((f) => f.toLowerCase().endsWith('.csv'));
if (files.length === 0) fail(`no CSV files in ${RAW}. Save the ICRISAT Excel file as CSV (UTF-8) in that folder. Source: DOI 10.17632/ywp3y5j9vv.1`);

const records = new Map(); // key district|year → row (first occurrence kept)
const report = {
  files: [], rowsRead: 0, notTamilNadu: 0, notRice: 0,
  unmatchedDistricts: {}, ambiguousDistricts: {},
  badYear: 0, missingValues: 0, implausible: 0, duplicates: 0, kept: 0,
};

for (const f of files) {
  const path = join(RAW, f);
  const text = readFileSync(path, 'utf8');
  const { headers, records: rows } = rowsToObjects(parseCsv(text));
  // Prefer the name columns. The ICRISAT file also has "State Code" and "Dist Code", which must not match.
  const stateH = findHeader(headers, /^state\s*name$/i) ?? findHeader(headers, /^state(?!.*code)/i);
  const distH = findHeader(headers, /^dist(rict)?\s*name$/i) ?? findHeader(headers, /^dist(rict)?(?!.*code)/i);
  const yearH = findHeader(headers, /^year$/i) ?? findHeader(headers, /^year/i);
  if (!distH || !yearH || !stateH) fail(`${f}: need State Name, Dist Name and Year columns. Found: ${headers.join(' | ')}`);

  const cropH = findHeader(headers, /^crop/i);
  const areaH = cropH ? findHeader(headers, /area/i) : null;
  const prodH = cropH ? findHeader(headers, /prod/i) : null;
  const yldH = cropH ? findHeader(headers, /yield/i) : null;
  const riceArea = headers.find((h) => /(rice|paddy)/i.test(h) && /area/i.test(h));
  const riceProd = headers.find((h) => /(rice|paddy)/i.test(h) && /prod/i.test(h));
  const riceYld = headers.find((h) => /(rice|paddy)/i.test(h) && /yield/i.test(h));
  const mode = cropH && areaH && prodH ? 'long' : riceArea || riceProd ? 'wide' : null;
  if (!mode) fail(`${f}: no rice/paddy columns found (wide layout needs "RICE AREA" and "RICE PRODUCTION"; long layout needs Crop, Area, Production).`);
  report.files.push({ file: f, layout: mode, sha256: createHash('sha256').update(text).digest('hex'), bytes: statSync(path).size });

  for (const r of rows) {
    report.rowsRead++;
    if (!/tamil\s*nadu/i.test(r[stateH])) { report.notTamilNadu++; continue; }
    const ym = String(r[yearH]).match(/(19|20)\d{2}/);
    if (!ym) { report.badYear++; continue; }
    const year = Number(ym[0]);
    const ids = candidateIds(r[distH]);
    if (ids.length === 0) { report.unmatchedDistricts[r[distH]] = (report.unmatchedDistricts[r[distH]] ?? 0) + 1; continue; }
    if (ids.length > 1) { report.ambiguousDistricts[r[distH]] = (report.ambiguousDistricts[r[distH]] ?? 0) + 1; continue; }
    const id = ids[0];

    let area, prod, yld;
    if (mode === 'long') {
      if (!/rice|paddy/i.test(r[cropH]) || /bean/i.test(r[cropH])) { report.notRice++; continue; }
      area = num(r[areaH]) != null ? num(r[areaH]) * areaMultiplier(areaH) : null;
      prod = num(r[prodH]) != null ? num(r[prodH]) * productionMultiplier(prodH) : null;
      yld = yldH && num(r[yldH]) != null ? num(r[yldH]) * (/t\/ha|tonne/i.test(yldH) ? 1000 : 1) : null;
    } else {
      area = riceArea && num(r[riceArea]) != null ? num(r[riceArea]) * areaMultiplier(riceArea) : null;
      prod = riceProd && num(r[riceProd]) != null ? num(r[riceProd]) * productionMultiplier(riceProd) : null;
      yld = riceYld && num(r[riceYld]) != null ? num(r[riceYld]) * (/t\/ha|tonne/i.test(riceYld) ? 1000 : 1) : null;
    }
    if (yld == null && area > 0 && prod != null) yld = (prod * 1000) / area; // tonnes → kg, divided by ha
    if (area == null || prod == null || yld == null) { report.missingValues++; continue; }
    if (area <= 0 || prod < 0 || yld <= 0 || yld > MAX_YIELD_KG_HA) { report.implausible++; continue; }

    const key = `${id}|${year}`;
    if (records.has(key)) { report.duplicates++; continue; }
    records.set(key, { district: id, year, area_ha: Math.round(area), production_t: Math.round(prod), yield_kg_ha: Math.round(yld), source_file: f });
    report.kept++;
  }
}

if (records.size === 0) fail(`no usable Tamil Nadu rows. Check the report below and the file layout.\n${JSON.stringify(report, null, 2)}`);
const list = [...records.values()].sort((a, b) => a.district.localeCompare(b.district) || a.year - b.year);
const years = [...new Set(list.map((r) => r.year))].sort((a, b) => a - b);
const districts = [...new Set(list.map((r) => r.district))].sort();
const out = {
  status: 'ok',
  generatedAt: new Date().toISOString(),
  crop: 'rice (paddy)',
  unit: { area: 'ha', production: 'tonnes', yield: 'kg/ha' },
  yearConvention: 'Season year as printed in the source; "1997-98" is recorded as 1997',
  boundaryNote: 'Source district units are those of each year. Several 1990–2015 units cover more than one of today\'s districts. See the report for names that were not matched or were ambiguous.',
  coverage: { rows: list.length, districts: districts.length, years: years.length, yearRange: years.length ? [years[0], years.at(-1)] : null },
  report,
  rows: list,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`Kept ${list.length} district-years (${districts.length} districts, ${years.length} years: ${years[0]}–${years.at(-1)}).`);
console.log(`Dropped: ${report.missingValues} missing, ${report.implausible} implausible, ${report.duplicates} duplicate, ${report.badYear} bad year.`);
const unmatched = Object.entries(report.unmatchedDistricts);
if (unmatched.length) console.log(`No match among the 37 (ignored): ${unmatched.map(([k, v]) => `${k} (${v})`).join(', ')}`);
const ambiguous = Object.entries(report.ambiguousDistricts);
if (ambiguous.length) console.log(`Ambiguous, could be more than one district (dropped, not guessed): ${ambiguous.map(([k, v]) => `${k} (${v})`).join(', ')}`);
console.log(`Output: ${OUT}`);

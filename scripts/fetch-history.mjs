#!/usr/bin/env node
/**
 * fetch-history.mjs — NASA POWER daily history (rainfall, temperature) for the 37 districts.
 *
 *   npm run fetch:history
 *   npm run fetch:history -- --start=2001-01-01 --end=2026-10-05
 *
 * Writes raw responses to data/raw/power/ and an index entry (URL, retrieval time, size, SHA-256)
 * to data/manifests/power-manifest.json. Existing files are never overwritten: each run adds files
 * dated with the retrieval day, so earlier downloads stay reproducible.
 * Run on a machine with normal internet access (NASA POWER must be reachable).
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DISTRICTS } from './lib/districts.mjs';
import { parsePowerResponse } from './lib/power.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = process.env.HS_DATA_ROOT || join(HERE, '..', 'data');
const RAW = join(DATA, 'raw', 'power');
const MANIFEST = join(DATA, 'manifests', 'power-manifest.json');

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const today = new Date();
const START = arg('start', '1991-01-01');
const END = arg('end', new Date(today.getTime() - 3 * 86400000).toISOString().slice(0, 10));
const compact = (iso) => iso.replaceAll('-', '');
const STAMP = today.toISOString().slice(0, 10).replaceAll('-', '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** 10-year request chunks keep each POWER call small and well inside its limits. */
function chunks(start, end) {
  const out = [];
  for (let y = Number(start.slice(0, 4)); y <= Number(end.slice(0, 4)); y += 10) {
    const s = `${y}-01-01` < start ? start : `${y}-01-01`;
    const yEnd = `${y + 9}-12-31`;
    out.push([s, yEnd > end ? end : yEnd]);
  }
  return out;
}

async function getWithRetry(url, label, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'HarvestShield-prototype/1.0' } });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
      return await res.text();
    } catch (e) {
      if (i === tries) throw new Error(`${label}: ${e.message}`);
      const wait = 4000 * i;
      console.log(`  retry ${label} in ${wait / 1000}s (${e.message})`);
      await sleep(wait);
    }
  }
}

mkdirSync(RAW, { recursive: true });
mkdirSync(dirname(MANIFEST), { recursive: true });
const manifest = existsSync(MANIFEST)
  ? JSON.parse(readFileSync(MANIFEST, 'utf8'))
  : { source: 'NASA POWER daily point API (PRECTOTCORR, T2M; community AG)', entries: [] };

console.log(`NASA POWER daily history ${START} → ${END}`);
const failures = [];
for (const [id, [lat, lon]] of Object.entries(DISTRICTS)) {
  for (const [s, e] of chunks(START, END)) {
    const file = join(RAW, `${id}_${compact(s)}_${compact(e)}_${STAMP}.json`);
    if (existsSync(file)) { console.log(`skip ${id} ${s}..${e} (already retrieved ${STAMP})`); continue; }
    const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR,T2M&community=AG&longitude=${lon}&latitude=${lat}&start=${compact(s)}&end=${compact(e)}&format=JSON`;
    try {
      const text = await getWithRetry(url, `${id} ${s}..${e}`);
      const parsed = parsePowerResponse(JSON.parse(text), `${id} ${s}..${e}`);
      writeFileSync(file, text);
      const buf = Buffer.from(text);
      manifest.entries.push({
        district: id, start: s, end: e, url, retrieved_at: new Date().toISOString(),
        file: relative(DATA, file).replaceAll('\\', '/'), bytes: buf.length, sha256: sha256(buf), days: parsed.size,
      });
      console.log(`ok   ${id} ${s}..${e} (${parsed.size} days)`);
    } catch (err) {
      failures.push(`${id} ${s}..${e}: ${err.message}`);
      console.error(`FAIL ${id} ${s}..${e}: ${err.message}`);
    }
    await sleep(700);
  }
}
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
if (failures.length) {
  console.error(`\n${failures.length} request(s) failed. Re-run the same command to fetch only the missing files.`);
  process.exit(1);
}
console.log(`\nDone. Index: ${relative(process.cwd(), MANIFEST)}`);

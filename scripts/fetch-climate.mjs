#!/usr/bin/env node
/**
 * fetch-climate.mjs — pulls REAL climate observations into src/data/observed/climate.json.
 *
 *   npm run fetch:climate
 *
 * Sources (free, no API key):
 *   - NOAA CPC Oceanic Niño Index (ONI) ........ https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt
 *   - NASA POWER daily rainfall & temperature .. https://power.larc.nasa.gov  (PRECTOTCORR, T2M)
 *   - NASA POWER climatology (2001–2020 normals) for the same point
 *
 * For each of the 37 district headquarters it computes:
 *   - season-to-date rainfall (1 Jun → latest day) vs the 2001–2020 normal for the same days, %
 *   - mean temperature over the same window vs normal, °C
 *   - last-30-day rainfall anomaly, %
 *   - monthly rainfall / temperature anomalies for the last 24 months
 * Then a state-level summary (mean across districts).
 *
 * Needs Node 18+ (built-in fetch). Run it on any normal internet connection, then commit climate.json.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.env.HS_CLIMATE_OUT || join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'observed', 'climate.json');

// District headquarters (approximate lat, lon). Resolution of the data is ~0.5°, so town-level precision is enough.
const DISTRICTS = {
  ariyalur: [11.14, 79.08], chengalpattu: [12.69, 79.98], chennai: [13.08, 80.27], coimbatore: [11.02, 76.96],
  cuddalore: [11.75, 79.77], dharmapuri: [12.13, 78.16], dindigul: [10.36, 77.98], erode: [11.34, 77.72],
  kallakurichi: [11.74, 78.96], kancheepuram: [12.83, 79.7], kanyakumari: [8.18, 77.41], karur: [10.96, 78.08],
  krishnagiri: [12.52, 78.21], madurai: [9.93, 78.12], nagapattinam: [10.77, 79.84], namakkal: [11.22, 78.17],
  nilgiris: [11.41, 76.7], perambalur: [11.23, 78.88], pudukkottai: [10.38, 78.82], ramanathapuram: [9.37, 78.83],
  ranipet: [12.93, 79.33], salem: [11.66, 78.15], sivaganga: [9.85, 78.48], tenkasi: [8.96, 77.3],
  thanjavur: [10.79, 79.14], theni: [10.01, 77.48], thiruvallur: [13.14, 79.91], thiruvarur: [10.77, 79.64],
  thoothukkudi: [8.76, 78.13], tiruchirappalli: [10.79, 78.7], tirunelveli: [8.71, 77.76], tirupathur: [12.5, 78.57],
  tiruppur: [11.11, 77.34], tiruvannamalai: [12.23, 79.07], vellore: [12.92, 79.13], viluppuram: [11.94, 79.49],
  virudhunagar: [9.58, 77.96],
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const FILL = -999;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
const iso = (k) => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`;
const round = (v, n = 1) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** n) / 10 ** n);
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);

async function getJSON(url, label, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'HarvestShield-prototype/1.0' } });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return await res.json();
    } catch (e) {
      if (i === tries) throw new Error(`${label}: ${e.message}`);
      const wait = 4000 * i;
      process.stdout.write(`  retry ${label} in ${wait / 1000}s (${e.message})\n`);
      await sleep(wait);
    }
  }
}

/* ---------------------------------- ONI ---------------------------------- */
async function fetchOni() {
  const res = await fetch('https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt');
  if (!res.ok) throw new Error(`ONI HTTP ${res.status}`);
  const text = await res.text();
  const SEAS = ['DJF', 'JFM', 'FMA', 'MAM', 'AMJ', 'MJJ', 'JJA', 'JAS', 'ASO', 'SON', 'OND', 'NDJ'];
  const table = {};
  for (const line of text.split('\n')) {
    const m = line.trim().match(/^([A-Z]{3})\s+(\d{4})\s+(-?[\d.]+)\s+(-?[\d.]+)$/);
    if (!m) continue;
    const [, s, y, , anom] = m;
    const i = SEAS.indexOf(s);
    if (i < 0) continue;
    (table[y] ??= Array(12).fill(null))[i] = Number(anom);
  }
  if (Object.keys(table).length < 10) throw new Error('ONI parse failed');
  return table;
}

/* ------------------------------ NASA POWER ------------------------------- */
const POWER = 'https://power.larc.nasa.gov/api/temporal';

async function fetchDistrict(id, [lat, lon], start, end) {
  const q = `parameters=PRECTOTCORR,T2M&community=AG&longitude=${lon}&latitude=${lat}&format=JSON`;
  const daily = await getJSON(`${POWER}/daily/point?${q}&start=${ymd(start)}&end=${ymd(end)}`, `${id} daily`);
  await sleep(700);
  const clim = await getJSON(`${POWER}/climatology/point?${q}`, `${id} climatology`);
  const P = daily.properties.parameter;
  const C = clim.properties.parameter;
  const days = Object.keys(P.PRECTOTCORR)
    .map((k) => ({ date: iso(k), rain: P.PRECTOTCORR[k], temp: P.T2M[k] }))
    .filter((d) => d.rain !== FILL && d.rain != null && d.temp !== FILL && d.temp != null);
  // Climatology is mean mm/day (rain) and °C (temp) per calendar month, 2001–2020.
  const normRain = MONTHS.map((m) => C.PRECTOTCORR[m]);
  const normTemp = MONTHS.map((m) => C.T2M[m]);
  return { days, normRain, normTemp };
}

function summarise({ days, normRain, normTemp }, windowStart) {
  const month = (d) => Number(d.date.slice(5, 7)) - 1;
  const inWin = days.filter((d) => d.date >= windowStart);
  const last = days[days.length - 1]?.date;
  const last30 = days.slice(-30);
  const sumRain = (a) => a.reduce((s, d) => s + d.rain, 0);
  const sumNorm = (a) => a.reduce((s, d) => s + normRain[month(d)], 0);
  const pct = (a) => (sumNorm(a) > 0.5 ? (sumRain(a) / sumNorm(a) - 1) * 100 : null);

  const byMonth = {};
  for (const d of days) (byMonth[d.date.slice(0, 7)] ??= []).push(d);
  const monthly = Object.entries(byMonth)
    // keep complete months only (≥ 27 valid days), except nothing else
    .filter(([, a]) => a.length >= 27)
    .map(([m, a]) => ({
      month: m,
      rainMm: sumRain(a),
      rainNormalMm: sumNorm(a),
      tempAnomC: mean(a.map((d) => d.temp - normTemp[month(d)])),
    }));

  return {
    window: { start: windowStart, end: last, days: inWin.length },
    rainMm: round(sumRain(inWin), 0),
    rainNormalMm: round(sumNorm(inWin), 0),
    rainAnomPct: round(pct(inWin), 1),
    tempC: round(mean(inWin.map((d) => d.temp)), 2),
    tempAnomC: round(mean(inWin.map((d) => d.temp - normTemp[month(d)])), 2),
    last30RainAnomPct: round(pct(last30), 1),
    monthly,
  };
}

/* ---------------------------------- main --------------------------------- */
async function main() {
  const now = new Date();
  const end = new Date(now.getTime() - 3 * 86400000); // POWER near-real-time lags a few days
  const start = new Date(Date.UTC(end.getUTCFullYear() - 2, end.getUTCMonth(), 1));
  // Agricultural season window: 1 June of the current monsoon year (SW monsoon onset) → latest day.
  const seasonYear = end.getUTCMonth() >= 5 ? end.getUTCFullYear() : end.getUTCFullYear() - 1;
  const windowStart = `${seasonYear}-06-01`;

  const out = {
    status: 'ok',
    fetchedAt: now.toISOString(),
    sources: {
      oni: 'NOAA CPC Oceanic Niño Index (ERSSTv5)',
      weather: 'NASA POWER daily point data (PRECTOTCORR rainfall, T2M temperature)',
      normals: 'NASA POWER climatology 2001–2020',
    },
    windowStart,
    oni: null,
    districts: {},
    failed: [],
  };

  console.log('Fetching NOAA ONI…');
  try {
    out.oni = await fetchOni();
    console.log(`  ok — ${Object.keys(out.oni).length} years`);
  } catch (e) {
    console.log(`  ONI failed (${e.message}); the app will use its bundled ONI snapshot.`);
  }

  const ids = Object.keys(DISTRICTS);
  console.log(`Fetching NASA POWER for ${ids.length} districts (${ymd(start)} → ${ymd(end)})…`);
  const monthlyAll = {};
  for (const [n, id] of ids.entries()) {
    try {
      const raw = await fetchDistrict(id, DISTRICTS[id], start, end);
      const s = summarise(raw, windowStart);
      for (const m of s.monthly) (monthlyAll[m.month] ??= []).push(m);
      delete s.monthly;
      out.districts[id] = s;
      console.log(`  [${n + 1}/${ids.length}] ${id}: rain ${s.rainAnomPct}% · temp ${s.tempAnomC}°C (${s.window.days} days)`);
    } catch (e) {
      out.failed.push(id);
      console.log(`  [${n + 1}/${ids.length}] ${id}: FAILED — ${e.message}`);
    }
    await sleep(700);
  }

  const ok = Object.values(out.districts);
  if (!ok.length) {
    console.error('\nNo district data could be fetched. climate.json was NOT changed.');
    process.exit(1);
  }
  const totRain = ok.reduce((s, d) => s + d.rainMm, 0);
  const totNorm = ok.reduce((s, d) => s + d.rainNormalMm, 0);
  out.state = {
    rainAnomPct: round((totRain / totNorm - 1) * 100, 1),
    tempAnomC: round(mean(ok.map((d) => d.tempAnomC)), 2),
    last30RainAnomPct: round(mean(ok.map((d) => d.last30RainAnomPct).filter((v) => v != null)), 1),
    end: ok.map((d) => d.window.end).sort().pop(),
  };
  out.monthly = Object.entries(monthlyAll)
    .filter(([, a]) => a.length >= Math.ceil(ids.length * 0.8))
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, a]) => {
      const r = a.reduce((s, m) => s + m.rainMm, 0), nr = a.reduce((s, m) => s + m.rainNormalMm, 0);
      return { month, rainAnomPct: round(nr > 1 ? (r / nr - 1) * 100 : 0, 1), tempAnomC: round(mean(a.map((m) => m.tempAnomC)), 2) };
    });

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log(`\nSaved ${OUT}`);
  console.log(`State season-to-date (${windowStart} → ${out.state.end}): rain ${out.state.rainAnomPct}% vs normal, temp ${out.state.tempAnomC >= 0 ? '+' : ''}${out.state.tempAnomC}°C`);
  if (out.failed.length) console.log(`Districts without data (${out.failed.length}): ${out.failed.join(', ')} — run again to retry.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

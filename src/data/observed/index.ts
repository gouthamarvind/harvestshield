/**
 * Observed (real) climate inputs.
 *  - ONI: bundled NOAA snapshot (oni.ts), replaced by a fresher copy when climate.json has one.
 *  - District rainfall & temperature: climate.json, written by `npm run fetch:climate` (NASA POWER).
 */
import raw from './climate.json';
import { ONI_TABLE, ONI_SOURCE, latestOni, oniMonthly, seasonName } from './oni';

export interface DistrictObs {
  window: { start: string; end: string; days: number };
  rainMm: number; rainNormalMm: number; rainAnomPct: number | null;
  tempC: number | null; tempAnomC: number | null; last30RainAnomPct: number | null;
}
interface ClimateFile {
  status: 'ok' | 'pending';
  fetchedAt?: string;
  windowStart?: string;
  sources?: Record<string, string>;
  oni?: Record<string, (number | null)[]> | null;
  districts?: Record<string, DistrictObs>;
  state?: { rainAnomPct: number; tempAnomC: number; last30RainAnomPct: number; end: string };
  monthly?: { month: string; rainAnomPct: number; tempAnomC: number }[];
  failed?: string[];
}

const file = raw as ClimateFile;

/** True when real district rainfall/temperature has been fetched. */
export const HAS_WEATHER = file.status === 'ok' && !!file.state && !!file.districts && Object.keys(file.districts).length > 0;

const oniTable: Record<number, (number | null)[]> = file.oni
  ? Object.fromEntries(Object.entries(file.oni).map(([y, v]) => [Number(y), v]))
  : ONI_TABLE;

export const ONI = {
  table: oniTable,
  latest: latestOni(oniTable),
  monthly: oniMonthly(oniTable),
  source: ONI_SOURCE,
  asOf: file.oni && file.fetchedAt ? file.fetchedAt.slice(0, 10) : ONI_SOURCE.snapshot,
};
export const ONI_LABEL = `${seasonName(ONI.latest.season)} ${ONI.latest.year}`;

export const WEATHER = HAS_WEATHER
  ? {
      fetchedAt: file.fetchedAt!.slice(0, 10),
      windowStart: file.windowStart!,
      windowEnd: file.state!.end,
      state: file.state!,
      districts: file.districts!,
      monthly: file.monthly ?? [],
      failed: file.failed ?? [],
      source: file.sources?.weather ?? 'NASA POWER',
      normals: file.sources?.normals ?? 'NASA POWER climatology 2001–2020',
    }
  : null;

const fmtDate = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const WEATHER_WINDOW_LABEL = WEATHER ? `${fmtDate(WEATHER.windowStart)} – ${fmtDate(WEATHER.windowEnd)}` : '';

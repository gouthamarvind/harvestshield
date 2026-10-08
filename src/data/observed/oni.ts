/**
 * Oceanic Niño Index (ONI) — REAL observations.
 * Source: NOAA Climate Prediction Center, https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt
 * Values: 3-month running mean SST anomaly in the Niño-3.4 region (°C), ERSSTv5.
 * Snapshot taken 8 Oct 2026. `npm run fetch:climate` refreshes this from NOAA into climate.json.
 *
 * Each row holds the 12 overlapping seasons for that year, in order:
 * DJF JFM FMA MAM AMJ MJJ JJA JAS ASO SON OND NDJ
 */
export const ONI_SEASONS = ['DJF', 'JFM', 'FMA', 'MAM', 'AMJ', 'MJJ', 'JJA', 'JAS', 'ASO', 'SON', 'OND', 'NDJ'] as const;
export type OniSeason = (typeof ONI_SEASONS)[number];

export const ONI_SOURCE = {
  name: 'NOAA CPC Oceanic Niño Index',
  url: 'https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt',
  snapshot: '2026-10-08',
};

export const ONI_TABLE: Record<number, (number | null)[]> = {
  1997: [-0.41, -0.26, -0.03, 0.30, 0.71, 1.13, 1.48, 1.79, 2.04, 2.24, 2.34, 2.37],
  1998: [2.22, 1.91, 1.40, 1.03, 0.40, -0.08, -0.63, -0.83, -1.02, -1.12, -1.31, -1.47],
  2009: [-0.89, -0.84, -0.63, -0.35, 0.03, 0.34, 0.50, 0.56, 0.66, 0.92, 1.31, 1.50],
  2010: [1.47, 1.21, 0.88, 0.38, -0.16, -0.66, -0.98, -1.24, -1.43, -1.54, -1.57, -1.48],
  2014: [-0.24, -0.21, -0.02, 0.25, 0.35, 0.22, 0.07, 0.07, 0.24, 0.51, 0.70, 0.80],
  2015: [0.73, 0.65, 0.72, 0.86, 1.04, 1.19, 1.44, 1.73, 2.02, 2.28, 2.45, 2.59],
  2016: [2.50, 2.21, 1.69, 1.11, 0.57, 0.09, -0.19, -0.34, -0.42, -0.51, -0.49, -0.37],
  2017: [-0.08, 0.08, 0.27, 0.32, 0.35, 0.32, 0.14, -0.07, -0.23, -0.44, -0.61, -0.76],
  2018: [-0.71, -0.67, -0.55, -0.35, -0.07, 0.13, 0.20, 0.30, 0.52, 0.82, 1.04, 1.05],
  2019: [0.99, 0.94, 0.87, 0.82, 0.71, 0.59, 0.38, 0.20, 0.31, 0.51, 0.72, 0.75],
  2020: [0.71, 0.66, 0.57, 0.33, 0.04, -0.18, -0.29, -0.43, -0.77, -1.00, -1.11, -1.06],
  2021: [-0.99, -0.85, -0.74, -0.56, -0.40, -0.31, -0.35, -0.46, -0.64, -0.77, -0.91, -0.83],
  2022: [-0.76, -0.68, -0.77, -0.86, -0.83, -0.73, -0.70, -0.78, -0.87, -0.89, -0.82, -0.70],
  2023: [-0.55, -0.33, -0.11, 0.19, 0.46, 0.73, 1.00, 1.25, 1.50, 1.74, 1.90, 1.99],
  2024: [1.84, 1.53, 1.18, 0.77, 0.43, 0.18, 0.06, -0.04, -0.12, -0.19, -0.29, -0.43],
  2025: [-0.46, -0.22, -0.08, 0.02, -0.04, -0.02, -0.11, -0.26, -0.43, -0.57, -0.61, -0.60],
  2026: [-0.39, -0.21, 0.11, 0.46, 0.95, 1.39, 1.80, 2.16, null, null, null, null],
};

/** ONI value for a season; season index 0 = DJF … 11 = NDJ. */
export function oni(year: number, seasonIdx: number): number | null {
  return ONI_TABLE[year]?.[seasonIdx] ?? null;
}

/** Monthly ONI series: each 3-month season is assigned to its centre month (JAS → Aug). */
export function oniMonthly(table: Record<number, (number | null)[]> = ONI_TABLE): { month: string; value: number }[] {
  const out: { month: string; value: number }[] = [];
  for (const y of Object.keys(table).map(Number).sort((a, b) => a - b)) {
    table[y].forEach((v, i) => {
      if (v == null) return;
      // season i is centred on calendar month i (DJF → Jan = month index 0).
      out.push({ month: `${y}-${String(i + 1).padStart(2, '0')}`, value: v });
    });
  }
  return out;
}

export function latestOni(table: Record<number, (number | null)[]> = ONI_TABLE): { year: number; season: OniSeason; value: number } {
  const years = Object.keys(table).map(Number).sort((a, b) => b - a);
  for (const y of years) {
    for (let i = 11; i >= 0; i--) {
      const v = table[y][i];
      if (v != null) return { year: y, season: ONI_SEASONS[i], value: v };
    }
  }
  return { year: 0, season: 'DJF', value: 0 };
}

const SEASON_NAMES: Record<OniSeason, string> = {
  DJF: 'Dec–Feb', JFM: 'Jan–Mar', FMA: 'Feb–Apr', MAM: 'Mar–May', AMJ: 'Apr–Jun', MJJ: 'May–Jul',
  JJA: 'Jun–Aug', JAS: 'Jul–Sep', ASO: 'Aug–Oct', SON: 'Sep–Nov', OND: 'Oct–Dec', NDJ: 'Nov–Jan',
};
export const seasonName = (s: OniSeason) => SEASON_NAMES[s];

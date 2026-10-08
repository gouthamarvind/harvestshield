/**
 * NOAA CPC ENSO outlook — hand-entered from the official ENSO diagnostic discussion.
 * Update this file when a new discussion is issued (normally the second Thursday of each month).
 * Source: https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml
 * Values are as printed in the discussion; they are forecasts, not observations.
 */
export const ENSO_OUTLOOK = {
  issued: '2026-09-10',
  verifiedOn: '2026-10-08',
  status: 'El Niño Advisory',
  headline: 'El Niño is strengthening, with a greater than 90% chance of a very strong event during fall and winter 2026–27.',
  /** Probability (%) of a very strong event (ONI ≥ +2.0 °C) in the period below. */
  veryStrongProbPct: 90,
  veryStrongPeriod: 'fall–winter 2026–27',
  /** Probability (%) of a "historic" event (3-month RONI ≥ +2.5 °C) in Oct–Dec 2026. */
  historicProbPct: 75,
  historicPeriod: 'Oct–Dec 2026',
  source: { name: 'NOAA CPC ENSO Diagnostic Discussion', url: 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml' },
} as const;

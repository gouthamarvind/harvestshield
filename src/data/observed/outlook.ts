/**
 * NOAA CPC ENSO outlook — hand-entered from the official ENSO diagnostic discussion.
 * Update this file when a new discussion is issued (normally the second Thursday of each month).
 * Source: https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml
 * Values are as printed in the discussion; they are forecasts, not observations.
 * Last checked 2026-10-08: the NOAA page still showed the 10 September discussion. The 8 October discussion was due that day and had not been posted at the check.
 */
export const ENSO_OUTLOOK = {
  issued: '2026-09-10',
  checkedOn: '2026-10-08',
  status: 'El Niño Advisory',
  headline: 'El Niño is strengthening, with a greater than 90% chance of a very strong event during fall and winter 2026–27.',
  /** Probability (%) of a very strong event in the period below. The ONI ≥ +2.0 °C threshold is NOAA convention and was not confirmed in the text checked. */
  veryStrongProbPct: 90,
  veryStrongPeriod: 'fall–winter 2026–27',
  /** Probability (%) of a "historic" event (3-month RONI ≥ +2.5 °C) in Oct–Dec 2026. */
  historicProbPct: 75,
  historicPeriod: 'Oct–Dec 2026',
  source: { name: 'NOAA CPC ENSO Diagnostic Discussion', url: 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml' },
} as const;

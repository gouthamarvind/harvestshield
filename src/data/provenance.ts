import { ONI, ONI_LABEL, WEATHER, WEATHER_WINDOW_LABEL, HAS_WEATHER } from './observed';
import { ENSO_OUTLOOK } from './observed/outlook';

export const MODEL_VERSION = 'CropRisk-v0.1';

export type ProvType = 'OBSERVED' | 'FORECAST' | 'SCENARIO' | 'ILLUSTRATIVE' | 'REFERENCE';
export type ConnStatus = 'CONNECTED' | 'HAND_ENTERED' | 'ASSUMED' | 'NOT_CONNECTED';
export interface ProvenanceItem {
  id: string; name: string; type: ProvType; source: string; url?: string;
  retrieved?: string; period?: string; status: ConnStatus; note: string;
}

export const CONN_LABEL: Record<ConnStatus, string> = { CONNECTED: 'Connected', HAND_ENTERED: 'Hand-entered', ASSUMED: 'Assumed', NOT_CONNECTED: 'Not connected' };

export const PROVENANCE: ProvenanceItem[] = [
  { id: 'oni', name: 'El Niño index (ONI)', type: 'OBSERVED', source: 'NOAA CPC', url: ONI.source.url, retrieved: ONI.asOf, period: `Jan 1997 – ${ONI_LABEL}`, status: 'CONNECTED', note: 'NOAA table bundled with the app. Refresh with npm run fetch:climate.' },
  { id: 'weather', name: 'District rainfall and temperature', type: 'OBSERVED', source: 'NASA POWER (daily)', url: 'https://power.larc.nasa.gov/', retrieved: WEATHER?.fetchedAt, period: WEATHER_WINDOW_LABEL || undefined, status: HAS_WEATHER ? 'CONNECTED' : 'NOT_CONNECTED', note: '37 districts. The POWER grid is about 0.5°, so neighbouring districts can share values.' },
  { id: 'normals', name: 'Climate normals', type: 'REFERENCE', source: 'NASA POWER climatology 2001–2020', url: 'https://power.larc.nasa.gov/', status: HAS_WEATHER ? 'CONNECTED' : 'NOT_CONNECTED', note: 'Baseline used for every anomaly figure.' },
  { id: 'outlook', name: 'ENSO outlook', type: 'FORECAST', source: 'NOAA CPC ENSO discussion', url: ENSO_OUTLOOK.source.url, retrieved: ENSO_OUTLOOK.issued, period: ENSO_OUTLOOK.veryStrongPeriod, status: 'HAND_ENTERED', note: 'Typed in from the issued discussion. Check the latest discussion before presenting.' },
  { id: 'iod', name: 'Indian Ocean Dipole', type: 'OBSERVED', source: 'Dipole index (not yet fetched)', status: 'NOT_CONNECTED', note: 'Not in the model yet. ENSO is the only teleconnection used.' },
  { id: 'imd', name: 'IMD seasonal and monsoon forecast', type: 'FORECAST', source: 'India Meteorological Department', url: 'https://mausam.imd.gov.in/', status: 'NOT_CONNECTED', note: 'Not connected. The outlook uses NOAA only.' },
  { id: 'calendar', name: 'Crop calendar and sowing windows', type: 'REFERENCE', source: 'TNAU (to be verified)', status: 'NOT_CONNECTED', note: 'Sowing windows are approximate until checked against TNAU calendars.' },
  { id: 'yield', name: 'District production and yield history', type: 'REFERENCE', source: 'Tamil Nadu Dept. of Economics and Statistics', status: 'NOT_CONNECTED', note: 'Needed for model validation. The backtest has not been run.' },
  { id: 'reservoir', name: 'Reservoir storage', type: 'SCENARIO', source: 'Assumed input', status: 'ASSUMED', note: 'Set to 60% of normal. No live reservoir feed is connected.' },
  { id: 'mix', name: 'Crop mix, population and district characteristics', type: 'ILLUSTRATIVE', source: 'Prototype dataset', status: 'ASSUMED', note: 'Illustrative values for 37 districts. Not official statistics.' },
  { id: 'model', name: `Risk model (${MODEL_VERSION})`, type: 'ILLUSTRATIVE', source: 'HarvestShield transparent weighted model', status: 'ASSUMED', note: 'Hand-set weights. Not yet calibrated to harvest records.' },
];

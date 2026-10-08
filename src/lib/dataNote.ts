import { WEATHER } from '../data/observed';

/** One honest sentence about what is real and what is illustrative, reused across the app. */
export const DATA_NOTE_TITLE = WEATHER ? 'Real climate inputs · illustrative farm data' : 'Real ENSO input · illustrative farm data';
export const DATA_NOTE = WEATHER
  ? 'El Niño (NOAA ONI) and district rainfall & temperature (NASA POWER) are real observations. Crop mix, reservoir storage, population and the risk weights are illustrative, and the model has not been validated against harvest records.'
  : 'El Niño strength (NOAA ONI) is a real observation. District rainfall, crop mix, reservoir storage, population and the risk weights are illustrative, and the model has not been validated against harvest records.';

import type { CropId } from './crops';

/**
 * District agro-climatic profiles (seed data).
 * Crop mix, exposure and population figures are approximate/illustrative and exist to make the prototype
 * behave plausibly. Production would source these from crop statistics, census and geospatial layers.
 */
export interface District {
  id: string;
  name: string;
  /** Share of modelled cropped area by crop (sums to 1). */
  mix: Record<CropId, number>;
  /** Dependence on surface/canal irrigation (0–1). */
  irrigation: number;
  /** Coastal / cyclone & salinity exposure (0–1). */
  coastal: number;
  /** Local heat amplification (≈0.85–1.2). */
  heat: number;
  /** Local rainfall sensitivity multiplier (≈0.8–1.2). */
  rain: number;
  /** Population, lakh. */
  populationLakh: number;
  /** Area enrolled in the HarvestShield pilot monitoring network, ha. */
  monitoredHa: number;
  /** Socio-economic vulnerability index (0–1). */
  vulnerability: number;
  /** Short narrative driver shown in lists. */
  driver: string;
}

type Row = [string, number, number, number, number, number, number, number, number, number, number, number, number, string];
// name, rice, maize, millet, groundnut, sorghum, irrigation, coastal, heat, rain, popLakh, monitoredHa, vulnerability, driver
const ROWS: Row[] = [
  ['Ariyalur', 0.3, 0.42, 0.08, 0.12, 0.08, 0.55, 0.05, 1.05, 1.0, 7.5, 380, 0.62, 'Rain-fed maize belt'],
  ['Chengalpattu', 0.62, 0.04, 0.06, 0.24, 0.04, 0.7, 0.55, 0.95, 1.0, 25.6, 260, 0.38, 'Tank-irrigated paddy'],
  ['Chennai', 0.6, 0.05, 0.1, 0.2, 0.05, 0.6, 0.9, 1.0, 0.9, 46.5, 20, 0.35, 'Urban food demand hub'],
  ['Coimbatore', 0.08, 0.46, 0.18, 0.12, 0.16, 0.5, 0.0, 0.92, 0.9, 34.6, 520, 0.3, 'Maize & coconut, canal-fed'],
  ['Cuddalore', 0.58, 0.1, 0.06, 0.2, 0.06, 0.78, 0.7, 1.0, 1.05, 26.1, 610, 0.52, 'Coastal paddy, cyclone exposure'],
  ['Dharmapuri', 0.12, 0.2, 0.4, 0.14, 0.14, 0.35, 0.0, 1.0, 0.85, 15.1, 470, 0.66, 'Ragi & millet uplands'],
  ['Dindigul', 0.24, 0.32, 0.18, 0.14, 0.12, 0.5, 0.0, 1.05, 1.0, 21.6, 520, 0.5, 'Mixed crops, heat stress'],
  ['Erode', 0.34, 0.28, 0.12, 0.16, 0.1, 0.82, 0.0, 1.0, 0.95, 22.5, 640, 0.36, 'Bhavani canal command'],
  ['Kallakurichi', 0.4, 0.2, 0.12, 0.2, 0.08, 0.6, 0.0, 1.04, 1.05, 13.7, 430, 0.64, 'Mixed rain-fed & tank'],
  ['Kancheepuram', 0.66, 0.04, 0.06, 0.2, 0.04, 0.74, 0.35, 0.96, 1.0, 11.7, 300, 0.4, 'Tank cascades, paddy'],
  ['Kanyakumari', 0.6, 0.02, 0.06, 0.06, 0.26, 0.6, 0.75, 0.85, 0.8, 18.7, 220, 0.34, 'Bimodal rainfall buffer'],
  ['Karur', 0.36, 0.28, 0.14, 0.12, 0.1, 0.72, 0.0, 1.08, 1.0, 10.6, 360, 0.48, 'Cauvery-fed mixed farming'],
  ['Krishnagiri', 0.14, 0.18, 0.4, 0.16, 0.12, 0.38, 0.0, 0.94, 0.88, 18.8, 450, 0.6, 'Ragi plateau, cooler'],
  ['Madurai', 0.42, 0.18, 0.14, 0.12, 0.14, 0.7, 0.0, 1.25, 1.12, 30.4, 700, 0.55, 'Heat stress, Vaigai-dependent'],
  ['Nagapattinam', 0.86, 0.02, 0.04, 0.06, 0.02, 0.88, 0.9, 1.0, 1.0, 16.2, 980, 0.64, 'Tail-end delta, coastal exposure'],
  ['Namakkal', 0.18, 0.36, 0.2, 0.14, 0.12, 0.45, 0.0, 1.0, 0.92, 17.3, 420, 0.42, 'Maize & poultry feed'],
  ['Nilgiris', 0.04, 0.12, 0.3, 0.04, 0.5, 0.2, 0.0, 0.7, 0.75, 7.4, 80, 0.4, 'Highland, low exposure'],
  ['Perambalur', 0.16, 0.48, 0.12, 0.14, 0.1, 0.4, 0.0, 1.06, 0.98, 5.7, 340, 0.6, 'Maize & cotton, rain-fed'],
  ['Pudukkottai', 0.5, 0.08, 0.1, 0.26, 0.06, 0.66, 0.4, 1.06, 1.05, 16.2, 560, 0.62, 'Tank-fed paddy & groundnut'],
  ['Ramanathapuram', 0.56, 0.04, 0.16, 0.06, 0.18, 0.62, 0.85, 1.12, 1.12, 13.5, 600, 0.74, 'Rain-fed paddy, chronic deficit'],
  ['Ranipet', 0.46, 0.06, 0.1, 0.32, 0.06, 0.6, 0.0, 1.02, 1.0, 12.1, 280, 0.46, 'Groundnut & paddy'],
  ['Salem', 0.14, 0.24, 0.38, 0.12, 0.12, 0.36, 0.0, 0.96, 0.86, 34.8, 560, 0.48, 'Millet potential, lower stress'],
  ['Sivaganga', 0.58, 0.06, 0.14, 0.12, 0.1, 0.58, 0.2, 1.1, 1.1, 13.4, 520, 0.66, 'Tank-fed rain-dependent paddy'],
  ['Tenkasi', 0.5, 0.14, 0.14, 0.1, 0.12, 0.6, 0.0, 1.02, 0.95, 14.1, 380, 0.56, 'Western Ghats foothills'],
  ['Thanjavur', 0.84, 0.03, 0.03, 0.07, 0.03, 0.95, 0.4, 1.06, 1.15, 24.0, 1250, 0.58, 'High water dependency, delta paddy'],
  ['Theni', 0.34, 0.24, 0.18, 0.1, 0.14, 0.62, 0.0, 1.04, 0.95, 12.5, 380, 0.46, 'Periyar-fed valley'],
  ['Thiruvallur', 0.64, 0.04, 0.06, 0.22, 0.04, 0.72, 0.6, 0.98, 1.0, 37.3, 420, 0.42, 'Peri-urban paddy'],
  ['Thiruvarur', 0.86, 0.02, 0.04, 0.06, 0.02, 0.9, 0.5, 1.0, 1.0, 12.6, 1040, 0.6, 'Delta paddy, kuruvai exposure'],
  ['Thoothukkudi', 0.18, 0.2, 0.28, 0.1, 0.24, 0.42, 0.8, 1.14, 1.05, 17.5, 470, 0.58, 'Dry coastal millets & pulses'],
  ['Tiruchirappalli', 0.5, 0.2, 0.1, 0.12, 0.08, 0.8, 0.0, 1.1, 1.05, 27.2, 760, 0.5, 'Cauvery head reach'],
  ['Tirunelveli', 0.56, 0.08, 0.12, 0.1, 0.14, 0.7, 0.4, 1.06, 1.0, 16.6, 520, 0.52, 'Thamirabarani-fed paddy'],
  ['Tirupathur', 0.28, 0.12, 0.26, 0.26, 0.08, 0.42, 0.0, 1.0, 0.92, 11.1, 300, 0.58, 'Groundnut & millets'],
  ['Tiruppur', 0.1, 0.42, 0.2, 0.12, 0.16, 0.55, 0.0, 1.02, 0.92, 24.8, 430, 0.36, 'Maize, PAP canal'],
  ['Tiruvannamalai', 0.46, 0.08, 0.12, 0.28, 0.06, 0.62, 0.0, 1.04, 1.02, 24.6, 640, 0.6, 'Groundnut & tank paddy'],
  ['Vellore', 0.4, 0.06, 0.14, 0.34, 0.06, 0.55, 0.0, 1.03, 0.98, 16.1, 340, 0.5, 'Groundnut, Palar basin'],
  ['Viluppuram', 0.48, 0.1, 0.1, 0.26, 0.06, 0.66, 0.35, 1.03, 1.04, 20.9, 680, 0.6, 'Tank-fed paddy & groundnut'],
  ['Virudhunagar', 0.2, 0.18, 0.28, 0.08, 0.26, 0.4, 0.0, 1.14, 1.0, 19.4, 460, 0.56, 'Dryland millets, heat'],
];

export const DISTRICTS: District[] = ROWS.map((r) => {
  const [name, rice, maize, millet, groundnut, sorghum, irrigation, coastal, heat, rain, populationLakh, monitoredHa, vulnerability, driver] = r;
  const total = rice + maize + millet + groundnut + sorghum;
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    mix: { rice: rice / total, maize: maize / total, millet: millet / total, groundnut: groundnut / total, sorghum: sorghum / total },
    irrigation, coastal, heat, rain, populationLakh, monitoredHa, vulnerability, driver,
  };
});

export const districtById = (id: string) => DISTRICTS.find((d) => d.id === id);

export function primaryCrop(d: District): CropId {
  return (Object.entries(d.mix) as [CropId, number][]).sort((a, b) => b[1] - a[1])[0][0];
}
/** Human label: dominant crop, or "Mixed crops" when nothing exceeds 45%. */
export function cropLabel(d: District): string {
  const [id, share] = (Object.entries(d.mix) as [CropId, number][]).sort((a, b) => b[1] - a[1])[0];
  if (share < 0.45) return 'Mixed crops';
  return id[0].toUpperCase() + id.slice(1);
}

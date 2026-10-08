/** Shared risk banding + colour scale so every view speaks the same visual language. */
export type RiskBand = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
export function riskBand(score: number): RiskBand {
  if (score >= 70) return 'SEVERE';
  if (score >= 50) return 'HIGH';
  if (score >= 30) return 'MODERATE';
  return 'LOW';
}
export function riskColor(score: number): string {
  if (score >= 70) return '#FF4D5E';
  if (score >= 50) return '#FF7A3D';
  if (score >= 30) return '#F5B83D';
  return '#3DF58A';
}
export const bandTone: Record<RiskBand, 'danger' | 'ember' | 'amber' | 'mint'> = {
  SEVERE: 'danger', HIGH: 'ember', MODERATE: 'amber', LOW: 'mint',
};
/** Continuous scale for choropleths (0..100 → green → amber → red). */
export function heatColor(t: number, palette: 'risk' | 'water' | 'heat' | 'rain' | 'food' | 'pop' = 'risk'): string {
  const x = Math.max(0, Math.min(1, t / 100));
  const stops: Record<string, [number, number, number][]> = {
    risk: [[22, 70, 48], [61, 245, 138], [245, 184, 61], [255, 122, 61], [255, 77, 94]],
    water: [[14, 52, 60], [79, 227, 240], [70, 140, 255], [140, 90, 255], [255, 77, 94]],
    heat: [[30, 50, 40], [198, 244, 50], [245, 184, 61], [255, 122, 61], [255, 60, 80]],
    rain: [[20, 60, 70], [79, 227, 240], [245, 184, 61], [255, 122, 61], [255, 77, 94]],
    food: [[24, 60, 46], [61, 245, 138], [198, 244, 50], [245, 184, 61], [255, 77, 94]],
    pop: [[30, 40, 60], [120, 140, 255], [170, 120, 255], [230, 110, 220], [255, 90, 140]],
  };
  const s = stops[palette];
  const p = x * (s.length - 1);
  const i = Math.min(s.length - 2, Math.floor(p));
  const f = p - i;
  const c = s[i].map((v, k) => Math.round(v + (s[i + 1][k] - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

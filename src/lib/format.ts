export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const round = (v: number, dp = 0) => Math.round(v * 10 ** dp) / 10 ** dp;
export const fmtInt = (v: number) => Math.round(v).toLocaleString('en-IN');
export const fmtSigned = (v: number, dp = 0, suffix = '') => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v).toFixed(dp)}${suffix}`;
export const fmtPct = (v: number, dp = 0) => `${v.toFixed(dp)}%`;
export function fmtTonnes(t: number) {
  if (Math.abs(t) >= 1e5) return `${(t / 1e5).toFixed(2)} L t`;
  return `${fmtInt(t)} t`;
}
export function fmtINR(v: number) {
  const a = Math.abs(v);
  if (a >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`;
  return `₹${fmtInt(v)}`;
}
export function timeAgo(minutes: number) {
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${Math.round(minutes)}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

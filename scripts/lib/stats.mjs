/** Small, dependency-free statistics helpers. All functions are pure. */
export const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN);
export const sum = (a) => a.reduce((s, v) => s + v, 0);

export function stdev(a) {
  if (a.length < 2) return NaN;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
}

export function pearson(x, y) {
  if (x.length !== y.length || x.length < 3) return NaN;
  const mx = mean(x), my = mean(y);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < x.length; i++) {
    num += (x[i] - mx) * (y[i] - my);
    dx += (x[i] - mx) ** 2;
    dy += (y[i] - my) ** 2;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : NaN;
}

/** Ranks with ties given the average rank. */
export function averageRanks(a) {
  const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]);
  const r = new Array(a.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r;
}

export const spearman = (x, y) => pearson(averageRanks(x), averageRanks(y));

/** Ordinary least squares for y = intercept + slope * x. */
export function ols(x, y) {
  if (x.length < 2) return { slope: NaN, intercept: NaN };
  const mx = mean(x), my = mean(y);
  let sxx = 0, sxy = 0;
  for (let i = 0; i < x.length; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); }
  const slope = sxx ? sxy / sxx : 0;
  return { slope, intercept: my - slope * mx };
}

export const mae = (p, o) => mean(p.map((v, i) => Math.abs(v - o[i])));
export const rmse = (p, o) => Math.sqrt(mean(p.map((v, i) => (v - o[i]) ** 2)));

/** Longest run of consecutive true values. */
export function longestRun(flags) {
  let best = 0, cur = 0;
  for (const f of flags) { cur = f ? cur + 1 : 0; if (cur > best) best = cur; }
  return best;
}

export const round = (v, dp = 1) => (Number.isFinite(v) ? Math.round(v * 10 ** dp) / 10 ** dp : null);

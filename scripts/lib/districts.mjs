/**
 * District registry shared by the data scripts.
 * Coordinates: approximate district headquarters (NASA POWER grid is ~0.5°, so this precision is sufficient).
 * Keep in step with DISTRICTS in scripts/fetch-climate.mjs and src/data/districts.ts.
 */
export const DISTRICTS = {
  ariyalur: [11.14, 79.08], chengalpattu: [12.69, 79.98], chennai: [13.08, 80.27], coimbatore: [11.02, 76.96],
  cuddalore: [11.75, 79.77], dharmapuri: [12.13, 78.16], dindigul: [10.36, 77.98], erode: [11.34, 77.72],
  kallakurichi: [11.74, 78.96], kancheepuram: [12.83, 79.7], kanyakumari: [8.18, 77.41], karur: [10.96, 78.08],
  krishnagiri: [12.52, 78.21], madurai: [9.93, 78.12], nagapattinam: [10.77, 79.84], namakkal: [11.22, 78.17],
  nilgiris: [11.41, 76.7], perambalur: [11.23, 78.88], pudukkottai: [10.38, 78.82], ramanathapuram: [9.37, 78.83],
  ranipet: [12.93, 79.33], salem: [11.66, 78.15], sivaganga: [9.85, 78.48], tenkasi: [8.96, 77.3],
  thanjavur: [10.79, 79.14], theni: [10.01, 77.48], thiruvallur: [13.14, 79.91], thiruvarur: [10.77, 79.64],
  thoothukkudi: [8.76, 78.13], tiruchirappalli: [10.79, 78.7], tirunelveli: [8.71, 77.76], tirupathur: [12.5, 78.57],
  tiruppur: [11.11, 77.34], tiruvannamalai: [12.23, 79.07], vellore: [12.92, 79.13], viluppuram: [11.94, 79.49],
  virudhunagar: [9.58, 77.96],
};

/**
 * Spellings of the SAME unit, keyed by normalised name.
 * Pre-split units (North Arcot, South Arcot, Chingleput) are deliberately not mapped: each covered several
 * of today's districts, so mapping one to a single district would be wrong.
 */
const ALIASES = {
  tanjore: 'thanjavur', tanjavur: 'thanjavur',
  tiruchirapalli: 'tiruchirappalli', tiruchirapally: 'tiruchirappalli', trichy: 'tiruchirappalli', trichirappalli: 'tiruchirappalli',
  nilgiri: 'nilgiris', thenkasi: 'tenkasi', tuticorin: 'thoothukkudi', thoothukudi: 'thoothukkudi',
  toothukudi: 'thoothukkudi', chidambanar: 'thoothukkudi',
  kanniyakumari: 'kanyakumari', kanchipuram: 'kancheepuram', kancheepuramdistrict: 'kancheepuram', kanchipuramdistrict: 'kancheepuram',
  thiruvallore: 'thiruvallur', tiruvallur: 'thiruvallur', villupuram: 'viluppuram',
  tiruvanamalai: 'tiruvannamalai', thiruvannamalai: 'tiruvannamalai',
  pudukottai: 'pudukkottai', ramnad: 'ramanathapuram', ramananthapuram: 'ramanathapuram', sivagangai: 'sivaganga',
  thirunelveli: 'tirunelveli', thiruppur: 'tiruppur', perambular: 'perambalur',
  madras: 'chennai', tiruvarur: 'thiruvarur',
};

/** Lower-case letters only, leading "the" removed. */
export function normaliseName(s) {
  return String(s ?? '').toLowerCase().replace(/^\s*the\s+/, '').replace(/[^a-z]/g, '');
}

/** One name → one id, or null. */
function singleId(name) {
  const k = normaliseName(name);
  if (!k) return null;
  const direct = Object.keys(DISTRICTS).find((id) => normaliseName(id) === k);
  if (direct) return direct;
  return ALIASES[k] ?? null;
}

/** Map a source spelling to a HarvestShield district id, or null. Does not handle composite names. */
export function districtIdFor(name) {
  return singleId(name);
}

/**
 * Every HarvestShield id a source name could refer to. ICRISAT writes some units as "Old / New" or
 * "Name (Alternate)". The whole name is tried first, then each part, then each word.
 * Returns [] when nothing matches, and more than one id when the name is ambiguous. The caller decides.
 */
export function candidateIds(name) {
  const whole = singleId(name);
  if (whole) return [whole];
  const parts = String(name ?? '').split(/[\/()]/).map((s) => s.trim()).filter(Boolean);
  const ids = new Set();
  for (const p of parts) {
    const id = singleId(p);
    if (id) ids.add(id);
  }
  for (const p of parts) {
    for (const word of p.split(/\s+/)) {
      const id = singleId(word);
      if (id) ids.add(id);
    }
  }
  return [...ids].sort();
}

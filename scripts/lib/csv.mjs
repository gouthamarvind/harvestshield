/** Minimal RFC-4180 CSV parser (quoted fields, escaped quotes, CRLF/LF) with header detection helpers. */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Returns objects keyed by the header text. Strips a UTF-8 BOM. */
export function rowsToObjects(rows) {
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map((h, i) => (i === 0 ? h.replace(/^﻿/, '') : h).trim());
  const records = rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])));
  return { headers, records };
}

/** Finds the first header matching the pattern. Returns the header text or null. */
export const findHeader = (headers, re) => headers.find((h) => re.test(h)) ?? null;

/**
 * Unit multipliers read from header text, e.g. "RICE AREA (1000 ha)" → 1000, "RICE PRODUCTION (1000 tons)" → 1000.
 * Lakh = 100,000. No marker in the header means the value is already in the base unit (ha or tonnes).
 */
export function areaMultiplier(header) {
  if (/1000\s*ha/i.test(header)) return 1000;
  if (/lakh/i.test(header)) return 100000;
  return 1;
}
export function productionMultiplier(header) {
  if (/1000\s*(t|ton)/i.test(header)) return 1000;
  if (/lakh/i.test(header)) return 100000;
  return 1;
}

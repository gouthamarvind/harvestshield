import { useCallback, useEffect, useState } from 'react';

/** Fallback when localStorage is blocked (private mode, disabled site data). Keeps state for the page session only. */
const memory = new Map<string, string>();

export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = (typeof window !== 'undefined' ? window.localStorage.getItem(key) : null) ?? memory.get(key) ?? null;
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStore<T>(key: string, value: T): void {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    /* storage unavailable: memory copy is still kept */
  }
}

/** useState backed by localStorage. Data stays in this browser only; it is not shared with other users. */
export function usePersisted<T>(key: string, fallback: T): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readStore(key, fallback));
  useEffect(() => { writeStore(key, value); }, [key, value]);
  const set = useCallback((next: T | ((prev: T) => T)) => {
    setValue((prev) => (typeof next === 'function' ? (next as (p: T) => T)(prev) : next));
  }, []);
  return [value, set];
}

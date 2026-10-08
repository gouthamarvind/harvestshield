import { useEffect, useRef, useState } from 'react';

/** Eased number tween; re-animates from the previous value whenever `target` changes. */
export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  const raf = useRef<number>();
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      const v = a + (target - a) * e;
      setValue(v);
      if (t < 1) raf.current = requestAnimationFrame(step);
      else from.current = target;
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      from.current = target;
    };
  }, [target, duration]);
  return value;
}

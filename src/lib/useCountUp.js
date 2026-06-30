import { useEffect, useRef, useState } from "react";

export function useCountUp(target, durationMs = 800) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || durationMs <= 0) { setValue(target); fromRef.current = target; return; }
    const from = fromRef.current;
    const delta = target - from;
    let raf;
    let start;
    const tick = (ts) => {
      if (start === undefined) start = ts;
      const p = Math.min(1, (ts - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setValue(from + delta * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

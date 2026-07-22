import { useEffect, useRef, useState } from "react";

// Infinite scroll over an in-memory list: reveal `chunk` more rows whenever
// the sentinel nears the viewport. Call reset() when filters/search change.
export default function useLazyRows(totalCount, chunk = 30) {
  const [visible, setVisible] = useState(chunk);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visible >= totalCount) return;
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible((v) => v + chunk),
      { rootMargin: "600px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible, totalCount, chunk]);

  return { visible, sentinelRef, reset: () => setVisible(chunk) };
}

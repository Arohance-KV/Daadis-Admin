// Shared date-range filtering: Today / 7 Days / 1 Month / Custom (+ All).
// A range is { key, from, to } where from/to are YYYY-MM-DD (custom only).
export const DAY = 86400000;

export const RANGE_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "1m", label: "1 Month" },
  { key: "custom", label: "Custom" },
];
export const RANGE_OPTIONS_ALL = [{ key: "all", label: "All" }, ...RANGE_OPTIONS];

export const localISO = (d) => d.toLocaleDateString("en-CA"); // YYYY-MM-DD local

// Returns { start, end } (end exclusive), or null for "all" (no filtering).
export function boundsFor(r) {
  if (r.key === "all") return null;
  const now = new Date();
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(today0.getTime() + DAY);
  switch (r.key) {
    case "7d": return { start: new Date(today0.getTime() - 6 * DAY), end };
    case "1m": return { start: new Date(today0.getTime() - 29 * DAY), end };
    case "custom": {
      const start = r.from ? new Date(r.from + "T00:00:00") : today0;
      const stop = r.to ? new Date(new Date(r.to + "T00:00:00").getTime() + DAY) : end;
      return { start, end: stop };
    }
    default: return { start: today0, end }; // today
  }
}

// Previous period of equal length, for delta comparisons.
export const prevOf = (b) =>
  b ? { start: new Date(2 * b.start.getTime() - b.end.getTime()), end: b.start } : null;

export const inRange = (orders, b) =>
  b ? orders.filter((o) => { const d = new Date(o.createdAt); return d >= b.start && d < b.end; }) : orders;

const shortDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export const rangeLabel = (r) =>
  r.key === "custom"
    ? `${r.from ? shortDate(r.from) : "…"} – ${r.to ? shortDate(r.to) : "…"}`
    : { all: "All time", today: "Today", "7d": "Last 7 days", "1m": "Last 30 days" }[r.key];

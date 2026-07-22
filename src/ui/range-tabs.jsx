import { cn } from "../lib/utils";
import { RANGE_OPTIONS } from "../lib/dateRange";

const dateInputCls =
  "rounded-[10px] border border-border bg-surface px-2.5 py-1.5 text-xs text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

export function CustomDates({ range, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <input type="date" aria-label="From date" value={range.from} max={range.to || undefined}
        onChange={(e) => onChange({ ...range, from: e.target.value })} className={dateInputCls} />
      <span className="text-xs text-muted">to</span>
      <input type="date" aria-label="To date" value={range.to} min={range.from || undefined}
        onChange={(e) => onChange({ ...range, to: e.target.value })} className={dateInputCls} />
    </div>
  );
}

export default function RangeTabs({ range, onChange, options = RANGE_OPTIONS }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-[12px] border border-border bg-surface p-1 shadow-sm" role="tablist" aria-label="Date range">
        {options.map((o) => (
          <button
            key={o.key}
            role="tab"
            aria-selected={range.key === o.key}
            onClick={() => onChange({ ...range, key: o.key })}
            className={cn(
              "rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              range.key === o.key ? "bg-primary text-primary-fg shadow-sm" : "text-muted hover:text-ink"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      {range.key === "custom" && <CustomDates range={range} onChange={onChange} />}
    </div>
  );
}

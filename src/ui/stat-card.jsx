import { Card } from "./card";
import Skeleton from "./skeleton";
import { useCountUp } from "../lib/useCountUp";

const DELTA_TONE = { up: "text-success", down: "text-danger", flat: "text-muted" };

export default function StatCard({ label, value = 0, format = (n) => Math.round(n).toLocaleString(), delta, icon: Icon, loading }) {
  const animated = useCountUp(loading ? 0 : value);
  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-8 w-28" />
      </Card>
    );
  }
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted">{label}</p>
        {Icon ? <span className="rounded-[10px] bg-primary/10 p-1.5 text-primary"><Icon className="h-4 w-4" /></span> : null}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold text-ink">{format(animated)}</p>
      {delta ? <p className={`mt-1 text-xs font-medium ${DELTA_TONE[delta.dir] || "text-muted"}`}>{delta.label}</p> : null}
    </Card>
  );
}

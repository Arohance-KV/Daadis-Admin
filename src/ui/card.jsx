import { cn } from "../lib/utils";

export function Card({ className, ...props }) {
  return <div className={cn("rounded-[18px] border border-border bg-surface shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(92,59,40,.22)]", className)} {...props} />;
}
export function CardHeader({ className, ...props }) {
  return <div className={cn("p-5 pb-0", className)} {...props} />;
}
export function CardTitle({ className, ...props }) {
  return <h3 className={cn("text-base font-semibold text-ink", className)} {...props} />;
}
export function CardContent({ className, ...props }) {
  return <div className={cn("p-5", className)} {...props} />;
}

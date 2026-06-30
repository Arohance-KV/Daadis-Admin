import { cn } from "../lib/utils";

const TONES = {
  neutral: "bg-surface-raised text-muted",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
};

export default function Badge({ tone = "info", className, ...props }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", TONES[tone] || TONES.info, className)} {...props} />;
}

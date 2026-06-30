export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[18px] border border-dashed border-border bg-surface/60 px-6 py-14 text-center">
      {Icon ? <Icon className="h-10 w-10 text-muted" /> : null}
      <p className="text-base font-semibold text-ink">{title}</p>
      {message ? <p className="max-w-sm text-sm text-muted">{message}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

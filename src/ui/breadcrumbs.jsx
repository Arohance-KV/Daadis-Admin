import { Link } from "react-router-dom";

export default function Breadcrumbs({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-border">/</span>}
          {it.to ? (
            <Link to={it.to} className="hover:text-text transition-colors">{it.label}</Link>
          ) : (
            <span className="text-text font-medium">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

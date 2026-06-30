# Daadis Admin Redesign — Milestone 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the premium design-token system (light/dark), restyle the shared UI primitives and app shell, and redesign the Dashboard with real-data charts — without changing any API, Redux, or form behavior.

**Architecture:** A CSS-variable token layer in `src/index.css` (consumed by Tailwind 4 `@theme inline`) is the single source of truth for color/shape/shadow. Dark mode is a `.dark` class on `<html>`, set pre-paint to avoid flash and toggled from the topbar. Existing `src/ui/*` primitives are restyled to reference token-backed Tailwind classes, so every page inherits the new look. The Dashboard derives all KPIs and charts from the orders/products data already in Redux via pure aggregation functions (unit-tested with Node's built-in test runner), rendered with `recharts`.

**Tech Stack:** React 19, Vite 7, Tailwind CSS 4, Redux Toolkit, Radix UI + CVA, recharts (new), Fraunces + Inter (self-hosted Google Fonts). Tests: `node --test` (built-in, no new dependency) for pure JS logic.

## Global Constraints

- Real, API-backed screens only — no new feature modules, no faked data. Charts/KPIs that the data cannot support are omitted, not invented.
- Motion via CSS/Tailwind only — no framer-motion.
- Exactly one new runtime dependency: `recharts`. No other runtime deps.
- Tests use Node's built-in `node --test` + `node:assert` — no test framework dependency. Only pure `.js` logic (no JSX) gets unit tests.
- Color tokens (verbatim): saffron `#F59E0B`, warm orange `#FB923C`, chocolate `#5C3B28`, cream `#FFF8EE`. Radius 12–18px. Spacing on an 8px grid. Transitions 250ms.
- Do not change `src/utils/api.js`, the Redux slices' logic, or form/validation behavior. Visual layer only.
- WCAG AA contrast in both themes; preserve Radix keyboard/focus behavior.

---

## File Structure

- `src/index.css` — token definitions (`:root` + `.dark`) and `@theme inline` mapping; font-face / imports. **Modify.**
- `index.html` — pre-paint theme script + font preconnect. **Modify.**
- `src/lib/theme.js` — pure theme-resolve helper + apply/persist functions. **Create.**
- `src/lib/theme.test.js` — `node --test` for resolve logic. **Create.**
- `src/hooks/useTheme.js` — React hook wrapping `theme.js`. **Create.**
- `src/ui/{button,input,label,checkbox,dialog,dropdown-menu,table}.jsx` — restyle to tokens. **Modify.**
- `src/ui/card.jsx`, `badge.jsx`, `stat-card.jsx`, `skeleton.jsx`, `empty-state.jsx`, `breadcrumbs.jsx` — new primitives. **Create.**
- `src/lib/useCountUp.js` — animated counter hook (rAF). **Create.**
- `src/components/Navbar.jsx` — sidebar restyle + grouping. **Modify.**
- `src/components/Topbar.jsx` — topbar restyle + theme toggle + breadcrumbs. **Modify.**
- `src/lib/dashboardData.js` — pure aggregation functions. **Create.**
- `src/lib/dashboardData.test.js` — `node --test` for aggregations. **Create.**
- `src/pages/Dashboard.jsx` — redesigned dashboard UI. **Modify.**

---

## Task 1: Design tokens, fonts & dark-mode infrastructure

**Files:**
- Modify: `src/index.css`
- Modify: `index.html`
- Create: `src/lib/theme.js`
- Create: `src/lib/theme.test.js`
- Create: `src/hooks/useTheme.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - CSS classes backed by tokens: `bg-bg`, `bg-surface`, `bg-surface-raised`, `text-text`, `text-muted`, `text-ink`, `border-border`, `bg-primary`, `text-primary`, `bg-accent`, and status colors `success|info|warn|danger` (each as `bg-*`, `text-*`, `bg-*-soft`).
  - `resolveTheme(stored, prefersDark) -> 'light' | 'dark'` (pure).
  - `applyTheme(theme)` — sets `.dark` on `document.documentElement` and writes `localStorage['daadis-theme']`.
  - `getStoredTheme() -> 'light' | 'dark' | null`.
  - `useTheme() -> { theme, toggle }`.

- [ ] **Step 1: Write the failing test for `resolveTheme`**

Create `src/lib/theme.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme } from './theme.js';

test('explicit stored value wins over system preference', () => {
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
});

test('falls back to system preference when nothing stored', () => {
  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme(null, false), 'light');
});

test('ignores invalid stored value', () => {
  assert.equal(resolveTheme('purple', true), 'dark');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/lib/theme.test.js`
Expected: FAIL — `Cannot find module './theme.js'` / `resolveTheme is not a function`.

- [ ] **Step 3: Create `src/lib/theme.js`**

```js
const STORAGE_KEY = 'daadis-theme';

export function resolveTheme(stored, prefersDark) {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}

export function getStoredTheme() {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  return v === 'light' || v === 'dark' ? v : null;
}

export function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  localStorage.setItem(STORAGE_KEY, theme);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test src/lib/theme.test.js`
Expected: PASS — 3 tests.

- [ ] **Step 5: Add the pre-paint theme script and font preconnect to `index.html`**

In `index.html`, inside `<head>` BEFORE the module script, add (this prevents a light-mode flash on dark loads):

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<script>
  (function () {
    try {
      var s = localStorage.getItem('daadis-theme');
      var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var t = (s === 'light' || s === 'dark') ? s : (d ? 'dark' : 'light');
      if (t === 'dark') document.documentElement.classList.add('dark');
    } catch (e) {}
  })();
</script>
```

- [ ] **Step 6: Define tokens and theme mapping in `src/index.css`**

Replace the contents of `src/index.css` with:

```css
@import "tailwindcss";

:root {
  --bg: #fff8ee;
  --surface: #ffffff;
  --surface-raised: #fdf3e3;
  --border: #ece0cf;
  --text: #3d2a1d;
  --muted: #8a7866;
  --ink: #5c3b28;

  --primary: #f59e0b;
  --primary-fg: #3d2a1d;
  --accent: #fb923c;

  --success: #16a34a; --success-soft: #dcfce7;
  --info: #2563eb;    --info-soft: #dbeafe;
  --warn: #d97706;    --warn-soft: #fef3c7;
  --danger: #dc2626;  --danger-soft: #fee2e2;

  --radius: 14px;
  --shadow-card: 0 1px 2px rgba(92,59,40,.04), 0 8px 24px -12px rgba(92,59,40,.12);
}

.dark {
  --bg: #1a1410;
  --surface: #241c16;
  --surface-raised: #2e251d;
  --border: rgba(255,248,238,.08);
  --text: #f5e9dc;
  --muted: #b6a392;
  --ink: #f5e9dc;

  --primary: #f59e0b;
  --primary-fg: #1a1410;
  --accent: #fb923c;

  --success: #4ade80; --success-soft: rgba(74,222,128,.12);
  --info: #60a5fa;    --info-soft: rgba(96,165,250,.12);
  --warn: #fbbf24;    --warn-soft: rgba(251,191,36,.12);
  --danger: #f87171;  --danger-soft: rgba(248,113,113,.12);

  --shadow-card: 0 1px 2px rgba(0,0,0,.3), 0 8px 24px -12px rgba(0,0,0,.5);
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-raised: var(--surface-raised);
  --color-border: var(--border);
  --color-text: var(--text);
  --color-muted: var(--muted);
  --color-ink: var(--ink);
  --color-primary: var(--primary);
  --color-primary-fg: var(--primary-fg);
  --color-accent: var(--accent);
  --color-success: var(--success);
  --color-success-soft: var(--success-soft);
  --color-info: var(--info);
  --color-info-soft: var(--info-soft);
  --color-warn: var(--warn);
  --color-warn-soft: var(--warn-soft);
  --color-danger: var(--danger);
  --color-danger-soft: var(--danger-soft);
  --radius: var(--radius);
  --font-display: "Fraunces", Georgia, serif;
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}

html, body, #root { height: 100%; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  transition: background-color 250ms ease, color 250ms ease;
}
h1, h2, h3, .font-display { font-family: var(--font-display); }
```

- [ ] **Step 7: Create the `useTheme` hook**

Create `src/hooks/useTheme.js`:

```js
import { useCallback, useEffect, useState } from 'react';
import { resolveTheme, getStoredTheme, applyTheme } from '../lib/theme.js';

export function useTheme() {
  const [theme, setTheme] = useState(() =>
    resolveTheme(getStoredTheme(), window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  useEffect(() => { applyTheme(theme); }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggle };
}
```

- [ ] **Step 8: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no CSS/import errors.

- [ ] **Step 9: Commit**

```bash
git add src/index.css index.html src/lib/theme.js src/lib/theme.test.js src/hooks/useTheme.js
git commit -m "feat(theme): add design tokens, fonts, and dark-mode infrastructure"
```

---

## Task 2: Restyle shared `ui/*` primitives to tokens

**Files:**
- Modify: `src/ui/button.jsx`, `src/ui/input.jsx`, `src/ui/label.jsx`, `src/ui/checkbox.jsx`, `src/ui/dialog.jsx`, `src/ui/dropdown-menu.jsx`, `src/ui/table.jsx`

**Interfaces:**
- Consumes: token classes from Task 1.
- Produces: same component exports and props as today (no API change) — only `className` strings change.

- [ ] **Step 1: Restyle `button.jsx` variants to tokens**

In `src/ui/button.jsx`, update the CVA `variants.variant` map to token classes (keep the same variant keys and the `cn`/`asChild` structure):

```js
default: "bg-primary text-primary-fg shadow-sm hover:brightness-105 active:brightness-95",
destructive: "bg-danger text-white hover:brightness-105",
outline: "border border-border bg-surface text-text hover:bg-surface-raised",
secondary: "bg-surface-raised text-text hover:brightness-[0.98]",
ghost: "text-text hover:bg-surface-raised",
link: "text-primary underline-offset-4 hover:underline",
minus: "bg-danger-soft text-danger hover:brightness-95",
```

Set the CVA `base` to include: `inline-flex items-center justify-center gap-2 rounded-[12px] text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 disabled:pointer-events-none`.

- [ ] **Step 2: Restyle `input.jsx` and `label.jsx`**

In `src/ui/input.jsx`, set the input `className` base to:

```
flex h-10 w-full rounded-[12px] border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50
```

In `src/ui/label.jsx`, set: `text-sm font-medium text-text`.

- [ ] **Step 3: Restyle `dialog.jsx`, `dropdown-menu.jsx`, `checkbox.jsx`**

In `src/ui/dialog.jsx`: overlay → `fixed inset-0 z-50 bg-black/40 backdrop-blur-sm`; content → `... rounded-[18px] border border-border bg-surface text-text shadow-[var(--shadow-card)] ...` (keep existing positioning/animation classes).
In `src/ui/dropdown-menu.jsx`: content → `... rounded-[12px] border border-border bg-surface text-text shadow-[var(--shadow-card)] ...`; item focus → `focus:bg-surface-raised`.
In `src/ui/checkbox.jsx`: checked state → `data-[state=checked]:bg-primary data-[state=checked]:text-primary-fg`; box → `border border-border rounded-[6px]`.

- [ ] **Step 4: Restyle `table.jsx`**

In `src/ui/table.jsx`: header row → `border-b border-border text-muted`; body rows → `border-b border-border hover:bg-surface-raised transition-colors`; cells → `text-text`. Keep the wrapping element/`cn` structure.

- [ ] **Step 5: Verify build and lint**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/ui/button.jsx src/ui/input.jsx src/ui/label.jsx src/ui/checkbox.jsx src/ui/dialog.jsx src/ui/dropdown-menu.jsx src/ui/table.jsx
git commit -m "feat(ui): restyle shared primitives to design tokens"
```

---

## Task 3: New UI primitives (Card, Badge, Skeleton, EmptyState, Breadcrumbs)

**Files:**
- Create: `src/ui/card.jsx`, `src/ui/badge.jsx`, `src/ui/skeleton.jsx`, `src/ui/empty-state.jsx`, `src/ui/breadcrumbs.jsx`

**Interfaces:**
- Consumes: `cn` from `src/lib/utils.js`; token classes from Task 1.
- Produces:
  - `Card({ className, children })`, `CardHeader`, `CardTitle`, `CardContent` (named exports).
  - `Badge({ tone = 'info' | 'success' | 'warn' | 'danger' | 'neutral', children })` (default export).
  - `Skeleton({ className })` (default export).
  - `EmptyState({ icon, title, message, action })` (default export).
  - `Breadcrumbs({ items })` where `items: { label: string, to?: string }[]` (default export).

- [ ] **Step 1: Create `card.jsx`**

```jsx
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
```

- [ ] **Step 2: Create `badge.jsx`**

```jsx
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
```

- [ ] **Step 3: Create `skeleton.jsx`**

```jsx
import { cn } from "../lib/utils";

export default function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-[12px] bg-surface-raised", className)} />;
}
```

- [ ] **Step 4: Create `empty-state.jsx`**

```jsx
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
```

- [ ] **Step 5: Create `breadcrumbs.jsx`**

```jsx
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
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/ui/card.jsx src/ui/badge.jsx src/ui/skeleton.jsx src/ui/empty-state.jsx src/ui/breadcrumbs.jsx
git commit -m "feat(ui): add card, badge, skeleton, empty-state, breadcrumbs primitives"
```

---

## Task 4: Animated counter + StatCard

**Files:**
- Create: `src/lib/useCountUp.js`
- Create: `src/ui/stat-card.jsx`

**Interfaces:**
- Consumes: `useCountUp` (this task), `Card` from `src/ui/card.jsx`, `Skeleton`, token classes.
- Produces:
  - `useCountUp(target, durationMs = 800) -> number` (rAF-based; respects `prefers-reduced-motion` by snapping to target).
  - `StatCard({ label, value, format, delta, tone, icon, loading })` (default export). `format` is an optional `(n) => string`.

- [ ] **Step 1: Create `useCountUp.js`**

```js
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
```

> No unit test: this is rAF/DOM-timed UI with no branching money/parse logic worth isolating (verified visually in Step 4). The reduced-motion branch is the only logic and is exercised on load.

- [ ] **Step 2: Create `stat-card.jsx`**

```jsx
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
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/lib/useCountUp.js src/ui/stat-card.jsx
git commit -m "feat(ui): add count-up hook and StatCard"
```

---

## Task 5: Redesign the Sidebar (Navbar)

**Files:**
- Modify: `src/components/Navbar.jsx`

**Interfaces:**
- Consumes: token classes; existing icon imports; existing collapse state mechanism.
- Produces: same routes/links as today, regrouped; collapse state persisted to `localStorage['daadis-nav-collapsed']`.

- [ ] **Step 1: Define grouped nav config and persisted collapse**

In `src/components/Navbar.jsx`, replace the flat menu array with grouped sections (use the icons already imported; keep `Link`/`useLocation`):

```js
const NAV_GROUPS = [
  { title: "Overview", items: [{ to: "/dashboard", label: "Dashboard", icon: HomeIcon }] },
  { title: "Catalog", items: [
    { to: "/products", label: "Products", icon: ShoppingBagIcon },
    { to: "/categories", label: "Categories", icon: TagIcon },
    { to: "/manufacturers", label: "Manufacturers", icon: BuildingOfficeIcon },
  ]},
  { title: "Sales", items: [
    { to: "/orders", label: "Orders", icon: ShoppingCartIcon },
    { to: "/discounts", label: "Discounts", icon: ReceiptPercentIcon },
  ]},
  { title: "Content", items: [{ to: "/blogs", label: "Blogs", icon: DocumentTextIcon }] },
  { title: "System", items: [{ to: "/settings", label: "Settings", icon: CogIcon }] },
];
```

Initialize collapse from storage: `const [collapsed, setCollapsed] = useState(() => localStorage.getItem('daadis-nav-collapsed') === '1');` and persist in an effect: `useEffect(() => { localStorage.setItem('daadis-nav-collapsed', collapsed ? '1' : '0'); }, [collapsed]);`

- [ ] **Step 2: Restyle the sidebar shell and render groups**

Sidebar container classes: `flex h-full flex-col border-r border-border bg-surface transition-[width] duration-250 ${collapsed ? 'w-[72px]' : 'w-64'}`. Render each group with a muted uppercase label (hidden when collapsed) and its items. Each item:

```jsx
<Link
  to={item.to}
  className={cn(
    "group flex items-center gap-3 rounded-[12px] px-3 py-2 text-sm font-medium transition-all duration-200",
    isActive
      ? "bg-primary text-primary-fg shadow-sm"
      : "text-muted hover:bg-surface-raised hover:text-text"
  )}
>
  <item.icon className="h-5 w-5 shrink-0" />
  {!collapsed && <span className="truncate">{item.label}</span>}
</Link>
```

where `isActive = location.pathname.startsWith(item.to)`. Group label: `{!collapsed && <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{group.title}</p>}`.

- [ ] **Step 3: Add the pinned profile block at the bottom**

After the nav list, pinned with `mt-auto`:

```jsx
<div className="mt-auto border-t border-border p-3">
  <div className="flex items-center gap-3">
    <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-semibold text-primary-fg">
      {(user?.firstName?.[0] || "A").toUpperCase()}
    </div>
    {!collapsed && (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text">{user?.firstName || "Admin"}</p>
        <p className="truncate text-xs text-muted">{user?.email}</p>
      </div>
    )}
  </div>
</div>
```

Read `user` from Redux as the component does today (`useSelector((s) => s.auth.user)`). Keep the existing collapse toggle button, restyled as a `ghost` button with a chevron.

- [ ] **Step 4: Verify build and visual check**

Run: `npm run build` then `npm run dev` and confirm: groups render, active item is saffron, collapse persists across reload, dark mode looks correct.
Expected: build succeeds; sidebar matches the spec.

- [ ] **Step 5: Commit**

```bash
git add src/components/Navbar.jsx
git commit -m "feat(shell): redesign sidebar with grouped nav and profile block"
```

---

## Task 6: Redesign the Topbar (theme toggle, breadcrumbs, search, glass)

**Files:**
- Modify: `src/components/Topbar.jsx`

**Interfaces:**
- Consumes: `useTheme` (Task 1), `Breadcrumbs` (Task 3), existing dropdown-menu + Redux auth/logout.
- Produces: a sticky, glassy topbar; theme toggle wired to `useTheme`.

- [ ] **Step 1: Wire theme toggle and breadcrumbs**

In `src/components/Topbar.jsx`, import `{ useTheme }` and `Breadcrumbs`, plus `SunIcon`/`MoonIcon` from `@heroicons/react/24/outline`. Build breadcrumb items from the route:

```js
import { useLocation } from "react-router-dom";
const LABELS = { dashboard: "Dashboard", products: "Products", categories: "Categories", manufacturers: "Manufacturers", orders: "Orders", discounts: "Discounts", blogs: "Blogs", settings: "Settings" };
const seg = useLocation().pathname.split("/").filter(Boolean)[0] || "dashboard";
const crumbs = [{ label: "Daadis", to: "/dashboard" }, { label: LABELS[seg] || seg }];
const { theme, toggle } = useTheme();
```

- [ ] **Step 2: Restyle the topbar shell**

Container: `sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-surface/80 px-6 backdrop-blur-md`. Left side renders `<Breadcrumbs items={crumbs} />`. Right side holds: a search input (token-styled, `w-64`, placeholder "Search…"), the theme toggle, and the existing profile dropdown (restyled). The search input updates a `useState` and is non-functional-global for now (per spec, filters the current list view in M2); render it but do not wire cross-page search.

- [ ] **Step 3: Add the theme toggle button**

```jsx
<button
  onClick={toggle}
  aria-label="Toggle theme"
  className="grid h-9 w-9 place-items-center rounded-[12px] border border-border bg-surface text-muted transition-colors hover:bg-surface-raised hover:text-text"
>
  {theme === "dark" ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
</button>
```

Keep the existing profile dropdown markup but swap colors to tokens (`bg-surface`, `text-text`, `hover:bg-surface-raised`).

- [ ] **Step 4: Verify build and visual check**

Run: `npm run build` then `npm run dev`. Confirm: topbar sticks on scroll with blur, theme toggle flips light/dark with no flash on reload, breadcrumbs reflect the route, profile dropdown works.
Expected: build succeeds; topbar matches spec.

- [ ] **Step 5: Commit**

```bash
git add src/components/Topbar.jsx
git commit -m "feat(shell): redesign topbar with theme toggle, breadcrumbs, glass"
```

---

## Task 7: Dashboard data aggregations (pure, tested)

**Files:**
- Create: `src/lib/dashboardData.js`
- Create: `src/lib/dashboardData.test.js`

**Interfaces:**
- Consumes: arrays of order objects (`{ total, status, paymentMethod, createdAt, items: [{ product, name, quantity }] }`) and product objects (`{ _id, name, stock, salesCount }`) — fields that exist in the Redux slices.
- Produces (all pure, named exports):
  - `kpis(orders, products) -> { revenue, totalOrders, pending, delivered, inStockUnits, outOfStock, aov }`
  - `revenueByDay(orders) -> { date: string, revenue: number }[]` (sorted ascending by date)
  - `statusBreakdown(orders) -> { status: string, count: number }[]`
  - `paymentSplit(orders) -> { method: string, count: number }[]`
  - `topProducts(products, n = 5) -> { name: string, sales: number }[]` (desc by sales)
  - `categoryPerformance(orders) -> { category: string, revenue: number }[]` — uses `item.category` when present, else `"Uncategorized"`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/dashboardData.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kpis, revenueByDay, statusBreakdown, paymentSplit, topProducts } from './dashboardData.js';

const orders = [
  { total: 100, status: 'delivered', paymentMethod: 'card', createdAt: '2026-06-01T10:00:00Z', items: [{ name: 'Ladoo', quantity: 2 }] },
  { total: 50,  status: 'pending',   paymentMethod: 'cod',  createdAt: '2026-06-01T12:00:00Z', items: [{ name: 'Barfi', quantity: 1 }] },
  { total: 150, status: 'delivered', paymentMethod: 'card', createdAt: '2026-06-02T09:00:00Z', items: [{ name: 'Ladoo', quantity: 3 }] },
];
const products = [
  { name: 'Ladoo', stock: 10, salesCount: 40 },
  { name: 'Barfi', stock: 0,  salesCount: 25 },
];

test('kpis aggregates revenue, counts, stock, aov', () => {
  const k = kpis(orders, products);
  assert.equal(k.revenue, 300);
  assert.equal(k.totalOrders, 3);
  assert.equal(k.pending, 1);
  assert.equal(k.delivered, 2);
  assert.equal(k.inStockUnits, 10);
  assert.equal(k.outOfStock, 1);
  assert.equal(k.aov, 100);
});

test('aov is 0 when there are no orders', () => {
  assert.equal(kpis([], products).aov, 0);
});

test('revenueByDay groups by calendar day, sorted', () => {
  const r = revenueByDay(orders);
  assert.deepEqual(r, [
    { date: '2026-06-01', revenue: 150 },
    { date: '2026-06-02', revenue: 150 },
  ]);
});

test('statusBreakdown counts statuses', () => {
  const s = Object.fromEntries(statusBreakdown(orders).map((x) => [x.status, x.count]));
  assert.equal(s.delivered, 2);
  assert.equal(s.pending, 1);
});

test('paymentSplit counts methods', () => {
  const p = Object.fromEntries(paymentSplit(orders).map((x) => [x.method, x.count]));
  assert.equal(p.card, 2);
  assert.equal(p.cod, 1);
});

test('topProducts sorts by sales desc and limits', () => {
  const t = topProducts(products, 1);
  assert.deepEqual(t, [{ name: 'Ladoo', sales: 40 }]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test src/lib/dashboardData.test.js`
Expected: FAIL — module/exports not found.

- [ ] **Step 3: Implement `dashboardData.js`**

```js
const num = (v) => (typeof v === "number" && isFinite(v) ? v : Number(v) || 0);
const day = (iso) => String(iso || "").slice(0, 10);

export function kpis(orders = [], products = []) {
  const revenue = orders.reduce((s, o) => s + num(o.total), 0);
  const totalOrders = orders.length;
  const pending = orders.filter((o) => o.status === "pending").length;
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const inStockUnits = products.reduce((s, p) => s + num(p.stock), 0);
  const outOfStock = products.filter((p) => num(p.stock) === 0).length;
  const aov = totalOrders ? Math.round(revenue / totalOrders) : 0;
  return { revenue, totalOrders, pending, delivered, inStockUnits, outOfStock, aov };
}

export function revenueByDay(orders = []) {
  const map = new Map();
  for (const o of orders) {
    const d = day(o.createdAt);
    if (!d) continue;
    map.set(d, num(map.get(d)) + num(o.total));
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, revenue]) => ({ date, revenue }));
}

export function statusBreakdown(orders = []) {
  const map = new Map();
  for (const o of orders) map.set(o.status || "unknown", (map.get(o.status || "unknown") || 0) + 1);
  return [...map.entries()].map(([status, count]) => ({ status, count }));
}

export function paymentSplit(orders = []) {
  const map = new Map();
  for (const o of orders) {
    const m = o.paymentMethod || "other";
    map.set(m, (map.get(m) || 0) + 1);
  }
  return [...map.entries()].map(([method, count]) => ({ method, count }));
}

export function topProducts(products = [], n = 5) {
  return [...products]
    .map((p) => ({ name: p.name, sales: num(p.salesCount) }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, n);
}

export function categoryPerformance(orders = []) {
  const map = new Map();
  for (const o of orders) {
    for (const it of o.items || []) {
      const c = it.category || "Uncategorized";
      map.set(c, num(map.get(c)) + num(it.price) * num(it.quantity));
    }
  }
  return [...map.entries()].map(([category, revenue]) => ({ category, revenue }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test src/lib/dashboardData.test.js`
Expected: PASS — all tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboardData.js src/lib/dashboardData.test.js
git commit -m "feat(dashboard): add tested pure data-aggregation functions"
```

---

## Task 8: Install recharts and redesign the Dashboard UI

**Files:**
- Modify: `package.json` (via `npm install`)
- Modify: `src/pages/Dashboard.jsx`

**Interfaces:**
- Consumes: `StatCard` (Task 4), `Card`/`CardHeader`/`CardTitle`/`CardContent` (Task 3), `Skeleton`, `EmptyState`, all aggregation functions (Task 7), `recharts`, existing Redux thunks/selectors for orders & products.
- Produces: the redesigned Dashboard (no new exports).

- [ ] **Step 1: Install recharts**

Run: `npm install recharts`
Expected: `recharts` added to `dependencies`; lockfile updated.

- [ ] **Step 2: Build the KPI row from real data**

In `src/pages/Dashboard.jsx`, keep the existing data loading (Redux dispatch of orders/products thunks and the time-range filter). Compute `const k = kpis(orders, products);` and render a responsive grid of `StatCard`s:

```jsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
  <StatCard label="Revenue" value={k.revenue} format={(n) => "₹" + Math.round(n).toLocaleString("en-IN")} loading={loading} icon={CurrencyRupeeIcon} />
  <StatCard label="Total Orders" value={k.totalOrders} loading={loading} icon={ShoppingCartIcon} />
  <StatCard label="Pending Orders" value={k.pending} loading={loading} icon={ClockIcon} />
  <StatCard label="Delivered" value={k.delivered} loading={loading} icon={CheckCircleIcon} />
  <StatCard label="Products in Stock" value={k.inStockUnits} loading={loading} icon={ArchiveBoxIcon} />
  <StatCard label="Out of Stock" value={k.outOfStock} loading={loading} icon={ExclamationTriangleIcon} />
  <StatCard label="Avg Order Value" value={k.aov} format={(n) => "₹" + Math.round(n).toLocaleString("en-IN")} loading={loading} icon={BanknotesIcon} />
</div>
```

(Use Heroicons that already ship with the project; substitute any unavailable icon with an available one.)

- [ ] **Step 3: Add the charts grid (recharts, themed)**

Read the primary color from the token at render with a constant `const C = { primary: "#f59e0b", accent: "#fb923c", grid: "var(--border)" };`. Render charts inside `Card`s, each wrapped in `<ResponsiveContainer width="100%" height={260}>`:

- Revenue trend: `<AreaChart data={revenueByDay(orders)}>` with `XAxis dataKey="date"`, `YAxis`, `Tooltip`, and an `Area dataKey="revenue"` filled with a saffron→transparent gradient.
- Order-status: `<PieChart>` with `<Pie data={statusBreakdown(orders)} dataKey="count" nameKey="status" innerRadius={55} outerRadius={85} />` + `<Legend />`.
- Top products: `<BarChart data={topProducts(products)} layout="vertical">` with `Bar dataKey="sales" fill={C.primary} radius={[0,6,6,0]}`.
- Payment split: `<PieChart>` donut from `paymentSplit(orders)`.

For each chart Card, when its data array is empty show `<EmptyState title="No data in this range" />` instead of the chart.

- [ ] **Step 4: Add loading and error states**

While `loading`, render `StatCard ... loading` (handled) and `<Skeleton className="h-[260px]" />` in each chart Card. If the orders/products fetch errored (existing `error` state in Redux), render `<EmptyState title="Couldn't load dashboard" message={String(error)} />` at the top of the content area.

- [ ] **Step 5: Verify build, tests, and visual check**

Run: `npm run build` then `npm run dev`.
Confirm: KPIs animate and show real numbers; charts render from real data; empty/loading/error states work; light & dark both look correct; layout is responsive at mobile/tablet/desktop widths.
Expected: build succeeds; Dashboard matches spec.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/pages/Dashboard.jsx
git commit -m "feat(dashboard): redesign with real-data KPIs and recharts visuals"
```

---

## Self-Review

**Spec coverage:**
- Tokens / palette / radius / shadows / 8px / 250ms → Task 1. ✅
- Fonts (Fraunces + Inter) → Task 1 Step 5/6. ✅
- Dark mode (class, persisted, no flash, system pref) → Task 1. ✅
- Restyled `ui/*` primitives → Task 2. ✅
- New primitives (Card, Badge, StatCard, Skeleton, EmptyState, Breadcrumbs) → Tasks 3–4. ✅
- Sidebar (grouped real sections, active indicator, collapse persist, profile block) → Task 5. ✅
- Topbar (sticky glass, theme toggle, breadcrumbs, search slot, profile dropdown; no Messages) → Task 6. ✅
- Dashboard real-data KPIs (dropped non-derivable ones) → Tasks 7–8. ✅
- Charts derived from real data → Tasks 7–8. ✅
- Skeleton/empty/error states → Tasks 3, 8. ✅
- One new dep (recharts), CSS-only motion → Tasks 1, 4, 8. ✅
- WCAG AA / keyboard (Radix preserved) → constraints carried throughout. ✅

**Placeholder scan:** Code present for every code step; the only deliberate non-test note is `useCountUp` (rAF/DOM, no isolatable logic) — justified inline. No TBD/TODO.

**Type consistency:** `kpis` field names match between test and impl and Dashboard usage (`revenue`, `totalOrders`, `pending`, `delivered`, `inStockUnits`, `outOfStock`, `aov`). `useTheme() -> { theme, toggle }` matches Topbar usage. `Breadcrumbs({ items })` shape matches Topbar. Aggregation export names match Dashboard imports.

## Out of scope (Milestone 2 — separate plan)

Applying the system to Orders, Products, Categories, Manufacturers, Discounts, Blogs, Settings, Login; wiring the topbar search to per-page list filtering.

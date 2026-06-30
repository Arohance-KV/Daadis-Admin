# Daadis Admin — Premium Redesign (Design Spec)

**Date:** 2026-06-30
**Status:** Approved (design) — pending spec review
**Scope owner:** Admin dashboard UI for the Daadis snacks & sweets brand

## Goal

Redesign the existing admin dashboard to a premium, Awwwards-quality visual
standard (Apple/Stripe/Linear/Shopify Admin level) while reflecting the warmth
of a high-end Indian snacks & sweets brand. This is a **visual redesign of the
real, API-backed application** — not new feature modules.

## Constraints & decisions (locked)

- **Real screens only.** Redesign the 9 existing API-backed screens. Do NOT
  build screens for sections that have no backend (Customers, Inventory,
  Reviews, Delivery Tracking, Payments, Analytics, Marketing, Notifications,
  Support Tickets, Admin Management). No fake feature modules.
- **Charts derive from real data.** Aggregate the existing orders/products
  lists client-side (group by date, category, status, payment method). No
  invented numbers. KPIs/charts that the data genuinely cannot support are
  dropped, not faked.
- **Motion via CSS/Tailwind only.** No framer-motion. Hover elevation, 250ms
  transitions, animated counters, staggered entrance — all CSS + tiny JS.
- **One new dependency: `recharts`** (React 19 compatible) for charts.
- **Delivery:** Milestone 1 (system + theme + shell + Dashboard) ships first
  for review; Milestone 2 rolls the system across the remaining screens.

## Existing stack (build on, do not replace)

React 19 · Vite 7 · Tailwind CSS 4 · Redux Toolkit · React Router 7 ·
Radix UI + CVA + `tailwind-merge`/`clsx` (shadcn-style `src/ui/`) ·
React Hook Form + Zod · TanStack Table · Sonner (toasts) · Heroicons + Lucide ·
API client `src/utils/api.js` → `https://api.daadis.in` (Bearer token).

The 9 real screens: Login, Dashboard, Products, Categories, Manufacturers,
Discounts (coupons), Blogs, Orders, Settings.

## Design language

### Color tokens (semantic, CSS variables)

Defined as CSS custom properties consumed by Tailwind 4 via `@theme` in
`src/index.css`. Dark mode flips values under `.dark` on `<html>`.

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--brand-primary` | `#F59E0B` (saffron) | `#F59E0B` | primary actions, active nav |
| `--brand-accent` | `#FB923C` (warm orange) | `#FB923C` | accents, gradient end |
| `--brand-ink` | `#5C3B28` (chocolate) | `#F5E9DC` | headings/strong text |
| `--bg` | `#FFF8EE` (cream) | `#1A1410` | page background |
| `--surface` | `#FFFFFF` | `#241C16` | cards/panels |
| `--surface-raised` | soft beige | `#2E251D` | hover/raised |
| `--border` | warm gray-200 | warm white @ ~8% | hairlines |
| `--text` / `--text-muted` | chocolate / warm gray | cream / muted cream | body / secondary |
| status `success/info/warn/danger` | green/blue/amber/red | same hues, dark-tuned | each with tinted-bg + solid-text pair |

Premium accent gradient: `--brand-primary` → `--brand-accent`, used sparingly
(hero KPI, active states, CTA).

### Typography, spacing, shape, motion

- **Type pairing:** a display/heading face + a UI sans (final fonts confirmed
  at build; default to a refined system-friendly pairing if no preference).
  Semantic scale: display / h1–h3 / body / caption.
- **Spacing:** strict 8px system.
- **Radius:** 12–18px on cards/inputs/modals.
- **Shadows:** soft, layered, low-opacity (no harsh drop shadows).
- **Motion:** 250ms ease standard; hover elevation; counters; staggered loads.
- **Glassmorphism:** only on sticky topbar (blur-on-scroll) and modals.

### Dark mode

`.dark` class on `<html>`. Topbar toggle. Persisted to `localStorage`
(`daadis-theme`). First load respects `prefers-color-scheme`. No flash:
inline pre-paint script sets the class before React mounts.

## Component system

Restyle existing `src/ui/*` to tokens (no prop/API changes → all pages upgrade
for free): `button`, `input`, `label`, `checkbox`, `form`, `dialog`,
`dropdown-menu`, `table`. Restyle Sonner toasts to tokens.

Add primitives the redesign needs:
- `Card` — token surface, soft shadow, hover elevation.
- `Badge` — status variants from the status tokens.
- `StatCard` — KPI tile with animated count-up + optional delta + sparkline slot.
- `Skeleton` — shimmer loading block.
- `EmptyState` — icon + message + optional action.
- `Breadcrumbs` — route-derived.

Each primitive is a small, single-purpose file in `src/ui/`, styled with CVA +
tokens, following the existing shadcn-style pattern.

## Shell

### Sidebar (`src/components/Navbar.jsx`, restyled)

Keep existing collapse logic; restyle. Show only the 8 real sections, grouped:

- **Overview:** Dashboard
- **Catalog:** Products, Categories, Manufacturers
- **Sales:** Orders, Discounts
- **Content:** Blogs
- **System:** Settings

Active indicator (saffron), smooth hover, expand/collapse animation, collapse
state persisted to `localStorage`. Profile block pinned at bottom.

### Topbar (`src/components/Topbar.jsx`, restyled)

Sticky; glass blur intensifies on scroll. Contains: breadcrumbs (left), global
search (filters the current list view), theme toggle, profile dropdown (reuses
existing Redux `auth.user` + logout). **No "Messages"** — no backend; the slot
is omitted rather than faked.

## Dashboard (flagship — `src/pages/Dashboard.jsx`)

All values derived from real `orders` + `products` data already in Redux.

**KPI stat cards (real, animated counters):**
Today's revenue, total orders, pending orders, delivered orders, products in
stock, out-of-stock count, average order value.
_Dropped (not derivable, not faked):_ conversion rate, returning customers,
total customers — unless a later data source is added.

**Charts (recharts, themed to tokens):**
- Revenue trend — orders summed by date over the selected range.
- Order-status breakdown — pie/donut from order statuses.
- Top selling products — bar, by sales/quantity.
- Category performance — bar, revenue per category.
- Payment-method split — donut, from order payment data.

Keep the existing time-range filter (today/week/month/annual/all). Add skeleton
loaders, empty states (no data in range), error states (API failure), and
staggered card entrance.

## States & accessibility (applies to all redesigned screens)

- Skeleton loading, empty, and error states for every data view.
- WCAG AA contrast on both themes; visible focus rings; keyboard-navigable
  nav, menus, dialogs (Radix already provides focus management).
- Responsive: desktop / tablet / mobile (sidebar collapses to overlay on
  mobile).

## Milestones

- **M1 (this spec, build first):** tokens + dark mode + restyled `ui/*` + new
  primitives + shell (sidebar/topbar) + Dashboard. → review.
- **M2 (after M1 review):** apply system to Orders, Products, Categories,
  Manufacturers, Discounts, Blogs, Settings, Login.

## Out of scope

New backend endpoints; the 10 spec sections without APIs; framer-motion;
swapping the stack; auth/business-logic changes.

## Success criteria

- Light + dark themes, no flash, persisted.
- All 9 real screens visually consistent on the token system.
- Dashboard KPIs/charts reflect real data only.
- No new dependency except `recharts`.
- Existing API/Redux/form behavior unchanged.

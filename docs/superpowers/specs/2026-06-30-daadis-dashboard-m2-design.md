# Daadis Dashboard — Milestone 2 (Data correctness + new cards)

**Date:** 2026-06-30
**Status:** Approved (design) — continuation on branch `redesign/m1-system-shell-dashboard`
**Builds on:** [Milestone 1 spec](2026-06-30-daadis-admin-redesign-design.md)

## Goal

Make the Dashboard's numbers correct and add the data-rich cards the user
requested, all from real APIs. No new dependencies.

## Decisions (locked)

- **Order-received emails:** NOT built — sending email on order creation is a
  server responsibility the admin frontend cannot fulfill. Documented as a
  backend follow-up; no notification UI in this milestone.
- **Customer export:** CSV (opens in Excel), generated client-side via Blob.
  No xlsx library.
- **Orders spike graph:** single combo chart — revenue (value) + order count
  (packets) over the selected range.
- **Low-stock threshold:** stock `>= 100` In Stock, `1–99` Low Stock, `0` Out
  of Stock.

## Root correctness bug (must fix first)

`Dashboard.jsx` fetched only `limit: 100` orders and products, so Revenue,
Total Orders, stock counts, and the Annual/All ranges were computed over at
most 100 records. Fix: fetch **all** pages.

- Orders response: `{ orders, total, totalPages, currentPage, limit }`.
- Products response: `{ products, page, pages, total, limit }`.
- Add `fetchAllOrders` / `fetchAllProducts` thunks that read page 1, then
  fetch remaining pages and concatenate. Count KPIs may also use the server
  `total`. ponytail: simple sequential/parallel page loop, cap pages defensively.

## Real data shapes (verified)

- Order: `_id, orderNumber, createdAt, status, paymentMethod, paymentStatus,
  total, trackingNumber?, shippingAddress.{name, phone, ...},
  items[].{productName, productCode, quantity, priceAtPurchase, itemTotal}`.
- Product: `_id, name, code, price, stock, ...`.
- No customer endpoint (derive from `shippingAddress`), no email field, no
  SKU-sales endpoint (derive from `items[].productCode`).

## Features

### KPIs (time-range aware, now over all orders)
Revenue, Total Orders, **Total Products** (new), Pending, Delivered, AOV.
Remove the unused `fetchCategories`/`fetchDiscounts` dispatches ("remove
active categories").

### Inventory Status card
Counts with threshold 100: In Stock (≥100), Low Stock (1–99), Out of Stock
(0). "Manage Inventory" → `/products`.

### Orders spike (replaces plain revenue trend)
Combo chart over the selected range: revenue area/line (left axis) + order
count bars (right axis), grouped by day.

### Sales by SKU card
Table from order line items keyed by `productCode`: SKU · product · qty sold ·
revenue (sum of `itemTotal`), sorted by qty desc.

### Customers card + CSV
Derived from `shippingAddress` keyed by phone: name, phone, # orders, total
spent, last order date; sorted by total spent. Top rows shown; "Download CSV"
exports the full list.

### Clickable navigation
Order-status donut segments and the Pending/Delivered KPI cards navigate to
`/orders?status=<status>`; the Orders page initializes its status filter from
that query param. Covers "Processing/Completed clickable."

## New pure functions (unit-tested via `node --test`)

- `inventoryStatus(products, low = 100) -> { inStock, lowStock, outOfStock }`
- `ordersSpike(orders) -> { date, revenue, count }[]` (asc by date)
- `skuSales(orders) -> { sku, name, qty, revenue }[]` (desc by qty)
- `customers(orders) -> { name, phone, orders, totalSpent, lastOrder }[]` (desc by totalSpent)
- `kpis` extended with `totalProducts`
- `toCSV(rows, columns)` -> CSV string (RFC-4180 escaping); pure, tested. The
  Blob download wrapper is DOM-only, untested.

## Out of scope
Emailed order notifications (backend); any new dependency; changes to
api.js request logic or auth.

## Known limitation (follow-up in Orders-page redesign / M3)
The Orders page filters client-side over its own paginated page (10/order
fetch); the orders API has no `status` query param. So a dashboard deep-link
(`/orders?status=delivered`) correctly pre-selects the filter but only matches
within the currently loaded page. Full cross-page status filtering needs either
a server-side `status` param or the Orders page loading all orders when a
filter is active — deferred to the Orders-page redesign.

## Success criteria
- KPIs/charts reflect ALL orders/products, not one page.
- Inventory buckets use the 100 threshold.
- Spike chart shows revenue + count.
- SKU and Customers cards populate from real data; CSV downloads the full list.
- Status segments/KPIs deep-link to filtered Orders.
- No new dependency; `node --test` green; build green.

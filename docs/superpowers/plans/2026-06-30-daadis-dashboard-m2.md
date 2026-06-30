# Daadis Dashboard — Milestone 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Fix the Dashboard's data-correctness bug (only 100 records loaded) and add Inventory Status, an orders spike combo chart, a Sales-by-SKU card, and a Customers card with CSV export — all from real APIs, no new dependencies.

**Architecture:** Add `fetchAllOrders`/`fetchAllProducts` thunks that page through the paginated endpoints and store the full arrays. Add pure, unit-tested aggregation functions to `src/lib/dashboardData.js` plus a pure CSV builder in `src/lib/csv.js`. Rebuild `src/pages/Dashboard.jsx` to consume them and deep-link status segments to the Orders page, which reads a `?status=` filter.

**Tech Stack:** React 19, Redux Toolkit, recharts (already installed), Tailwind 4 tokens. Tests: Node built-in `node --test`.

## Global Constraints

- Real API data only; no fabricated numbers. No new dependency (CSV via Blob).
- Order response: `{ orders, total, totalPages, currentPage, limit }`. Product response: `{ products, page, pages, total, limit }`.
- Real fields: order `{ _id, orderNumber, createdAt, status, paymentMethod, paymentStatus, total, shippingAddress.{name,phone}, items[].{productName, productCode, quantity, priceAtPurchase, itemTotal} }`; product `{ _id, name, code, stock }`.
- Low-stock threshold: `>=100` In Stock, `1–99` Low, `0` Out.
- Do not change `src/utils/api.js` request logic or auth. Tests via `node --test` only (no framework dep).
- Status values seen in app: pending, processing, shipped, delivered, cancelled, failed, returned, paid.

---

## Task 1: Fetch-all thunks for orders and products

**Files:**
- Modify: `src/redux/slices/ordersSlice.js`
- Modify: `src/redux/slices/productsSlice.js`

**Interfaces:**
- Produces: `fetchAllOrders()` thunk → sets `state.orders` to the full list and `state.pagination.total`. `fetchAllProducts()` thunk → sets `state.products` to the full list and pagination total.

- [ ] **Step 1: Add `fetchAllOrders` thunk to ordersSlice**

In `src/redux/slices/ordersSlice.js`, after the existing `fetchOrders` thunk, add:

```js
// Fetch every page of orders so dashboard aggregates are accurate.
// ponytail: sequential page loop, hard-capped at 200 pages (safety).
export const fetchAllOrders = createAsyncThunk(
  'orders/fetchAllOrders',
  async (_, { rejectWithValue }) => {
    try {
      const first = await ordersAPI.getAllOrders({ page: 1, limit: 100 });
      const data = first.data;
      let all = data.orders || [];
      const totalPages = Math.min(data.totalPages || 1, 200);
      for (let p = 2; p <= totalPages; p++) {
        const res = await ordersAPI.getAllOrders({ page: p, limit: 100 });
        all = all.concat(res.data.orders || []);
      }
      return { orders: all, total: data.total ?? all.length, totalPages, currentPage: 1, limit: 100 };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

- [ ] **Step 2: Handle `fetchAllOrders` in extraReducers**

In the same file's `extraReducers`, add cases mirroring `fetchOrders` (reuse the same shape):

```js
      .addCase(fetchAllOrders.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAllOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload.orders;
        state.pagination = {
          total: action.payload.total,
          totalPages: action.payload.totalPages,
          currentPage: action.payload.currentPage,
          limit: action.payload.limit,
        };
      })
      .addCase(fetchAllOrders.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
```

- [ ] **Step 3: Add `fetchAllProducts` thunk to productsSlice**

In `src/redux/slices/productsSlice.js`, after `fetchProducts`, add:

```js
// Fetch every page of products for accurate inventory/stock aggregates.
// ponytail: sequential page loop, hard-capped at 200 pages (safety).
export const fetchAllProducts = createAsyncThunk(
  'products/fetchAllProducts',
  async (_, { rejectWithValue }) => {
    try {
      const first = await productsAPI.getAllProducts({ page: 1, limit: 100 });
      let all = first.data.products || [];
      const pages = Math.min(first.data.pages || 1, 200);
      for (let p = 2; p <= pages; p++) {
        const res = await productsAPI.getAllProducts({ page: p, limit: 100 });
        all = all.concat(res.data.products || []);
      }
      return {
        products: all,
        pagination: { page: 1, pages, total: first.data.total ?? all.length, limit: 100 },
      };
    } catch (error) {
      return rejectWithValue({ message: error.message || 'Failed to fetch products' });
    }
  }
);
```

- [ ] **Step 4: Handle `fetchAllProducts` in extraReducers**

Add cases mirroring `fetchProducts.fulfilled` (set `state.products = action.payload.products` and `state.pagination = action.payload.pagination`), plus pending/rejected like the existing ones.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/redux/slices/ordersSlice.js src/redux/slices/productsSlice.js
git commit -m "feat(data): add fetchAllOrders/fetchAllProducts paging thunks"
```

---

## Task 2: Pure aggregations + CSV builder (tested)

**Files:**
- Modify: `src/lib/dashboardData.js`
- Create: `src/lib/csv.js`
- Modify: `src/lib/dashboardData.test.js`
- Create: `src/lib/csv.test.js`

**Interfaces:**
- Produces (all pure):
  - `kpis(orders, products)` extended with `totalProducts: products.length`.
  - `inventoryStatus(products, low = 100) -> { inStock, lowStock, outOfStock }`
  - `ordersSpike(orders) -> { date, revenue, count }[]` (asc by date)
  - `skuSales(orders) -> { sku, name, qty, revenue }[]` (desc by qty)
  - `customers(orders) -> { name, phone, orders, totalSpent, lastOrder }[]` (desc by totalSpent)
  - `toCSV(rows, columns)` where `columns: {key,label}[]` -> RFC-4180 CSV string.

- [ ] **Step 1: Write failing tests for the new aggregations**

Append to `src/lib/dashboardData.test.js` (and extend the imports on line 3 to include `inventoryStatus, ordersSpike, skuSales, customers`):

```js
test('kpis includes totalProducts', () => {
  assert.equal(kpis(orders, products).totalProducts, 2);
});

test('inventoryStatus buckets by threshold 100', () => {
  const inv = inventoryStatus([
    { stock: 0 }, { stock: 1 }, { stock: 99 }, { stock: 100 }, { stock: 250 },
  ]);
  assert.deepEqual(inv, { inStock: 2, lowStock: 2, outOfStock: 1 });
});

test('ordersSpike groups revenue and count per day, asc', () => {
  assert.deepEqual(ordersSpike(orders), [
    { date: '2026-06-01', revenue: 150, count: 2 },
    { date: '2026-06-02', revenue: 150, count: 1 },
  ]);
});

test('skuSales aggregates qty and revenue per productCode, desc by qty', () => {
  const skuOrders = [
    { items: [{ productCode: 'LAD', productName: 'Ladoo', quantity: 2, itemTotal: 200 }] },
    { items: [{ productCode: 'LAD', productName: 'Ladoo', quantity: 3, itemTotal: 300 }, { productCode: 'BAR', productName: 'Barfi', quantity: 1, itemTotal: 50 }] },
  ];
  assert.deepEqual(skuSales(skuOrders), [
    { sku: 'LAD', name: 'Ladoo', qty: 5, revenue: 500 },
    { sku: 'BAR', name: 'Barfi', qty: 1, revenue: 50 },
  ]);
});

test('customers aggregates by phone, desc by totalSpent', () => {
  const custOrders = [
    { total: 100, createdAt: '2026-06-01T10:00:00Z', shippingAddress: { name: 'Asha', phone: '9991' } },
    { total: 250, createdAt: '2026-06-03T10:00:00Z', shippingAddress: { name: 'Asha', phone: '9991' } },
    { total: 80,  createdAt: '2026-06-02T10:00:00Z', shippingAddress: { name: 'Ravi', phone: '8882' } },
  ];
  assert.deepEqual(customers(custOrders), [
    { name: 'Asha', phone: '9991', orders: 2, totalSpent: 350, lastOrder: '2026-06-03' },
    { name: 'Ravi', phone: '8882', orders: 1, totalSpent: 80, lastOrder: '2026-06-02' },
  ]);
});
```

- [ ] **Step 2: Run tests; confirm they fail**

Run: `node --test src/lib/dashboardData.test.js`
Expected: FAIL — `inventoryStatus`/`ordersSpike`/`skuSales`/`customers` undefined; `totalProducts` undefined.

- [ ] **Step 3: Implement the new aggregations**

In `src/lib/dashboardData.js`, add `totalProducts` to the `kpis` return object (change the return line):

```js
  return { revenue, totalOrders, pending, delivered, inStockUnits, outOfStock, aov, totalProducts: products.length };
```

Then append these functions:

```js
export function inventoryStatus(products = [], low = 100) {
  let inStock = 0, lowStock = 0, outOfStock = 0;
  for (const p of products) {
    const s = num(p.stock);
    if (s === 0) outOfStock++;
    else if (s < low) lowStock++;
    else inStock++;
  }
  return { inStock, lowStock, outOfStock };
}

export function ordersSpike(orders = []) {
  const map = new Map();
  for (const o of orders) {
    const d = day(o.createdAt);
    if (!d) continue;
    const cur = map.get(d) || { revenue: 0, count: 0 };
    cur.revenue += num(o.total);
    cur.count += 1;
    map.set(d, cur);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, revenue: v.revenue, count: v.count }));
}

export function skuSales(orders = []) {
  const map = new Map();
  for (const o of orders) {
    for (const it of o.items || []) {
      const sku = it.productCode || it.productName || "Unknown";
      const cur = map.get(sku) || { sku, name: it.productName || sku, qty: 0, revenue: 0 };
      cur.qty += num(it.quantity);
      cur.revenue += num(it.itemTotal) || num(it.priceAtPurchase) * num(it.quantity);
      map.set(sku, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty);
}

export function customers(orders = []) {
  const map = new Map();
  for (const o of orders) {
    const addr = o.shippingAddress || {};
    const key = addr.phone || addr.name || "Unknown";
    const d = day(o.createdAt);
    const cur = map.get(key) || { name: addr.name || "Unknown", phone: addr.phone || "", orders: 0, totalSpent: 0, lastOrder: "" };
    cur.orders += 1;
    cur.totalSpent += num(o.total);
    if (d > cur.lastOrder) cur.lastOrder = d;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.totalSpent - a.totalSpent);
}
```

- [ ] **Step 4: Run tests; confirm pass**

Run: `node --test src/lib/dashboardData.test.js`
Expected: PASS (all, including the new cases).

- [ ] **Step 5: Write failing CSV test**

Create `src/lib/csv.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCSV } from './csv.js';

const cols = [{ key: 'name', label: 'Name' }, { key: 'spent', label: 'Total Spent' }];

test('toCSV writes header and rows', () => {
  const out = toCSV([{ name: 'Asha', spent: 350 }], cols);
  assert.equal(out, 'Name,Total Spent\r\nAsha,350');
});

test('toCSV escapes commas, quotes, and newlines', () => {
  const out = toCSV([{ name: 'Doe, John "JD"', spent: 'a\nb' }], cols);
  assert.equal(out, 'Name,Total Spent\r\n"Doe, John ""JD""","a\nb"');
});

test('toCSV renders missing values as empty', () => {
  const out = toCSV([{ name: 'Asha' }], cols);
  assert.equal(out, 'Name,Total Spent\r\nAsha,');
});
```

- [ ] **Step 6: Run CSV test; confirm fail**

Run: `node --test src/lib/csv.test.js`
Expected: FAIL — `./csv.js` not found.

- [ ] **Step 7: Implement `src/lib/csv.js`**

```js
// RFC-4180 CSV string builder (pure). The Blob download wrapper lives in the
// component layer (DOM-only, not unit-tested).
function cell(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(rows = [], columns = []) {
  const header = columns.map((c) => cell(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => cell(row[c.key])).join(","));
  return [header, ...lines].join("\r\n");
}
```

- [ ] **Step 8: Run CSV test; confirm pass**

Run: `node --test src/lib/csv.test.js`
Expected: PASS — 3 tests.

- [ ] **Step 9: Commit**

```bash
git add src/lib/dashboardData.js src/lib/dashboardData.test.js src/lib/csv.js src/lib/csv.test.js
git commit -m "feat(dashboard): add inventory/spike/sku/customer aggregations + CSV builder"
```

---

## Task 3: Orders page reads a `?status=` filter

**Files:**
- Modify: `src/pages/orders.jsx`

**Interfaces:**
- Consumes: a `status` query param (e.g. `/orders?status=processing`).
- Produces: the orders list initializes its status filter from that param.

- [ ] **Step 1: Initialize the status filter from the URL**

In `src/pages/orders.jsx`, find the existing status-filter state (the value bound to the status filter `<select>`/logic). Import `useSearchParams` from `react-router-dom` and seed the initial filter value from it:

```jsx
import { useSearchParams } from 'react-router-dom';
// inside component:
const [searchParams] = useSearchParams();
const initialStatus = searchParams.get('status') || 'all';
// use initialStatus as the initial value of the existing status-filter useState
```

If the page already has `const [statusFilter, setStatusFilter] = useState('all')` (or similar), change the initializer to `useState(initialStatus)`. Do not otherwise change the filtering logic. If the existing filter state name differs, adapt to it — the goal is: navigating to `/orders?status=processing` lands with that status pre-selected.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/pages/orders.jsx
git commit -m "feat(orders): initialize status filter from ?status= query param"
```

---

## Task 4: Rebuild the Dashboard (KPIs, inventory, spike, SKU, customers, clickable)

**Files:**
- Modify: `src/pages/Dashboard.jsx`

**Interfaces:**
- Consumes: `fetchAllOrders`, `fetchAllProducts` (Task 1); `kpis, inventoryStatus, ordersSpike, skuSales, customers, statusBreakdown, paymentSplit` (Task 2); `toCSV` (Task 2); `Card*`, `StatCard`, `Skeleton`, `EmptyState`.

- [ ] **Step 1: Switch data loading to fetch-all and drop unused fetches**

In `src/pages/Dashboard.jsx` replace the mount effect:

```jsx
useEffect(() => {
  dispatch(fetchAllProducts());
  dispatch(fetchAllOrders());
}, [dispatch]);
```

Remove the `fetchCategories`/`fetchDiscounts` imports and dispatches ("remove active categories"). Update the imports from the slices to `fetchAllOrders` / `fetchAllProducts`.

- [ ] **Step 2: Add the Total Products KPI and keep KPIs time-range correct**

In the KPI grid, add a StatCard for Total Products (use `k.totalProducts`, icon `ShoppingBagIcon`). Keep Revenue, Total Orders, Pending, Delivered, AOV. Revenue/Orders/Pending/Delivered/AOV come from `kpis(filteredOrders, products)`; Total Products from the full `products` (not time-filtered). Make the Pending and Delivered StatCards clickable — wrap each in a button (or add `onClick`) that calls `navigate('/orders?status=pending')` / `'/orders?status=delivered'`. Add `cursor-pointer` affordance.

- [ ] **Step 3: Add the Inventory Status card (threshold 100)**

Compute `const inv = inventoryStatus(products);` and render a Card titled "Inventory Status" with three rows: In Stock (`inv.inStock`, green dot), Low Stock (`inv.lowStock`, amber dot), Out of Stock (`inv.outOfStock`, red dot), and a "Manage Inventory" button → `navigate('/products')`. Use the status token colors (`text-success`, `text-warn`, `text-danger`). Show `<Skeleton>` rows while `loading`.

- [ ] **Step 4: Replace the revenue trend with the orders spike combo chart**

Compute `const spike = ordersSpike(filteredOrders);`. Replace the existing "Revenue Trend" AreaChart card with a combo chart titled "Orders Spike". Use recharts `ComposedChart`:

```jsx
import { ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// ...
<ResponsiveContainer width="100%" height={280}>
  <ComposedChart data={spike} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
    <defs>
      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={C.primary} stopOpacity={0.35} />
        <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
      </linearGradient>
    </defs>
    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} />
    <YAxis yAxisId="rev" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} tickFormatter={(v) => '₹' + (v >= 1000 ? Math.round(v/1000) + 'k' : v)} />
    <YAxis yAxisId="cnt" orientation="right" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: '12px' }} />
    <Legend wrapperStyle={{ fontSize: '11px' }} />
    <Bar yAxisId="cnt" dataKey="count" name="Orders" fill={C.accent} radius={[4,4,0,0]} barSize={18} />
    <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke={C.primary} strokeWidth={2} fill="url(#revGrad)" dot={false} />
  </ComposedChart>
</ResponsiveContainer>
```

Keep the loading `<Skeleton className="h-[280px]" />` and `spike.length === 0 → <EmptyState title="No data in this range" />` branches.

- [ ] **Step 5: Make the Order Status donut segments clickable**

On the existing Order Status `<Pie>`, add an `onClick` to each segment that navigates to `/orders?status=<status>`. Either add `onClick={() => navigate('/orders?status=' + entry.status)}` on each `<Cell>` (set `cursor-pointer`) or an `onClick` on the `<Pie>` reading `(data) => navigate('/orders?status=' + data.status)`. Keep the donut otherwise unchanged.

- [ ] **Step 6: Add the Sales by SKU card**

Compute `const skus = skuSales(filteredOrders).slice(0, 8);`. Render a Card "Sales by SKU" with a simple table: columns SKU, Product, Qty, Revenue (`inr(row.revenue)`). Loading → Skeleton; empty → `<EmptyState title="No sales in this range" />`. Use the restyled table tokens or a plain token-styled table.

- [ ] **Step 7: Add the Customers card with CSV download**

Compute `const custs = customers(filteredOrders);`. Render a Card "Customers" showing the top 8 rows (Name, Phone, Orders, Total Spent) and a "Download CSV" button. The button builds the CSV from the FULL `custs` list and triggers a download:

```jsx
import { toCSV } from '../lib/csv';
// ...
const downloadCustomersCsv = () => {
  const csv = toCSV(custs, [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'orders', label: 'Orders' },
    { key: 'totalSpent', label: 'Total Spent' },
    { key: 'lastOrder', label: 'Last Order' },
  ]);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'daadis-customers.csv';
  a.click();
  URL.revokeObjectURL(url);
};
```

Disable the button when `custs.length === 0`. Loading → Skeleton; empty → `<EmptyState title="No customers in this range" />`.

- [ ] **Step 8: Verify build and tests**

Run: `npm run build` then `node --test src/lib/dashboardData.test.js src/lib/csv.test.js`
Confirm in `npm run dev`: KPIs reflect all orders; Total Products shows; Inventory Status uses the 100 threshold; spike chart shows revenue + count; SKU and Customers cards populate; CSV downloads; clicking Pending/Delivered KPIs and status segments lands on Orders pre-filtered; light + dark both fine.
Expected: build + tests green.

- [ ] **Step 9: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat(dashboard): all-data KPIs, inventory status, orders spike, SKU + customers CSV, clickable status"
```

---

## Self-Review

**Spec coverage:** fetch-all correctness (T1), Total Products + remove categories fetch (T4.1–2), Inventory Status threshold 100 (T2+T4.3), orders spike combo (T4.4), Sales by SKU (T2+T4.6), Customers + CSV (T2+T4.7), clickable status → filtered Orders (T3+T4.2/4.5). Email notifications intentionally omitted (documented). ✅

**Placeholder scan:** complete code for every code/test step; no TBD. Task 3 adapts to the existing filter state name — explicitly called out, not a placeholder.

**Type consistency:** `inventoryStatus → {inStock,lowStock,outOfStock}`, `ordersSpike → {date,revenue,count}`, `skuSales → {sku,name,qty,revenue}`, `customers → {name,phone,orders,totalSpent,lastOrder}`, `toCSV(rows, columns:{key,label}[])` — used consistently across tasks.

## Out of scope
Emailed order notifications (backend); any new dependency; auth/api request-layer changes.

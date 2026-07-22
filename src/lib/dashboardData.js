const num = (v) => (typeof v === "number" && isFinite(v) ? v : Number(v) || 0);
const day = (iso) => String(iso || "").slice(0, 10);

export function kpis(orders = [], products = []) {
  const revenue = orders.reduce((s, o) => s + num(o.total), 0);
  const totalOrders = orders.length;
  const pending = orders.filter((o) => o.status === "pending").length;
  const delivered = orders.filter((o) => o.status === "delivered").length;
  // Delivered is rarely updated by hand — shipped effectively means completed.
  const completed = orders.filter((o) => o.status === "shipped" || o.status === "delivered").length;
  const inStockUnits = products.reduce((s, p) => s + num(p.stock), 0);
  const outOfStock = products.filter((p) => num(p.stock) === 0).length;
  const aov = totalOrders ? Math.round(revenue / totalOrders) : 0;
  const packets = orders.reduce((s, o) => s + (o.items || []).reduce((q, it) => q + num(it.quantity), 0), 0);
  return { revenue, totalOrders, pending, delivered, completed, inStockUnits, outOfStock, aov, packets, totalProducts: products.length };
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
    const cur = map.get(d) || { revenue: 0, count: 0, packets: 0 };
    cur.revenue += num(o.total);
    cur.count += 1;
    cur.packets += (o.items || []).reduce((q, it) => q + num(it.quantity), 0);
    map.set(d, cur);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));
}

// Fill zero-value days between start/end so the spike chart shows gaps honestly.
// ponytail: skip filling for ranges > 120 days, raw points are fine there.
export function fillSpikeDays(spike = [], start, end) {
  if (!start || !end) return spike;
  const days = Math.ceil((end - start) / 86400000);
  if (days <= 0 || days > 120) return spike;
  const map = new Map(spike.map((r) => [r.date, r]));
  const out = [];
  for (let t = new Date(start); t < end; t = new Date(t.getTime() + 86400000)) {
    const d = t.toISOString().slice(0, 10);
    out.push(map.get(d) || { date: d, revenue: 0, count: 0, packets: 0 });
  }
  return out;
}

export function recentOrders(orders = [], n = 8) {
  return [...orders]
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, n);
}

export function skuSales(orders = []) {
  const map = new Map();
  for (const o of orders) {
    for (const it of o.items || []) {
      const sku = it.productCode || it.productName || "Unknown";
      const cur = map.get(sku) || { sku, name: it.productName || sku, qty: 0, revenue: 0 };
      cur.qty += num(it.quantity);
      cur.revenue += it.itemTotal != null ? num(it.itemTotal) : num(it.priceAtPurchase) * num(it.quantity);
      map.set(sku, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty);
}

// One row per customer, guest and registered alike. `user` is populated
// ({name,email}) on admin order fetches; guests carry guestInfo instead.
export function customers(orders = []) {
  const map = new Map();
  for (const o of orders) {
    const addr = o.shippingAddress || {};
    const guest = o.guestInfo || {};
    const name = o.user?.name || addr.name || guest.name || "Unknown";
    const phone = addr.phone || guest.phone || "";
    const email = o.user?.email || guest.email || "";
    const key = phone || email || name;
    const d = day(o.createdAt);
    const cur = map.get(key) || { name, phone, email, registered: false, orders: 0, totalSpent: 0, lastOrder: "" };
    cur.orders += 1;
    cur.totalSpent += num(o.total);
    if (o.user) cur.registered = true;
    if (email && !cur.email) cur.email = email;
    if (d > cur.lastOrder) cur.lastOrder = d;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.totalSpent - a.totalSpent);
}

// Top sellers derived from real order line items (quantity sold per product),
// since products carry no salesCount field in the API. Order items use
// `productName` (see orders.jsx / InvoicePrint.jsx).
export function topProducts(orders = [], n = 5) {
  const map = new Map();
  for (const o of orders) {
    for (const it of o.items || []) {
      const name = it.productName || it.name || "Unknown";
      map.set(name, num(map.get(name)) + num(it.quantity));
    }
  }
  return [...map.entries()]
    .map(([name, sales]) => ({ name, sales }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, n);
}

// Per-product performance: one row per catalogue product, joined to sales by
// product `code` ↔ order item `productCode` (same join key as skuSales; the
// `product` ObjectId isn't reliable once populated). Products with no matching
// line items come back with unitsSold/revenue = 0 → the underperformers list.
export function productPerformance(orders = [], products = []) {
  const sales = new Map(); // code -> { units, revenue }
  for (const o of orders) {
    for (const it of o.items || []) {
      const code = it.productCode || it.productName;
      if (!code) continue;
      const cur = sales.get(code) || { units: 0, revenue: 0 };
      cur.units += num(it.quantity);
      cur.revenue += it.itemTotal != null ? num(it.itemTotal) : num(it.priceAtPurchase) * num(it.quantity);
      sales.set(code, cur);
    }
  }
  return products.map((p) => {
    const s = sales.get(p.code) || { units: 0, revenue: 0 };
    return { id: p._id, name: p.name, code: p.code, stock: num(p.stock), unitsSold: s.units, revenue: s.revenue };
  });
}

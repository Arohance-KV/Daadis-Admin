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

// Top sellers derived from real order line items (quantity sold per product name),
// since products carry no salesCount field in the API.
export function topProducts(orders = [], n = 5) {
  const map = new Map();
  for (const o of orders) {
    for (const it of o.items || []) {
      const name = it.name || "Unknown";
      map.set(name, num(map.get(name)) + num(it.quantity));
    }
  }
  return [...map.entries()]
    .map(([name, sales]) => ({ name, sales }))
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

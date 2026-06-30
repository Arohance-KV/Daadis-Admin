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
  return { revenue, totalOrders, pending, delivered, inStockUnits, outOfStock, aov, totalProducts: products.length };
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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kpis, revenueByDay, statusBreakdown, topProducts, inventoryStatus, ordersSpike, fillSpikeDays, recentOrders, skuSales, customers } from './dashboardData.js';

// Item shape mirrors the real API (orders.jsx / InvoicePrint.jsx): productName, quantity, priceAtPurchase, itemTotal.
const orders = [
  { total: 100, status: 'delivered', paymentMethod: 'card', createdAt: '2026-06-01T10:00:00Z', items: [{ productName: 'Ladoo', quantity: 2 }] },
  { total: 50,  status: 'pending',   paymentMethod: 'cod',  createdAt: '2026-06-01T12:00:00Z', items: [{ productName: 'Barfi', quantity: 1 }] },
  { total: 150, status: 'delivered', paymentMethod: 'card', createdAt: '2026-06-02T09:00:00Z', items: [{ productName: 'Ladoo', quantity: 3 }] },
];
const products = [
  { name: 'Ladoo', stock: 10 },
  { name: 'Barfi', stock: 0 },
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

test('kpis sums packets (item quantities) across orders', () => {
  assert.equal(kpis(orders, products).packets, 6);
});

test('kpis counts shipped + delivered as completed', () => {
  const mixed = [
    { status: 'shipped' }, { status: 'delivered' }, { status: 'pending' }, { status: 'cancelled' },
  ];
  assert.equal(kpis(mixed, []).completed, 2);
});

test('topProducts sums quantity sold per productName from order items, desc, limited', () => {
  // Ladoo: 2 + 3 = 5, Barfi: 1
  assert.deepEqual(topProducts(orders), [
    { name: 'Ladoo', sales: 5 },
    { name: 'Barfi', sales: 1 },
  ]);
  assert.deepEqual(topProducts(orders, 1), [{ name: 'Ladoo', sales: 5 }]);
});

test('topProducts does not crash on missing items and labels unknowns', () => {
  const messy = [{ items: undefined }, { items: [{ quantity: 2 }] }];
  assert.deepEqual(topProducts(messy), [{ name: 'Unknown', sales: 2 }]);
});

test('kpis includes totalProducts', () => {
  assert.equal(kpis(orders, products).totalProducts, 2);
});

test('inventoryStatus buckets by threshold 100', () => {
  const inv = inventoryStatus([
    { stock: 0 }, { stock: 1 }, { stock: 99 }, { stock: 100 }, { stock: 250 },
  ]);
  assert.deepEqual(inv, { inStock: 2, lowStock: 2, outOfStock: 1 });
});

test('ordersSpike groups revenue, count and packets per day, asc', () => {
  assert.deepEqual(ordersSpike(orders), [
    { date: '2026-06-01', revenue: 150, count: 2, packets: 3 },
    { date: '2026-06-02', revenue: 150, count: 1, packets: 3 },
  ]);
});

test('fillSpikeDays pads missing days with zeros inside the range', () => {
  const spike = ordersSpike(orders);
  const filled = fillSpikeDays(spike, new Date('2026-05-31T00:00:00Z'), new Date('2026-06-03T00:00:00Z'));
  assert.deepEqual(filled.map((r) => r.date), ['2026-05-31', '2026-06-01', '2026-06-02']);
  assert.deepEqual(filled[0], { date: '2026-05-31', revenue: 0, count: 0, packets: 0 });
  assert.equal(filled[1].revenue, 150);
});

test('fillSpikeDays leaves ranges over 120 days unfilled', () => {
  const spike = ordersSpike(orders);
  assert.equal(fillSpikeDays(spike, new Date('2025-01-01'), new Date('2026-01-01')), spike);
});

test('recentOrders sorts newest first and limits', () => {
  const r = recentOrders(orders, 2);
  assert.equal(r.length, 2);
  assert.equal(r[0].createdAt, '2026-06-02T09:00:00Z');
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

test('skuSales falls back to priceAtPurchase*qty only when itemTotal absent, keeps a real 0', () => {
  const skuOrders = [
    // itemTotal absent -> fallback 25*2 = 50
    { items: [{ productCode: 'FALL', productName: 'Fallback', quantity: 2, priceAtPurchase: 25 }] },
    // itemTotal explicitly 0 (free sample) -> revenue stays 0, no fallback
    { items: [{ productCode: 'FREE', productName: 'Sample', quantity: 1, priceAtPurchase: 99, itemTotal: 0 }] },
  ];
  assert.deepEqual(skuSales(skuOrders), [
    { sku: 'FALL', name: 'Fallback', qty: 2, revenue: 50 },
    { sku: 'FREE', name: 'Sample', qty: 1, revenue: 0 },
  ]);
});

test('customers aggregates by phone, desc by totalSpent, tags guest vs registered', () => {
  const custOrders = [
    { total: 100, createdAt: '2026-06-01T10:00:00Z', shippingAddress: { name: 'Asha', phone: '9991' }, user: { name: 'Asha K', email: 'asha@x.in' } },
    { total: 250, createdAt: '2026-06-03T10:00:00Z', shippingAddress: { name: 'Asha', phone: '9991' } },
    { total: 80,  createdAt: '2026-06-02T10:00:00Z', shippingAddress: { name: 'Ravi', phone: '8882' }, guestInfo: { email: 'ravi@x.in' } },
  ];
  assert.deepEqual(customers(custOrders), [
    { name: 'Asha K', phone: '9991', email: 'asha@x.in', registered: true, orders: 2, totalSpent: 350, lastOrder: '2026-06-03' },
    { name: 'Ravi', phone: '8882', email: 'ravi@x.in', registered: false, orders: 1, totalSpent: 80, lastOrder: '2026-06-02' },
  ]);
});

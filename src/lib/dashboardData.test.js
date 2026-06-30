import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kpis, revenueByDay, statusBreakdown, paymentSplit, topProducts, inventoryStatus, ordersSpike, skuSales, customers } from './dashboardData.js';

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

test('paymentSplit counts methods', () => {
  const p = Object.fromEntries(paymentSplit(orders).map((x) => [x.method, x.count]));
  assert.equal(p.card, 2);
  assert.equal(p.cod, 1);
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

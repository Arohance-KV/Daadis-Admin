import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kpis, revenueByDay, statusBreakdown, paymentSplit, topProducts, categoryPerformance } from './dashboardData.js';

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

test('topProducts sums quantity sold per name from order items, desc, limited', () => {
  // Ladoo: 2 + 3 = 5, Barfi: 1
  assert.deepEqual(topProducts(orders), [
    { name: 'Ladoo', sales: 5 },
    { name: 'Barfi', sales: 1 },
  ]);
  assert.deepEqual(topProducts(orders, 1), [{ name: 'Ladoo', sales: 5 }]);
});

test('categoryPerformance sums price*quantity per category, falls back to Uncategorized', () => {
  const catOrders = [
    { items: [{ category: 'Sweets', price: 100, quantity: 2 }, { category: 'Namkeen', price: 50, quantity: 1 }] },
    { items: [{ category: 'Sweets', price: 100, quantity: 1 }, { price: 20, quantity: 3 }] }, // missing category
    { items: undefined }, // missing items: must not crash
  ];
  const c = Object.fromEntries(categoryPerformance(catOrders).map((x) => [x.category, x.revenue]));
  assert.equal(c.Sweets, 300);        // 100*2 + 100*1
  assert.equal(c.Namkeen, 50);        // 50*1
  assert.equal(c.Uncategorized, 60);  // 20*3
});

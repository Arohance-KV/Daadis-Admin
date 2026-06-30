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

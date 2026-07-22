// pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  CurrencyRupeeIcon,
  ShoppingCartIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  ShoppingBagIcon,
  TagIcon,
  GiftIcon,
  CubeIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
} from '@heroicons/react/24/outline';

import {
  ComposedChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { fetchAllProducts } from '../redux/slices/productsSlice';
import { fetchAllOrders } from '../redux/slices/ordersSlice';

import {
  kpis,
  inventoryStatus,
  ordersSpike,
  fillSpikeDays,
  recentOrders,
  skuSales,
  customers,
  statusBreakdown,
  topProducts,
  productPerformance,
  isPaid,
} from '../lib/dashboardData';
import { useCountUp } from '../lib/useCountUp';
import { RANGE_OPTIONS, localISO, boundsFor, prevOf, inRange, rangeLabel } from '../lib/dateRange';
import RangeTabs, { CustomDates } from '../ui/range-tabs';
import StatCard from '../ui/stat-card';
import Badge from '../ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import Skeleton from '../ui/skeleton';
import EmptyState from '../ui/empty-state';

const C = { primary: '#f59e0b', accent: '#fb923c' };
const STATUS_COLORS = ['#f59e0b', '#fb923c', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#6b7280'];
const STATUS_TONES = {
  pending: 'warn',
  processing: 'info',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'danger',
  failed: 'danger',
  returned: 'danger',
};

const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const shortDate = (iso) =>
  new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// % change vs the previous period of equal length; null when no baseline
const deltaOf = (cur, prev) => {
  if (prev <= 0) return null;
  const p = ((cur - prev) / prev) * 100;
  return { dir: p > 0.05 ? 'up' : p < -0.05 ? 'down' : 'flat', pct: p };
};

const DeltaLine = ({ delta }) => {
  if (!delta) return <p className="mt-1 text-xs text-muted">no previous data to compare</p>;
  const tone = delta.dir === 'up' ? 'text-success' : delta.dir === 'down' ? 'text-danger' : 'text-muted';
  const Arrow = delta.dir === 'down' ? ArrowDownRightIcon : ArrowUpRightIcon;
  return (
    <p className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${tone}`}>
      <Arrow className="h-3.5 w-3.5" />
      {delta.pct >= 0 ? '+' : ''}{delta.pct.toFixed(1)}% vs previous period
    </p>
  );
};

// KPI card with its own independent range filter (Revenue / Orders)
const FilteredKpiCard = ({ label, icon, range, onChange, value, prevValue, format = (n) => Math.round(n).toLocaleString('en-IN'), loading }) => {
  const Icon = icon; // uppercase alias so core no-unused-vars (no react plugin) doesn't flag the param
  const animated = useCountUp(loading ? 0 : value);
  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-8 w-28" />
      </Card>
    );
  }
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-[10px] bg-primary/10 p-1.5 text-primary"><Icon className="h-4 w-4" /></span>
          <p className="text-sm text-muted">{label}</p>
        </div>
        <select
          value={range.key}
          onChange={(e) => onChange({ ...range, key: e.target.value })}
          aria-label={`${label} date range`}
          className="rounded-[8px] border border-border bg-surface px-1.5 py-1 text-[11px] font-medium text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {RANGE_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tabular-nums text-ink">{format(animated)}</p>
      <DeltaLine delta={deltaOf(value, prevValue)} />
      {range.key === 'custom' && <div className="mt-3"><CustomDates range={range} onChange={onChange} /></div>}
    </Card>
  );
};

const tooltipStyle = {
  borderRadius: '12px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  fontSize: '12px',
};

const QuickActions = ({ navigate }) => {
  const actions = [
    { label: 'Add Product', icon: ShoppingBagIcon, action: () => navigate('/products', { state: { openAddModal: true } }) },
    { label: 'New Category', icon: TagIcon, action: () => navigate('/categories', { state: { openAddModal: true } }) },
    { label: 'View Orders', icon: ShoppingCartIcon, action: () => navigate('/orders') },
    { label: 'Create Offer', icon: GiftIcon, action: () => navigate('/discounts', { state: { openAddModal: true } }) },
  ];
  return (
    <Card>
      <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {actions.map(({ label, icon, action }) => {
            const Icon = icon;
            return (
            <button
              key={label}
              onClick={action}
              className="flex flex-col items-center gap-2 rounded-[14px] border-2 border-dashed border-border p-4 transition-colors duration-200 hover:border-primary hover:bg-primary/5 group"
            >
              <Icon className="h-6 w-6 text-muted group-hover:text-primary transition-colors" />
              <span className="text-xs font-medium text-muted group-hover:text-primary transition-colors">{label}</span>
            </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const orders = useSelector((state) => state.orders.allOrders);
  const products = useSelector((state) => state.products.allProducts);
  const ordersLoading = useSelector((state) => state.orders.allLoading);
  const productsLoading = useSelector((state) => state.products.allLoading);
  const ordersError = useSelector((state) => state.orders.allError);
  const productsError = useSelector((state) => state.products.allError);

  const loading = ordersLoading || productsLoading;
  const error = ordersError || productsError;

  const todayStr = localISO(new Date());
  // Global range drives charts + tables; revenue and orders KPIs have their own.
  const [range, setRange] = useState({ key: '7d', from: todayStr, to: todayStr });
  const [revRange, setRevRange] = useState({ key: '7d', from: todayStr, to: todayStr });
  const [ordRange, setOrdRange] = useState({ key: '7d', from: todayStr, to: todayStr });

  useEffect(() => {
    dispatch(fetchAllProducts());
    dispatch(fetchAllOrders());
  }, [dispatch]);

  // Global-range slices
  const gb = boundsFor(range);
  const filtered = inRange(orders, gb);
  const prevFiltered = inRange(orders, prevOf(gb));
  const k = kpis(filtered, products);
  const kPrev = kpis(prevFiltered, products);

  // Independent KPI slices
  const rb = boundsFor(revRange);
  const revenueNow = inRange(orders, rb).filter(isPaid).reduce((s, o) => s + (Number(o.total) || 0), 0);
  const revenuePrev = inRange(orders, prevOf(rb)).filter(isPaid).reduce((s, o) => s + (Number(o.total) || 0), 0);
  const ob = boundsFor(ordRange);
  const ordersNow = inRange(orders, ob).length;
  const ordersPrev = inRange(orders, prevOf(ob)).length;

  const inv = inventoryStatus(products);
  // Sales/revenue views count captured payments only; unpaid "created" orders
  // aren't real sales. Status breakdown stays on all orders (it's fulfillment).
  const paidFiltered = filtered.filter(isPaid);
  const spike = fillSpikeDays(ordersSpike(paidFiltered), gb.start, gb.end);
  const statusData = statusBreakdown(filtered);
  const topProdData = topProducts(paidFiltered).filter((p) => p.sales > 0);
  const skus = skuSales(paidFiltered).slice(0, 8);
  const custs = customers(paidFiltered);
  const latest = recentOrders(orders, 8);

  // Product performance — whole catalogue, all-time paid sales (not range-scoped,
  // so a slow product isn't mislabelled just because the current window is short).
  const perf = productPerformance(orders.filter(isPaid), products);
  const bestSellers = perf.filter((p) => p.unitsSold > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  const underperformers = perf.filter((p) => p.unitsSold === 0).slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Page header with global range control */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted">Showing {rangeLabel(range).toLowerCase()} · charts and tables follow this range</p>
        </div>
        <RangeTabs range={range} onChange={setRange} />
      </div>

      {error && (
        <EmptyState
          title="Couldn't load dashboard"
          message={typeof error === 'object' ? error.message || JSON.stringify(error) : String(error)}
          icon={ExclamationTriangleIcon}
        />
      )}

      {/* Primary KPIs — Revenue & Orders carry their own range filter */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FilteredKpiCard
          label="Revenue" icon={CurrencyRupeeIcon} format={inr} loading={loading}
          range={revRange} onChange={setRevRange} value={revenueNow} prevValue={revenuePrev}
        />
        <FilteredKpiCard
          label="Orders" icon={ShoppingCartIcon} loading={loading}
          range={ordRange} onChange={setOrdRange} value={ordersNow} prevValue={ordersPrev}
        />
        <StatCard label="Packets Sold" value={k.packets} loading={loading} icon={CubeIcon}
          delta={(() => { const d = deltaOf(k.packets, kPrev.packets); return d && { dir: d.dir, label: `${d.pct >= 0 ? '+' : ''}${d.pct.toFixed(1)}% vs previous period` }; })()} />
        <StatCard label="Avg Order Value" value={k.aov} format={inr} loading={loading} icon={BanknotesIcon} />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Products" value={k.totalProducts} loading={loading} icon={ShoppingBagIcon} />
        <button
          type="button"
          className="text-left rounded-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          onClick={() => navigate('/orders?status=pending')}
          aria-label="View pending orders"
        >
          <StatCard label="Pending Orders" value={k.pending} loading={loading} icon={ClockIcon} />
        </button>
        <button
          type="button"
          className="text-left rounded-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          onClick={() => navigate('/orders?status=completed')}
          aria-label="View completed orders"
        >
          {/* shipped counts as completed — delivered is rarely updated manually */}
          <StatCard label="Completed" value={k.completed} loading={loading} icon={CheckCircleIcon} />
        </button>
      </div>

      {/* Order Spike (value + packets) & Order Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Order Spike</CardTitle>
            <p className="mt-0.5 text-xs text-muted">Order value (₹) and packets sold per day · {rangeLabel(range)}</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px]" />
            ) : spike.every((d) => d.revenue === 0 && d.packets === 0) ? (
              <EmptyState title="No orders in this range" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={spike} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.primary} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickFormatter={shortDate}
                    tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="rev"
                    tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => '₹' + (v >= 1000 ? Math.round(v / 1000) + 'k' : v)}
                  />
                  <YAxis
                    yAxisId="pkt"
                    orientation="right"
                    tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    labelFormatter={shortDate}
                    formatter={(val, name) => (name === 'Value' ? [inr(val), 'Value'] : [val, name])}
                    contentStyle={tooltipStyle}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar yAxisId="pkt" dataKey="packets" name="Packets" fill={C.accent} radius={[4, 4, 0, 0]} barSize={18} />
                  <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Value" stroke={C.primary} strokeWidth={2} fill="url(#revGrad)" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
            <p className="mt-0.5 text-xs text-muted">Click a segment to open those orders</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px]" />
            ) : statusData.length === 0 ? (
              <EmptyState title="No orders in this range" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    cx="50%"
                    cy="45%"
                    onClick={(data) => data?.status && navigate('/orders?status=' + data.status)}
                    style={{ cursor: 'pointer' }}
                  >
                    {statusData.map((entry, idx) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[idx % STATUS_COLORS.length]} style={{ cursor: 'pointer' }} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val, name) => [val, name]} contentStyle={tooltipStyle} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    formatter={(val) => <span style={{ color: 'var(--color-muted)' }}>{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top products & Inventory */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Performing Products</CardTitle>
            <p className="mt-0.5 text-xs text-muted">Packets sold · {rangeLabel(range)}</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px]" />
            ) : topProdData.length === 0 ? (
              <EmptyState title="No sales in this range" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topProdData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(val) => [val, 'Packets sold']} contentStyle={tooltipStyle} />
                  <Bar dataKey="sales" fill={C.primary} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Inventory Status</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'In Stock', count: inv.inStock, dot: 'bg-success', text: 'text-success' },
                  { label: 'Low Stock', count: inv.lowStock, dot: 'bg-warn', text: 'text-warn' },
                  { label: 'Out of Stock', count: inv.outOfStock, dot: 'bg-danger', text: 'text-danger' },
                ].map(({ label, count, dot, text }) => (
                  <div key={label} className="flex items-center justify-between rounded-[10px] border border-border bg-surface/50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                      <span className="text-sm font-medium text-ink">{label}</span>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${text}`}>{count}</span>
                  </div>
                ))}
                <button
                  onClick={() => navigate('/products')}
                  className="mt-1 w-full rounded-[10px] border border-border bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  Manage Inventory
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <p className="mt-0.5 text-xs text-muted">Latest 8 orders, all time</p>
          </div>
          <button
            onClick={() => navigate('/orders')}
            className="rounded-[8px] border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
          >
            View all
          </button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9" />)}
            </div>
          ) : latest.length === 0 ? (
            <EmptyState title="No orders yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="pb-2 pr-4">Order</th>
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Customer</th>
                    <th className="pb-2 pr-4 text-right">Packets</th>
                    <th className="pb-2 pr-4 text-right">Total</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {latest.map((o) => (
                    <tr key={o._id || o.orderNumber} className="hover:bg-surface/60">
                      <td className="py-2.5 pr-4 font-mono text-xs text-ink">{o.orderNumber || '—'}</td>
                      <td className="py-2.5 pr-4 text-muted">
                        {new Date(o.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 pr-4 font-medium text-ink">{o.shippingAddress?.name || '—'}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-ink">
                        {(o.items || []).reduce((q, it) => q + (Number(it.quantity) || 0), 0)}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-medium tabular-nums text-primary">{inr(o.total || 0)}</td>
                      <td className="py-2.5 text-right">
                        <Badge tone={STATUS_TONES[o.status] || 'neutral'}>{o.status || 'unknown'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SKU Sales & Customers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales by SKU</CardTitle>
            <p className="mt-0.5 text-xs text-muted">Top 8 by quantity · {rangeLabel(range)}</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9" />)}
              </div>
            ) : skus.length === 0 ? (
              <EmptyState title="No sales in this range" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      <th className="pb-2 pr-4">SKU</th>
                      <th className="pb-2 pr-4">Product</th>
                      <th className="pb-2 pr-4 text-right">Qty</th>
                      <th className="pb-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {skus.map((row) => (
                      <tr key={row.sku} className="hover:bg-surface/60">
                        <td className="py-2 pr-4 font-mono text-xs text-muted">{row.sku}</td>
                        <td className="py-2 pr-4 text-ink">{row.name}</td>
                        <td className="py-2 pr-4 text-right tabular-nums text-ink">{row.qty}</td>
                        <td className="py-2 text-right font-medium tabular-nums text-primary">{inr(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Top Customers</CardTitle>
              <p className="mt-0.5 text-xs text-muted">By spend · {rangeLabel(range)}</p>
            </div>
            <button
              onClick={() => navigate('/customers')}
              className="rounded-[8px] border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
            >
              View all
            </button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9" />)}
              </div>
            ) : custs.length === 0 ? (
              <EmptyState title="No customers in this range" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4">Phone</th>
                      <th className="pb-2 pr-4 text-right">Orders</th>
                      <th className="pb-2 text-right">Total Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {custs.slice(0, 8).map((row, i) => (
                      <tr key={row.phone || row.name + i} className="hover:bg-surface/60">
                        <td className="py-2 pr-4 font-medium text-ink">{row.name}</td>
                        <td className="py-2 pr-4 font-mono text-xs text-muted">{row.phone || '—'}</td>
                        <td className="py-2 pr-4 text-right tabular-nums text-ink">{row.orders}</td>
                        <td className="py-2 text-right font-medium tabular-nums text-primary">{inr(row.totalSpent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {custs.length > 8 && (
                  <p className="mt-2 text-right text-xs text-muted">+{custs.length - 8} more on the Customers page</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product Analytics — which products sell and which don't (all-time) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Best Sellers</CardTitle>
            <p className="mt-0.5 text-xs text-muted">All time — by total revenue</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9" />)}
              </div>
            ) : bestSellers.length === 0 ? (
              <EmptyState title="No sales data yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      <th className="pb-2 pr-4">Product</th>
                      <th className="pb-2 pr-4 text-right">Units Sold</th>
                      <th className="pb-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {bestSellers.map((row) => (
                      <tr key={row.id} className="hover:bg-surface/60">
                        <td className="py-2 pr-4 font-medium text-ink">{row.name}</td>
                        <td className="py-2 pr-4 text-right tabular-nums text-ink">{row.unitsSold}</td>
                        <td className="py-2 text-right font-medium tabular-nums text-primary">{inr(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Underperforming Products</CardTitle>
            <p className="mt-0.5 text-xs text-muted">All time — zero sales</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9" />)}
              </div>
            ) : underperformers.length === 0 ? (
              <div className="rounded-[12px] bg-success-soft p-4 text-center">
                <p className="text-sm font-medium text-success">Every product has made at least one sale.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      <th className="pb-2 pr-4">Product</th>
                      <th className="pb-2 pr-4 text-right">Units Sold</th>
                      <th className="pb-2 text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {underperformers.map((row) => (
                      <tr key={row.id} className="hover:bg-surface/60">
                        <td className="py-2 pr-4 font-medium text-ink">{row.name}</td>
                        <td className="py-2 pr-4 text-right tabular-nums text-warn">0</td>
                        <td className="py-2 text-right font-medium tabular-nums text-ink">{row.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-muted">
                  Consider a promotion or delisting these.
                  <button onClick={() => navigate('/products')} className="ml-1 font-medium text-primary hover:underline">Manage products.</button>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <QuickActions navigate={navigate} />
    </div>
  );
};

export default Dashboard;

// pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  CurrencyRupeeIcon,
  ShoppingCartIcon,
  ClockIcon,
  CheckCircleIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  ShoppingBagIcon,
  TagIcon,
  GiftIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

import {
  AreaChart,
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

import { fetchProducts } from '../redux/slices/productsSlice';
import { fetchOrders } from '../redux/slices/ordersSlice';
import { fetchCategories } from '../redux/slices/categoriesSlice';
import { fetchDiscounts } from '../redux/slices/discountsSlice';

import { kpis, revenueByDay, statusBreakdown, paymentSplit, topProducts } from '../lib/dashboardData';
import StatCard from '../ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import Skeleton from '../ui/skeleton';
import EmptyState from '../ui/empty-state';

// Brand palette constants
const C = { primary: '#f59e0b', accent: '#fb923c', grid: 'var(--border)' };

// Status colour map for PieChart cells
const STATUS_COLORS = ['#f59e0b', '#fb923c', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#6b7280'];
const PAYMENT_COLORS = ['#f59e0b', '#fb923c', '#10b981', '#3b82f6'];

// Quick-format helpers
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

// Time-range helpers (unchanged from original)
const getDateRange = (range, orders) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (range) {
    case 'today':
      return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    case 'week': {
      const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start: weekStart, end: now };
    }
    case 'month': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: monthStart, end: now };
    }
    case 'annual': {
      const yearStart = new Date(today.getFullYear(), 0, 1);
      return { start: yearStart, end: now };
    }
    case 'all': {
      const earliest = orders.length > 0
        ? new Date(Math.min(...orders.map((o) => new Date(o.createdAt))))
        : new Date('2020-01-01');
      return { start: earliest, end: now };
    }
    default:
      return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
  }
};

const TIME_RANGE_LABELS = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  annual: "Annual",
  all: "All (Overall)",
};

// Custom tooltip for AreaChart
const RevenueTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[12px] border border-border bg-surface px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-ink">{label}</p>
      <p className="text-primary">{inr(payload[0]?.value ?? 0)}</p>
    </div>
  );
};

// Quick Actions section
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
          {actions.map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              onClick={action}
              className="flex flex-col items-center gap-2 rounded-[14px] border-2 border-dashed border-border p-4 transition-colors duration-200 hover:border-primary hover:bg-primary/5 group"
            >
              <Icon className="h-6 w-6 text-muted group-hover:text-primary transition-colors" />
              <span className="text-xs font-medium text-muted group-hover:text-primary transition-colors">{label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux state
  const orders = useSelector((state) => state.orders.orders);
  const products = useSelector((state) => state.products.products);
  const ordersLoading = useSelector((state) => state.orders.loading);
  const productsLoading = useSelector((state) => state.products.loading);
  const ordersError = useSelector((state) => state.orders.error);
  const productsError = useSelector((state) => state.products.error);

  const loading = ordersLoading || productsLoading;
  const error = ordersError || productsError;

  // Time range filter (kept identical to original)
  const [timeRange, setTimeRange] = useState('today');

  // Fetch on mount
  useEffect(() => {
    dispatch(fetchProducts({ page: 1, limit: 100 }));
    dispatch(fetchOrders({ page: 1, limit: 100 }));
    dispatch(fetchCategories());
    dispatch(fetchDiscounts());
  }, [dispatch]);

  // Time-filtered orders (same logic as original)
  const { start, end } = getDateRange(timeRange, orders);
  const filteredOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return d >= start && d <= end;
  });

  // KPI aggregations from real data
  const k = kpis(filteredOrders, products);

  // Chart data from real data
  const revData = revenueByDay(filteredOrders);
  const statusData = statusBreakdown(filteredOrders);
  const payData = paymentSplit(filteredOrders);
  // topProducts uses product.salesCount — will be empty if field doesn't exist
  const topProdData = topProducts(products);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted">Welcome back — here's your {TIME_RANGE_LABELS[timeRange]} overview</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="rounded-[10px] border border-border bg-surface px-3 py-1.5 text-sm text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {Object.entries(TIME_RANGE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <SparklesIcon className="h-5 w-5 text-primary animate-pulse" />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <EmptyState
          title="Couldn't load dashboard"
          message={typeof error === 'object' ? error.message || JSON.stringify(error) : String(error)}
          icon={ExclamationTriangleIcon}
        />
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={k.revenue} format={inr} loading={loading} icon={CurrencyRupeeIcon} />
        <StatCard label="Total Orders" value={k.totalOrders} loading={loading} icon={ShoppingCartIcon} />
        <StatCard label="Pending Orders" value={k.pending} loading={loading} icon={ClockIcon} />
        <StatCard label="Delivered" value={k.delivered} loading={loading} icon={CheckCircleIcon} />
        <StatCard label="Products in Stock" value={k.inStockUnits} loading={loading} icon={ArchiveBoxIcon} />
        <StatCard label="Out of Stock" value={k.outOfStock} loading={loading} icon={ExclamationTriangleIcon} />
        <StatCard label="Avg Order Value" value={k.aov} format={inr} loading={loading} icon={BanknotesIcon} />
      </div>

      {/* Charts row 1: Revenue trend + Order status donut */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue trend – spans 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px]" />
            ) : revData.length === 0 ? (
              <EmptyState title="No data in this range" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.primary} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => '₹' + (v >= 1000 ? Math.round(v / 1000) + 'k' : v)}
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={C.primary}
                    strokeWidth={2}
                    fill="url(#revGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: C.primary }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Order status donut */}
        <Card>
          <CardHeader><CardTitle>Order Status</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px]" />
            ) : statusData.length === 0 ? (
              <EmptyState title="No data in this range" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
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
                  >
                    {statusData.map((entry, idx) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[idx % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [val, name]}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      fontSize: '12px',
                    }}
                  />
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

      {/* Charts row 2: Top products bar + Payment split donut */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top products horizontal bar – spans 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Top Products by Sales</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px]" />
            ) : topProdData.filter((p) => p.sales > 0).length === 0 ? (
              <EmptyState title="No data in this range" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={topProdData.filter((p) => p.sales > 0)}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                >
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(val) => [val, 'Sales']}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="sales" fill={C.primary} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment split donut */}
        <Card>
          <CardHeader><CardTitle>Payment Methods</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px]" />
            ) : payData.length === 0 ? (
              <EmptyState title="No data in this range" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={payData}
                    dataKey="count"
                    nameKey="method"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    cx="50%"
                    cy="45%"
                  >
                    {payData.map((entry, idx) => (
                      <Cell key={entry.method} fill={PAYMENT_COLORS[idx % PAYMENT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [val, name]}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      fontSize: '12px',
                    }}
                  />
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

      {/* Quick Actions */}
      <QuickActions navigate={navigate} />
    </div>
  );
};

export default Dashboard;

// pages/customers.jsx — all customers (guest + registered) derived from orders
import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  MagnifyingGlassIcon,
  UsersIcon,
  UserCircleIcon,
  UserIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

import { fetchAllOrders } from '../redux/slices/ordersSlice';
import { customers } from '../lib/dashboardData';
import { toCSV } from '../lib/csv';
import { cn } from '../lib/utils';
import useLazyRows from '../hooks/useLazyRows';
import StatCard from '../ui/stat-card';
import Badge from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import Skeleton from '../ui/skeleton';
import EmptyState from '../ui/empty-state';

const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

const TYPE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'registered', label: 'Registered' },
  { key: 'guest', label: 'Guests' },
];

const Customers = () => {
  const dispatch = useDispatch();
  const orders = useSelector((state) => state.orders.allOrders);
  const loading = useSelector((state) => state.orders.allLoading);
  const error = useSelector((state) => state.orders.allError);

  const [search, setSearch] = useState('');
  const [typeTab, setTypeTab] = useState('all');

  useEffect(() => {
    if (orders.length === 0) dispatch(fetchAllOrders());
  }, [dispatch, orders.length]);

  const all = useMemo(() => customers(orders), [orders]);
  const registered = all.filter((c) => c.registered);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((c) => {
      if (typeTab === 'registered' && !c.registered) return false;
      if (typeTab === 'guest' && c.registered) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    });
  }, [all, search, typeTab]);

  const { visible, sentinelRef, reset } = useLazyRows(filtered.length, 40);

  const downloadCsv = () => {
    const rows = filtered.map((c) => ({ ...c, type: c.registered ? 'Registered' : 'Guest' }));
    const csv = toCSV(rows, [
      { key: 'name', label: 'Name' },
      { key: 'type', label: 'Type' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Customers</h1>
          <p className="mt-0.5 text-sm text-muted">Every buyer from order history — guests and registered users</p>
        </div>
        <button
          onClick={downloadCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-2 rounded-[10px] border border-border bg-surface px-4 py-2 text-sm font-medium text-ink shadow-sm transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Download CSV
        </button>
      </div>

      {error && (
        <EmptyState
          title="Couldn't load customers"
          message={typeof error === 'object' ? error.message || JSON.stringify(error) : String(error)}
          icon={ExclamationTriangleIcon}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Customers" value={all.length} loading={loading} icon={UsersIcon} />
        <StatCard label="Registered" value={registered.length} loading={loading} icon={UserCircleIcon} />
        <StatCard label="Guests" value={all.length - registered.length} loading={loading} icon={UserIcon} />
      </div>

      {/* List */}
      <Card>
        <CardContent>
          {/* Toolbar */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                placeholder="Search name, phone or email…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); reset(); }}
                className="w-full rounded-[10px] border border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink shadow-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex items-center gap-1 rounded-[12px] border border-border bg-surface p-1 shadow-sm">
              {TYPE_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setTypeTab(t.key); reset(); }}
                  className={cn(
                    'rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    typeTab === t.key ? 'bg-primary text-primary-fg shadow-sm' : 'text-muted hover:text-ink'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {loading && orders.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No customers found" message={search ? 'Try a different search term.' : 'Customers appear here once orders come in.'} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4">Type</th>
                      <th className="pb-2 pr-4">Phone</th>
                      <th className="pb-2 pr-4">Email</th>
                      <th className="pb-2 pr-4 text-right">Orders</th>
                      <th className="pb-2 pr-4 text-right">Total Spent</th>
                      <th className="pb-2 text-right">Last Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.slice(0, visible).map((c, i) => (
                      <tr key={c.phone || c.email || c.name + i} className="hover:bg-surface/60">
                        <td className="py-2.5 pr-4 font-medium text-ink">{c.name}</td>
                        <td className="py-2.5 pr-4">
                          <Badge tone={c.registered ? 'success' : 'neutral'}>{c.registered ? 'Registered' : 'Guest'}</Badge>
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-muted">{c.phone || '—'}</td>
                        <td className="py-2.5 pr-4 text-muted">{c.email || '—'}</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-ink">{c.orders}</td>
                        <td className="py-2.5 pr-4 text-right font-medium tabular-nums text-primary">{inr(c.totalSpent)}</td>
                        <td className="py-2.5 text-right text-muted">{c.lastOrder || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div ref={sentinelRef} />
              <p className="mt-3 text-right text-xs text-muted">
                Showing {Math.min(visible, filtered.length)} of {filtered.length} customers
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Customers;

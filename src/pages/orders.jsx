// pages/orders.jsx — all orders, status chips, lazy-loaded list
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchAllOrders, updateOrderStatus, fetchOrderById, clearError } from '../redux/slices/ordersSlice';
import InvoicePrint from '../components/InvoicePrint';
import {
  MagnifyingGlassIcon,
  EyeIcon,
  PrinterIcon,
  ShoppingCartIcon,
  CurrencyRupeeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

import { cn } from '../lib/utils';
import { RANGE_OPTIONS_ALL, localISO, boundsFor, inRange, rangeLabel } from '../lib/dateRange';
import RangeTabs from '../ui/range-tabs';
import useLazyRows from '../hooks/useLazyRows';
import StatCard from '../ui/stat-card';
import { Card, CardContent } from '../ui/card';
import Skeleton from '../ui/skeleton';
import EmptyState from '../ui/empty-state';

const inr = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN');

const STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'failed', 'returned', 'paid'];

const STATUS_STYLES = {
  pending: 'bg-warn-soft text-warn',
  processing: 'bg-info-soft text-info',
  shipped: 'bg-info-soft text-info',
  delivered: 'bg-success-soft text-success',
  paid: 'bg-success-soft text-success',
  cancelled: 'bg-danger-soft text-danger',
  failed: 'bg-danger-soft text-danger',
  returned: 'bg-warn-soft text-warn',
};

// "completed" is a pseudo-status: shipped counts as completed because
// delivered is rarely updated by hand.
const isCompleted = (o) => o.status === 'shipped' || o.status === 'delivered';
const FILTER_CHIPS = ['all', 'pending', 'processing', 'completed', 'cancelled', 'failed', 'returned', 'paid'];

const matchesStatus = (order, filter) =>
  filter === 'all' || (filter === 'completed' ? isCompleted(order) : order.status === filter);

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const Orders = () => {
  const dispatch = useDispatch();
  const orders = useSelector((state) => state.orders.allOrders);
  const allLoading = useSelector((state) => state.orders.allLoading);
  const allError = useSelector((state) => state.orders.allError);
  const mutating = useSelector((state) => state.orders.loading);
  const error = useSelector((state) => state.orders.error);

  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  // Seed status filter from ?status= so dashboard deep-links land pre-filtered.
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const todayStr = localISO(new Date());
  const [range, setRange] = useState({ key: 'all', from: todayStr, to: todayStr });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    dispatch(fetchAllOrders());
  }, [dispatch]);

  useEffect(() => {
    setStatusFilter(searchParams.get('status') || 'all');
  }, [searchParams]);

  useEffect(() => () => { dispatch(clearError()); }, [dispatch]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await dispatch(updateOrderStatus({ orderId, status: newStatus })).unwrap();
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const handleViewOrder = async (orderId) => {
    try {
      const result = await dispatch(fetchOrderById(orderId)).unwrap();
      setSelectedOrder(result);
      setShowOrderDetail(true);
    } catch (error) {
      console.error('Failed to fetch order details:', error);
    }
  };

  const handlePrintInvoice = async (orderId) => {
    try {
      const result = await dispatch(fetchOrderById(orderId)).unwrap();
      setSelectedOrder(result);
      setShowInvoice(true);
    } catch (error) {
      console.error('Failed to fetch order details:', error);
    }
  };

  // Orders inside the selected date window ("All" = everything)
  const rangedOrders = useMemo(() => inRange(orders, boundsFor(range)), [orders, range]);

  // Stats follow the date filter, computed over the full collection (never a page)
  const stats = useMemo(() => ({
    total: rangedOrders.length,
    pending: rangedOrders.filter((o) => o.status === 'pending').length,
    processing: rangedOrders.filter((o) => o.status === 'processing').length,
    completed: rangedOrders.filter(isCompleted).length,
    revenue: rangedOrders
      .filter((o) => !['cancelled', 'failed', 'returned'].includes(o.status))
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0),
  }), [rangedOrders]);

  const chipCount = (chip) =>
    chip === 'all' ? rangedOrders.length : rangedOrders.filter((o) => matchesStatus(o, chip)).length;

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return rangedOrders.filter((order) => {
      if (!matchesStatus(order, statusFilter)) return false;
      if (!q) return true;
      return (
        (order.orderNumber || '').toLowerCase().includes(q) ||
        (order.shippingAddress?.name || '').toLowerCase().includes(q) ||
        (order.shippingAddress?.phone || '').includes(q)
      );
    });
  }, [rangedOrders, searchTerm, statusFilter]);

  const { visible, sentinelRef, reset } = useLazyRows(filteredOrders.length, 30);

  const formatAddress = (address) =>
    `${address.addressLine1}${address.addressLine2 ? ', ' + address.addressLine2 : ''}, ${address.city}, ${address.state} ${address.pinCode}`;

  const initialLoading = allLoading && orders.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Orders</h1>
          <p className="mt-0.5 text-sm text-muted">Track and manage every customer order · {rangeLabel(range)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RangeTabs range={range} onChange={(r) => { setRange(r); reset(); }} options={RANGE_OPTIONS_ALL} />
          <button
            onClick={() => dispatch(fetchAllOrders())}
            disabled={allLoading}
            className="inline-flex items-center gap-2 rounded-[10px] border border-border bg-surface px-4 py-2 text-sm font-medium text-ink shadow-sm transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowPathIcon className={cn('h-4 w-4', allLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Errors */}
      {(allError || error) && (
        <div className="flex items-center gap-2 rounded-[12px] border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
          <span>{String(allError || error)}</span>
          {error && (
            <button onClick={() => dispatch(clearError())} className="ml-auto" aria-label="Dismiss error">
              <XCircleIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {/* Stats — computed across all orders */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Orders" value={stats.total} loading={initialLoading} icon={ShoppingCartIcon} />
        <StatCard label="Pending" value={stats.pending} loading={initialLoading} icon={ClockIcon} />
        <StatCard label="Processing" value={stats.processing} loading={initialLoading} icon={TruckIcon} />
        <StatCard label="Completed" value={stats.completed} loading={initialLoading} icon={CheckCircleIcon} />
        <StatCard label="Revenue" value={stats.revenue} format={inr} loading={initialLoading} icon={CurrencyRupeeIcon} />
      </div>

      {/* List */}
      <Card>
        <CardContent>
          {/* Toolbar: search + status chips */}
          <div className="mb-4 space-y-3">
            <div className="relative w-full sm:max-w-sm">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                placeholder="Search order #, customer or phone…"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); reset(); }}
                className="w-full rounded-[10px] border border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink shadow-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => { setStatusFilter(chip); reset(); }}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    statusFilter === chip
                      ? 'border-primary bg-primary text-primary-fg shadow-sm'
                      : 'border-border bg-surface text-muted hover:border-primary/50 hover:text-ink'
                  )}
                >
                  {chip === 'all' ? 'All' : chip}
                  <span className="ml-1.5 tabular-nums opacity-70">{chipCount(chip)}</span>
                </button>
              ))}
            </div>
          </div>

          {initialLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              title="No orders found"
              message={searchTerm || statusFilter !== 'all' ? 'Try a different search or status filter.' : 'Orders appear here as customers buy.'}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      <th className="pb-2 pr-4">Order</th>
                      <th className="pb-2 pr-4">Customer</th>
                      <th className="pb-2 pr-4">Items</th>
                      <th className="pb-2 pr-4 text-right">Total</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredOrders.slice(0, visible).map((order) => (
                      <tr key={order._id} className="hover:bg-surface/60">
                        <td className="py-3 pr-4">
                          <div className="font-mono text-xs font-medium text-ink">{order.orderNumber}</div>
                          <div className="text-xs text-muted">{formatDate(order.createdAt)}</div>
                          {order.trackingNumber && (
                            <div className="text-xs text-info">Track: {order.trackingNumber}</div>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="font-medium text-ink">{order.shippingAddress?.name || '—'}</div>
                          <div className="font-mono text-xs text-muted">{order.shippingAddress?.phone || ''}</div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="text-ink">
                            {(order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} packets
                          </div>
                          <div className="max-w-[220px] truncate text-xs text-muted">
                            {(order.items || []).slice(0, 2).map((item) => item.productName).join(', ')}
                            {(order.items || []).length > 2 && ` +${order.items.length - 2} more`}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <div className="font-medium tabular-nums text-ink">{inr(order.total)}</div>
                          <div className="text-xs uppercase text-muted">{order.paymentStatus}</div>
                        </td>
                        <td className="py-3 pr-4">
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order._id, e.target.value)}
                            disabled={mutating}
                            aria-label={`Status of order ${order.orderNumber}`}
                            className={cn(
                              'rounded-full border-0 px-2.5 py-1.5 text-xs font-medium capitalize focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50',
                              STATUS_STYLES[order.status] || 'bg-surface-raised text-muted'
                            )}
                          >
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleViewOrder(order._id)}
                              className="rounded-[8px] p-1.5 text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                              title="View details"
                              aria-label={`View order ${order.orderNumber}`}
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handlePrintInvoice(order._id)}
                              className="rounded-[8px] p-1.5 text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                              title="Print invoice"
                              aria-label={`Print invoice for order ${order.orderNumber}`}
                            >
                              <PrinterIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Lazy-load sentinel: reveals more rows as you scroll */}
              <div ref={sentinelRef} />
              <p className="mt-3 text-right text-xs text-muted">
                Showing {Math.min(visible, filteredOrders.length)} of {filteredOrders.length} orders
                {visible < filteredOrders.length && ' — scroll for more'}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[18px] border border-border bg-surface shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
              <h3 className="font-display text-lg font-semibold text-ink">
                Order {selectedOrder.orderNumber}
              </h3>
              <button
                onClick={() => setShowOrderDetail(false)}
                className="text-muted transition-colors hover:text-ink"
                aria-label="Close order details"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* Customer + Order info */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-[14px] bg-surface-raised p-4">
                  <h4 className="mb-3 font-semibold text-ink">Customer</h4>
                  <div className="space-y-2 text-sm text-text">
                    <p><span className="font-medium">Name:</span> {selectedOrder.shippingAddress?.name}</p>
                    <p><span className="font-medium">Phone:</span> {selectedOrder.shippingAddress?.phone}</p>
                    {(selectedOrder.user?.email || selectedOrder.guestInfo?.email) && (
                      <p><span className="font-medium">Email:</span> {selectedOrder.user?.email || selectedOrder.guestInfo?.email}</p>
                    )}
                    <p><span className="font-medium">Type:</span> {selectedOrder.user ? 'Registered' : 'Guest'}</p>
                  </div>
                </div>
                <div className="rounded-[14px] bg-surface-raised p-4">
                  <h4 className="mb-3 font-semibold text-ink">Order</h4>
                  <div className="space-y-2 text-sm text-text">
                    <p><span className="font-medium">Date:</span> {formatDate(selectedOrder.createdAt)}</p>
                    <p><span className="font-medium">Payment Status:</span> {selectedOrder.paymentStatus}</p>
                    {selectedOrder.trackingNumber && (
                      <p><span className="font-medium">Tracking:</span> {selectedOrder.trackingNumber}</p>
                    )}
                    <p>
                      <span className="font-medium">Status:</span>
                      <span className={cn('ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', STATUS_STYLES[selectedOrder.status] || 'bg-surface text-muted')}>
                        {selectedOrder.status}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-[14px] bg-surface-raised p-4">
                  <h4 className="mb-3 font-semibold text-ink">Shipping Address</h4>
                  <div className="text-sm text-text">
                    <p className="font-medium">{selectedOrder.shippingAddress?.name}</p>
                    <p>{formatAddress(selectedOrder.shippingAddress)}</p>
                    <p>{selectedOrder.shippingAddress?.country}</p>
                  </div>
                </div>
                <div className="rounded-[14px] bg-surface-raised p-4">
                  <h4 className="mb-3 font-semibold text-ink">Billing Address</h4>
                  <div className="text-sm text-text">
                    <p className="font-medium">{selectedOrder.billingAddress?.name}</p>
                    <p>{formatAddress(selectedOrder.billingAddress)}</p>
                    <p>{selectedOrder.billingAddress?.country}</p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="mb-3 font-semibold text-ink">Items</h4>
                <div className="overflow-hidden rounded-[14px] border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-raised text-left text-xs font-semibold uppercase tracking-wide text-muted">
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Code</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Price</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedOrder.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              {item.productImage && (
                                <img src={item.productImage} alt={item.productName} className="mr-3 h-10 w-10 rounded-[8px] object-cover" />
                              )}
                              <span className="font-medium text-ink">{item.productName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted">{item.productCode}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-ink">{item.quantity}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted">{inr(item.priceAtPurchase)}</td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums text-ink">{inr(item.itemTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-[14px] bg-surface-raised p-4">
                <h4 className="mb-3 font-semibold text-ink">Summary</h4>
                <div className="space-y-2 text-sm text-text">
                  <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{inr(selectedOrder.subtotal)}</span></div>
                  <div className="flex justify-between"><span>Shipping</span><span className="tabular-nums">{inr(selectedOrder.shippingCharge)}</span></div>
                  <div className="flex justify-between"><span>Tax</span><span className="tabular-nums">{inr(selectedOrder.taxAmount)}</span></div>
                  {selectedOrder.appliedCoupon && (
                    <div className="flex justify-between text-success">
                      <span>Discount ({selectedOrder.appliedCoupon.code})</span>
                      <span className="tabular-nums">-{inr(selectedOrder.appliedCoupon.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-ink">
                    <span>Total</span><span className="tabular-nums">{inr(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="rounded-[14px] bg-warn-soft p-4">
                  <h4 className="mb-2 font-semibold text-ink">Special Instructions</h4>
                  <p className="text-sm text-text">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <label htmlFor="order-status-update" className="mb-1 block text-sm font-medium text-ink">Update Status</label>
                  <select
                    id="order-status-update"
                    value={selectedOrder.status}
                    onChange={(e) => {
                      handleStatusChange(selectedOrder._id, e.target.value);
                      setSelectedOrder({ ...selectedOrder, status: e.target.value });
                    }}
                    disabled={mutating}
                    className="rounded-[10px] border border-border bg-surface px-3 py-2 text-sm capitalize text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowOrderDetail(false); setShowInvoice(true); }}
                    className="inline-flex items-center gap-2 rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-fg shadow-sm transition-colors hover:opacity-90"
                  >
                    <PrinterIcon className="h-4 w-4" />
                    Print Invoice
                  </button>
                  <button
                    onClick={() => setShowOrderDetail(false)}
                    className="rounded-[10px] border border-border bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-raised"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Print Modal */}
      {showInvoice && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-[18px] bg-white shadow-xl">
            <div className="modal-header sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Invoice</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-fg shadow-sm transition-colors hover:opacity-90"
                >
                  <PrinterIcon className="h-4 w-4" />
                  Print
                </button>
                <button
                  onClick={() => setShowInvoice(false)}
                  className="text-gray-400 transition-colors hover:text-gray-600"
                  aria-label="Close invoice"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <InvoicePrint order={selectedOrder} invoiceNumber={selectedOrder.orderNumber} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;

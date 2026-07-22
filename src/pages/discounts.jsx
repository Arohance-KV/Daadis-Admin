// pages/discounts.jsx
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  fetchDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  clearError,
} from '../redux/slices/discountsSlice';
import { fetchCategories } from '../redux/slices/categoriesSlice';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  TicketIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ReceiptPercentIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

import { cn } from '../lib/utils';
import StatCard from '../ui/stat-card';
import Badge from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import Skeleton from '../ui/skeleton';
import EmptyState from '../ui/empty-state';

const inputCls =
  'w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-ink shadow-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50';
const labelCls = 'mb-1 block text-sm font-medium text-ink';

const STATUS_TONES = { active: 'success', inactive: 'neutral', expired: 'danger' };

const EMPTY_FORM = {
  title: '',
  code: '',
  type: 'percentage',
  value: '',
  minOrderAmount: '',
  maxDiscount: '',
  validFrom: '',
  validTo: '',
  usageLimit: '',
  applicableCategories: ['all'],
  description: '',
  status: 'active',
};

const Discounts = () => {
  const dispatch = useDispatch();
  const { discounts, loading, error } = useSelector((state) => state.discounts);
  const { categories } = useSelector((state) => state.categories);

  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [formData, setFormData] = useState(EMPTY_FORM);

  const location = useLocation();
  const navigate = useNavigate();

  // Dashboard quick-action deep link
  useEffect(() => {
    if (location.state?.openAddModal) {
      setShowModal(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    dispatch(fetchDiscounts());
    // Needed for the "Applicable Categories" checkboxes in the modal
    if (categories.length === 0) dispatch(fetchCategories());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => dispatch(clearError()), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingDiscount(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDiscount) {
        await dispatch(updateDiscount({ id: editingDiscount.id, ...formData })).unwrap();
      } else {
        await dispatch(createDiscount(formData)).unwrap();
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving discount:', error);
    }
  };

  const handleEdit = (discount) => {
    setEditingDiscount(discount);
    setFormData({
      title: discount.title,
      code: discount.code,
      type: discount.type,
      value: discount.value.toString(),
      minOrderAmount: discount.minOrderAmount.toString(),
      maxDiscount: discount.maxDiscount ? discount.maxDiscount.toString() : '',
      validFrom: discount.validFrom ? discount.validFrom.split('T')[0] : '',
      validTo: discount.validTo ? discount.validTo.split('T')[0] : '',
      usageLimit: discount.usageLimit.toString(),
      applicableCategories: discount.applicableCategories.length > 0 ? discount.applicableCategories : ['all'],
      description: discount.description,
      status: discount.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this discount?')) {
      try {
        await dispatch(deleteDiscount(id)).unwrap();
      } catch (error) {
        console.error('Error deleting discount:', error);
      }
    }
  };

  const handleToggleStatus = async (discount) => {
    const updatedStatus = discount.status === 'active' ? 'inactive' : 'active';
    try {
      await dispatch(updateDiscount({ id: discount.id, ...discount, status: updatedStatus })).unwrap();
    } catch (error) {
      console.error('Error toggling discount status:', error);
    }
  };

  const filteredDiscounts = discounts.filter((discount) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      discount.title.toLowerCase().includes(q) || discount.code.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || discount.status === statusFilter;
    const matchesType = typeFilter === 'all' || discount.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const formatDate = (dateString) =>
    dateString ? new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const avgDiscount = () => {
    if (discounts.length === 0) return 0;
    const total = discounts.reduce((sum, d) =>
      sum + (d.type === 'percentage' ? d.value : (d.value / d.minOrderAmount) * 100), 0);
    return Math.round(total / discounts.length);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Discounts</h1>
          <p className="mt-0.5 text-sm text-muted">Manage promotional discounts and coupon codes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => dispatch(fetchDiscounts())}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-[10px] border border-border bg-surface px-4 py-2 text-sm font-medium text-ink shadow-sm transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary disabled:opacity-50"
          >
            <ArrowPathIcon className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-fg shadow-sm transition-colors hover:opacity-90 disabled:opacity-50"
          >
            <PlusIcon className="h-5 w-5" />
            Add Discount
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-[12px] border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
          <span>{String(error)}</span>
          <button onClick={() => dispatch(clearError())} className="ml-auto" aria-label="Dismiss error">
            <XCircleIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Discounts" value={discounts.length} loading={loading && discounts.length === 0} icon={TicketIcon} />
        <StatCard label="Active" value={discounts.filter((d) => d.status === 'active').length} loading={loading && discounts.length === 0} icon={CheckCircleIcon} />
        <StatCard label="Total Usage" value={discounts.reduce((sum, d) => sum + d.usageCount, 0)} loading={loading && discounts.length === 0} icon={ChartBarIcon} />
        <StatCard label="Avg Discount" value={avgDiscount()} format={(n) => Math.round(n) + '%'} loading={loading && discounts.length === 0} icon={ReceiptPercentIcon} />
      </div>

      {/* Table */}
      <Card>
        <CardContent>
          {/* Toolbar */}
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full lg:max-w-xs">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                placeholder="Search title or code…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(inputCls, 'pl-9')}
              />
            </div>
            <div className="flex gap-2">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls} aria-label="Filter by status">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="expired">Expired</option>
              </select>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={inputCls} aria-label="Filter by type">
                <option value="all">All Types</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
          </div>

          {loading && discounts.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : filteredDiscounts.length === 0 ? (
            <EmptyState
              title="No discounts found"
              message={searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? 'Try different filters.' : 'Create your first coupon to get started.'}
              icon={TicketIcon}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="pb-2 pr-4">Discount</th>
                    <th className="pb-2 pr-4">Code & Type</th>
                    <th className="pb-2 pr-4">Value & Limits</th>
                    <th className="pb-2 pr-4">Usage</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDiscounts.map((discount) => (
                    <tr key={discount.id} className="hover:bg-surface/60">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-ink">{discount.title}</div>
                        <div className="max-w-[220px] truncate text-xs text-muted">{discount.description}</div>
                        <div className="mt-0.5 text-xs text-muted">
                          {formatDate(discount.validFrom)} – {formatDate(discount.validTo)}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded-[6px] bg-surface-raised px-2 py-1 font-mono text-xs text-ink">{discount.code}</span>
                        <div className="mt-1.5">
                          <Badge tone={discount.type === 'percentage' ? 'info' : 'warn'}>
                            {discount.type === 'percentage' ? 'Percentage' : 'Fixed'}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="font-medium tabular-nums text-ink">
                          {discount.type === 'percentage' ? `${discount.value}%` : `₹${discount.value}`}
                        </div>
                        <div className="text-xs text-muted">Min ₹{discount.minOrderAmount}</div>
                        {discount.maxDiscount && <div className="text-xs text-muted">Max ₹{discount.maxDiscount}</div>}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="tabular-nums text-ink">{discount.usageCount} / {discount.usageLimit}</div>
                        <div className="mt-1 h-1.5 w-24 rounded-full bg-surface-raised">
                          <div
                            className="h-1.5 rounded-full bg-primary"
                            style={{ width: `${Math.min((discount.usageCount / discount.usageLimit) * 100, 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge tone={STATUS_TONES[discount.status] || 'neutral'} className="capitalize">{discount.status}</Badge>
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(discount)}
                            disabled={loading}
                            className="rounded-[8px] p-1.5 text-muted transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                            title="Edit discount"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(discount)}
                            disabled={loading}
                            className="rounded-[8px] p-1.5 text-muted transition-colors hover:bg-warn-soft hover:text-warn disabled:opacity-50"
                            title={discount.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {discount.status === 'active' ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(discount.id)}
                            disabled={loading}
                            className="rounded-[8px] p-1.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                            title="Delete discount"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[18px] border border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="font-display text-lg font-semibold text-ink">
                {editingDiscount ? 'Edit Discount' : 'Add New Discount'}
              </h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-muted transition-colors hover:text-ink" aria-label="Close">
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="d-title" className={labelCls}>Title <span className="text-danger">*</span></label>
                  <input id="d-title" type="text" required value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={inputCls} placeholder="e.g. Sweet Treats Discount" />
                </div>
                <div>
                  <label htmlFor="d-code" className={labelCls}>Code <span className="text-danger">*</span></label>
                  <input id="d-code" type="text" required value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className={cn(inputCls, 'font-mono uppercase')} placeholder="e.g. SWEET50" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label htmlFor="d-type" className={labelCls}>Type</label>
                  <select id="d-type" value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })} className={inputCls}>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="d-value" className={labelCls}>Value {formData.type === 'percentage' ? '(%)' : '(₹)'} <span className="text-danger">*</span></label>
                  <input id="d-value" type="number" required min="0"
                    max={formData.type === 'percentage' ? '100' : undefined}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="d-min" className={labelCls}>Min Order (₹) <span className="text-danger">*</span></label>
                  <input id="d-min" type="number" required min="0" value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="d-max" className={labelCls}>Max Discount (₹){formData.type === 'fixed' ? ' — optional' : ''}</label>
                  <input id="d-max" type="number" min="0" value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    className={inputCls}
                    placeholder={formData.type === 'fixed' ? 'Leave empty if no limit' : 'Max discount amount'} />
                </div>
                <div>
                  <label htmlFor="d-limit" className={labelCls}>Usage Limit <span className="text-danger">*</span></label>
                  <input id="d-limit" type="number" required min="1" value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="d-from" className={labelCls}>Start Date <span className="text-danger">*</span></label>
                  <input id="d-from" type="date" required value={formData.validFrom} max={formData.validTo || undefined}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="d-to" className={labelCls}>End Date <span className="text-danger">*</span></label>
                  <input id="d-to" type="date" required value={formData.validTo} min={formData.validFrom || undefined}
                    onChange={(e) => setFormData({ ...formData, validTo: e.target.value })} className={inputCls} />
                </div>
              </div>

              <div>
                <label htmlFor="d-desc" className={labelCls}>Description</label>
                <textarea id="d-desc" rows="3" value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={inputCls} placeholder="Brief description of the discount" />
              </div>

              <div>
                <span className={labelCls}>Applicable Categories</span>
                <div className="max-h-32 space-y-2 overflow-y-auto rounded-[10px] border border-border bg-surface p-3">
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={formData.applicableCategories.includes('all')}
                      onChange={(e) =>
                        setFormData({ ...formData, applicableCategories: e.target.checked ? ['all'] : [] })
                      }
                      className="accent-[var(--primary)]"
                    />
                    All Categories
                  </label>
                  {categories.map((category) => (
                    <label key={category._id} className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={formData.applicableCategories.includes(category._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              applicableCategories: formData.applicableCategories.includes('all')
                                ? [category._id]
                                : [...formData.applicableCategories.filter((c) => c !== 'all'), category._id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              applicableCategories: formData.applicableCategories.filter((c) => c !== category._id),
                            });
                          }
                        }}
                        className="accent-[var(--primary)]"
                        disabled={formData.applicableCategories.includes('all')}
                      />
                      {category.name}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="d-status" className={labelCls}>Status</label>
                <select id="d-status" value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={inputCls}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  disabled={loading}
                  className="rounded-[10px] border border-border bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-raised disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-fg shadow-sm transition-colors hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Saving…' : editingDiscount ? 'Update Discount' : 'Add Discount'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Discounts;

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchManufacturers,
  createManufacturer,
  updateManufacturer,
  deleteManufacturer,
  clearError,
  clearSuccess,
  clearCurrentManufacturer,
} from '../redux/slices/manufacturerSlice';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

import { cn } from '../lib/utils';
import { Card, CardContent } from '../ui/card';
import Skeleton from '../ui/skeleton';
import EmptyState from '../ui/empty-state';

const inputCls =
  'w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-ink shadow-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50';
const labelCls = 'mb-1 block text-sm font-medium text-ink';

const Manufacturer = () => {
  const dispatch = useDispatch();
  const { manufacturers, loading, error, success } = useSelector((state) => state.manufacturer);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingManufacturer, setEditingManufacturer] = useState(null);
  const [formData, setFormData] = useState({ code: '', name: '', address: '' });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    dispatch(fetchManufacturers());
  }, [dispatch]);

  useEffect(() => {
    if (success) {
      setIsModalOpen(false);
      setEditingManufacturer(null);
      setFormData({ code: '', name: '', address: '' });
      setTimeout(() => dispatch(clearSuccess()), 3000);
    }
  }, [success, dispatch]);

  useEffect(() => {
    if (error) {
      setTimeout(() => dispatch(clearError()), 5000);
    }
  }, [error, dispatch]);

  const handleOpenModal = (manufacturer = null) => {
    if (manufacturer) {
      setEditingManufacturer(manufacturer);
      setFormData({
        code: manufacturer.code,
        name: manufacturer.name || '',
        address: manufacturer.address,
      });
    } else {
      setEditingManufacturer(null);
      setFormData({ code: '', name: '', address: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingManufacturer(null);
    setFormData({ code: '', name: '', address: '' });
    dispatch(clearCurrentManufacturer());
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim() || !formData.address.trim()) return;

    if (editingManufacturer) {
      await dispatch(updateManufacturer({ id: editingManufacturer._id, manufacturerData: formData }));
    } else {
      await dispatch(createManufacturer(formData));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this manufacturer?')) {
      await dispatch(deleteManufacturer(id));
    }
  };

  const filteredManufacturers = manufacturers.filter(
    (m) =>
      m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.name && m.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Manufacturers</h1>
          <p className="mt-0.5 text-sm text-muted">Manage manufacturer information for labelling</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-fg shadow-sm transition-colors hover:opacity-90"
        >
          <PlusIcon className="h-5 w-5" />
          Add Manufacturer
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-[12px] border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          <CheckCircleIcon className="h-5 w-5 shrink-0" />
          Operation completed successfully
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-[12px] border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
          <span>{String(error)}</span>
          <button onClick={() => dispatch(clearError())} className="ml-auto" aria-label="Dismiss error">
            <XCircleIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* List */}
      <Card>
        <CardContent>
          <div className="relative mb-4 w-full sm:max-w-xs">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              placeholder="Search code, name or address…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(inputCls, 'pl-9')}
            />
          </div>

          {loading && manufacturers.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : filteredManufacturers.length === 0 ? (
            <EmptyState
              title={searchQuery ? 'No manufacturers match' : 'No manufacturers yet'}
              message={searchQuery ? 'Try a different search term.' : 'Add your first manufacturer to get started.'}
              icon={BuildingOfficeIcon}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="pb-2 pr-4">Code</th>
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Address</th>
                    <th className="pb-2 pr-4">Created</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredManufacturers.map((manufacturer) => (
                    <tr key={manufacturer._id} className="hover:bg-surface/60">
                      <td className="py-2.5 pr-4 font-mono text-xs font-medium text-ink">{manufacturer.code}</td>
                      <td className="py-2.5 pr-4 font-medium text-ink">{manufacturer.name || '—'}</td>
                      <td className="max-w-sm py-2.5 pr-4 text-muted">{manufacturer.address}</td>
                      <td className="py-2.5 pr-4 whitespace-nowrap text-muted">{formatDate(manufacturer.createdAt)}</td>
                      <td className="py-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenModal(manufacturer)}
                            className="rounded-[8px] p-1.5 text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                            title="Edit manufacturer"
                            aria-label={`Edit ${manufacturer.name || manufacturer.code}`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(manufacturer._id)}
                            className="rounded-[8px] p-1.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                            title="Delete manufacturer"
                            aria-label={`Delete ${manufacturer.name || manufacturer.code}`}
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[18px] border border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-display text-lg font-semibold text-ink">
                {editingManufacturer ? 'Edit Manufacturer' : 'Add Manufacturer'}
              </h2>
              <button onClick={handleCloseModal} className="text-muted transition-colors hover:text-ink" aria-label="Close">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label htmlFor="m-code" className={labelCls}>Code <span className="text-danger">*</span></label>
                <input
                  id="m-code"
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                  className={cn(inputCls, 'font-mono')}
                  placeholder="e.g. SMS"
                />
              </div>

              <div>
                <label htmlFor="m-name" className={labelCls}>Name <span className="text-danger">*</span></label>
                <input
                  id="m-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className={inputCls}
                  placeholder="e.g. SMS Traders"
                />
              </div>

              <div>
                <label htmlFor="m-address" className={labelCls}>Address <span className="text-danger">*</span></label>
                <textarea
                  id="m-address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  rows="4"
                  className={inputCls}
                  placeholder="Enter manufacturer address"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 rounded-[10px] border border-border bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-raised"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-fg shadow-sm transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Saving…' : editingManufacturer ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Manufacturer;

// pages/categories.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  clearError,
} from '../redux/slices/categoriesSlice';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  TagIcon,
  MagnifyingGlassIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

import { cn } from '../lib/utils';
import Badge from '../ui/badge';
import { Card } from '../ui/card';
import Skeleton from '../ui/skeleton';
import EmptyState from '../ui/empty-state';

const inputCls =
  'w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-ink shadow-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50';
const labelCls = 'mb-1 block text-sm font-medium text-ink';

const EMPTY_FORM = { name: '', description: '', imageFile: null, imagePreview: '', hsn: '' };

const Categories = () => {
  const dispatch = useDispatch();
  const { categories, loading, error } = useSelector((state) => state.categories);

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [search, setSearch] = useState('');

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
    dispatch(fetchCategories());
  }, [dispatch]);

  const validateForm = () => {
    const errors = {};
    if (!formData.name || formData.name.trim() === '') errors.name = 'Category name is required';
    if (!formData.imageFile && !formData.imagePreview) errors.image = 'Category image is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const formDataObj = new FormData();
    formDataObj.append('name', formData.name);
    formDataObj.append('description', formData.description);
    formDataObj.append('hsn', formData.hsn || '');
    if (formData.imageFile) formDataObj.append('image', formData.imageFile);

    try {
      if (editingCategory) {
        await dispatch(updateCategory({ id: editingCategory._id, categoryData: formDataObj })).unwrap();
      } else {
        await dispatch(createCategory(formDataObj)).unwrap();
      }
      closeModal();
    } catch (error) {
      console.error('Category submission error:', error);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || '',
      imageFile: null,
      imagePreview: category.image || '',
      hsn: category.hsn || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await dispatch(deleteCategory(id)).unwrap();
      } catch (error) {
        console.error('Failed to delete category:', error);
      }
    }
  };

  const handleToggleStatus = async (category) => {
    try {
      const fd = new FormData();
      fd.append('name', category.name);
      fd.append('description', category.description || '');
      fd.append('hsn', category.hsn || '');
      fd.append('isActive', (!category.isActive).toString());
      await dispatch(updateCategory({ id: category._id, categoryData: fd })).unwrap();
    } catch (error) {
      console.error('Failed to toggle category status:', error);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    dispatch(clearError());
  };

  const formatDate = (dateString) =>
    dateString ? new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Categories</h1>
          <p className="mt-0.5 text-sm text-muted">Organize your products into categories</p>
        </div>
        <button
          onClick={() => { setEditingCategory(null); setFormData(EMPTY_FORM); setFormErrors({}); setShowModal(true); }}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-fg shadow-sm transition-colors hover:opacity-90 disabled:opacity-50"
        >
          <PlusIcon className="h-5 w-5" />
          Add Category
        </button>
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

      {/* Search */}
      <div className="relative w-full sm:max-w-xs">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          placeholder="Search categories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(inputCls, 'pl-9')}
        />
      </div>

      {/* Grid */}
      {loading && categories.length === 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-[18px]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? 'No categories match' : 'No categories yet'}
          message={search ? 'Try a different search term.' : 'Create your first category to organize products.'}
          icon={TagIcon}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((category) => {
            const active = category.isActive !== false;
            return (
              <Card key={category._id} className="overflow-hidden">
                {/* Image banner */}
                <div className="h-32 w-full bg-surface-raised">
                  {category.image ? (
                    <img src={category.image} alt={category.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <TagIcon className="h-10 w-10 text-muted" />
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold text-ink">{category.name}</h3>
                    <Badge tone={active ? 'success' : 'danger'}>{active ? 'Active' : 'Inactive'}</Badge>
                  </div>

                  <p className="mt-1 line-clamp-2 text-sm text-muted">{category.description || 'No description'}</p>

                  <div className="mt-3 flex items-center gap-4 text-xs text-muted">
                    {category.hsn && <span>HSN <span className="font-mono text-ink">{category.hsn}</span></span>}
                    <span>Created {formatDate(category.createdAt)}</span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                    >
                      <PencilIcon className="h-4 w-4" /> Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(category)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-warn hover:bg-warn-soft hover:text-warn"
                    >
                      {active ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                      {active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(category._id)}
                      className="inline-flex items-center justify-center rounded-[10px] border border-border bg-surface px-3 py-2 text-danger transition-colors hover:border-danger hover:bg-danger-soft"
                      aria-label={`Delete ${category.name}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[18px] border border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-display text-lg font-semibold text-ink">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h2>
              <button onClick={closeModal} className="text-muted transition-colors hover:text-ink" aria-label="Close">
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label htmlFor="cat-name" className={labelCls}>Category Name <span className="text-danger">*</span></label>
                <input
                  id="cat-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. Sweets, Snacks"
                />
                {formErrors.name && <p className="mt-1 text-sm text-danger">{formErrors.name}</p>}
              </div>

              <div>
                <label htmlFor="cat-desc" className={labelCls}>Description</label>
                <textarea
                  id="cat-desc"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="cat-image" className={labelCls}>Category Image <span className="text-danger">*</span></label>
                <input
                  id="cat-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setFormData({ ...formData, imageFile: file, imagePreview: URL.createObjectURL(file) });
                    }
                  }}
                  className="w-full text-sm text-muted file:mr-3 file:rounded-[8px] file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/20"
                />
                {formErrors.image && <p className="mt-1 text-sm text-danger">{formErrors.image}</p>}
                {formData.imagePreview && (
                  <img src={formData.imagePreview} alt="Preview" className="mt-2 h-20 w-20 rounded-[10px] border border-border object-cover" />
                )}
              </div>

              <div>
                <label htmlFor="cat-hsn" className={labelCls}>HSN Code</label>
                <input
                  id="cat-hsn"
                  type="text"
                  value={formData.hsn}
                  onChange={(e) => setFormData({ ...formData, hsn: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. 17049030"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-fg shadow-sm transition-colors hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Saving…' : editingCategory ? 'Update Category' : 'Add Category'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-[10px] border border-border bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-raised"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;

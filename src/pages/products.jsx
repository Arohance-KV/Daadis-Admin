//pages/products.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  clearError,
} from "../redux/slices/productsSlice";
import { fetchCategories } from "../redux/slices/categoriesSlice";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { useLocation, useNavigate } from "react-router-dom";

import { cn } from "../lib/utils";
import useLazyRows from "../hooks/useLazyRows";
import Badge from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import Skeleton from "../ui/skeleton";
import EmptyState from "../ui/empty-state";

// Fresh, unfrozen clone of quantity-discount tiers. Objects pulled from the
// Redux store are frozen by Immer; editing them in place silently fails, so
// the form must always work on its own copies.
const cloneDiscounts = (tiers) =>
  Array.isArray(tiers) && tiers.length > 0
    ? tiers.map((d) => ({
        minQuantity: d.minQuantity,
        discountType: d.discountType,
        discountValue: d.discountValue,
      }))
    : [{ minQuantity: 1, discountType: "percentage", discountValue: 5 }];

const inputCls =
  "w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-ink shadow-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50";
const labelCls = "mb-1 block text-sm font-medium text-ink";

// Same threshold as the dashboard's inventory buckets
const stockBadge = (stock) => {
  const s = Number(stock) || 0;
  if (s === 0) return { tone: "danger", label: "Out of stock" };
  if (s < 100) return { tone: "warn", label: `Low · ${s}` };
  return { tone: "success", label: `In stock · ${s}` };
};

const EMPTY_FORM = {
  name: "",
  code: "",
  category: "",
  price: "",
  stock: "",
  description: "",
  rating: "",
  ratingCount: "",
  // Unified, ordered image list: { key, kind: 'existing'|'new', url? , file?, preview? }
  imageItems: [],
  tags: [""],
  vegetarian: true,
  weight: { number: "", unit: "g" },
  dimensions: { l: "", b: "", h: "" },
  quantityDiscounts: [{ minQuantity: 1, discountType: "percentage", discountValue: 5 }],
};

const Products = () => {
  const dispatch = useDispatch();
  // Whole catalog, filtered + lazily rendered on the client (like Orders/Customers).
  const products = useSelector((state) => state.products.allProducts);
  const listLoading = useSelector((state) => state.products.allLoading);
  const listError = useSelector((state) => state.products.allError);
  // Mutations (create/update/delete) still use the paginated slice's flags.
  const saving = useSelector((state) => state.products.loading);
  const error = useSelector((state) => state.products.error);
  const { categories } = useSelector((state) => state.categories);

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const nextKey = useRef(0); // stable keys for newly-added image items
  const location = useLocation();
  const navigate = useNavigate();

  // Handle navigation from Dashboard
  useEffect(() => {
    if (location.state?.openAddModal) {
      handleOpenModal();
      navigate(location.pathname, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    dispatch(fetchAllProducts());
    dispatch(fetchCategories());
  }, [dispatch]);

  // Client-side filtering: instant, no per-keystroke requests, no stale-page bugs.
  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      const catId = p.category?._id || p.category;
      if (filterCategory && catId !== filterCategory) return false;
      if (!q) return true;
      const catName = categories.find((c) => c._id === catId)?.name || "";
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.code || "").toLowerCase().includes(q) ||
        catName.toLowerCase().includes(q) ||
        (p.tags || []).some((t) => String(t).toLowerCase().includes(q))
      );
    });
  }, [products, categories, searchTerm, filterCategory]);

  const { visible, sentinelRef, reset } = useLazyRows(filteredProducts.length, 12);

  // Free any object URLs held by new-image items to avoid leaks.
  const revokePreviews = (items = []) =>
    items.forEach((it) => it.kind === "new" && it.preview && URL.revokeObjectURL(it.preview));

  const resetForm = () => {
    revokePreviews(formData.imageItems);
    setFormData(EMPTY_FORM);
  };

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name || "",
        code: product.code || "",
        category: product.category?._id || product.category || "",
        price: product.price || "",
        stock: product.stock || "",
        description: product.description || "",
        rating: product.rating ?? "",
        ratingCount: product.ratingCount ?? "",
        imageItems: (product.images || []).map((url) => ({ key: url, kind: "existing", url })),
        tags: product.tags?.length > 0 ? product.tags : [""],
        vegetarian: product.vegetarian !== undefined ? product.vegetarian : true,
        weight: {
          number: product.weight?.number || "",
          unit: product.weight?.unit || "g",
        },
        dimensions: {
          l: product.dimensions?.l || "",
          b: product.dimensions?.b || "",
          h: product.dimensions?.h || "",
        },
        quantityDiscounts: cloneDiscounts(product.quantityDiscounts),
      });
    } else {
      setEditingProduct(null);
      resetForm();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    resetForm();
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith("weight.")) {
      const weightField = name.split(".")[1];
      setFormData((prev) => ({ ...prev, weight: { ...prev.weight, [weightField]: value } }));
    } else if (name.startsWith("dimensions.")) {
      const dimField = name.split(".")[1];
      setFormData((prev) => ({ ...prev, dimensions: { ...prev.dimensions, [dimField]: value } }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    }
  };

  const handleTagChange = (index, value) => {
    const newTags = [...formData.tags];
    newTags[index] = value;
    setFormData((prev) => ({ ...prev, tags: newTags }));
  };

  const addTag = () => setFormData((prev) => ({ ...prev, tags: [...prev.tags, ""] }));

  const removeTag = (index) =>
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((_, i) => i !== index) }));

  const handleAddImages = (e) => {
    const files = Array.from(e.target.files || []);
    const items = files.map((file) => ({
      key: `new-${nextKey.current++}`,
      kind: "new",
      file,
      preview: URL.createObjectURL(file),
    }));
    setFormData((prev) => ({ ...prev, imageItems: [...prev.imageItems, ...items] }));
    e.target.value = ""; // let the same file be re-picked later
  };

  // Swap an image with its neighbour (dir: -1 left / +1 right).
  const moveImage = (index, dir) => {
    setFormData((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.imageItems.length) return prev;
      const items = [...prev.imageItems];
      [items[index], items[target]] = [items[target], items[index]];
      return { ...prev, imageItems: items };
    });
  };

  const makeMain = (index) => {
    setFormData((prev) => {
      if (index === 0) return prev;
      const items = [...prev.imageItems];
      const [it] = items.splice(index, 1);
      items.unshift(it);
      return { ...prev, imageItems: items };
    });
  };

  const removeImage = (index) => {
    setFormData((prev) => {
      const it = prev.imageItems[index];
      if (it?.kind === "new" && it.preview) URL.revokeObjectURL(it.preview);
      return { ...prev, imageItems: prev.imageItems.filter((_, i) => i !== index) };
    });
  };

  const clearAllImages = () => {
    setFormData((prev) => {
      revokePreviews(prev.imageItems);
      return { ...prev, imageItems: [] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const items = formData.imageItems;
    const newFiles = items.filter((it) => it.kind === "new").map((it) => it.file);
    const base = {
      name: formData.name,
      code: formData.code,
      category: formData.category,
      price: formData.price,
      stock: formData.stock,
      description: formData.description,
      rating: formData.rating,
      ratingCount: formData.ratingCount,
      vegetarian: formData.vegetarian,
      tags: formData.tags.filter((tag) => tag.trim() !== ""),
      weight: formData.weight,
      dimensions: formData.dimensions,
      quantityDiscounts: formData.quantityDiscounts,
    };
    try {
      if (editingProduct) {
        await dispatch(
          updateProduct({
            id: editingProduct._id,
            productData: {
              ...base,
              existingImages: items.filter((it) => it.kind === "existing").map((it) => it.url),
              // Final display order; '__NEW__' slots consume newFiles in order.
              imageOrder: items.map((it) => (it.kind === "existing" ? it.url : "__NEW__")),
              images: newFiles,
            },
          })
        ).unwrap();
      } else {
        await dispatch(createProduct({ ...base, imageFiles: newFiles })).unwrap();
      }
      handleCloseModal();
      dispatch(fetchAllProducts());
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  const handleDelete = async (productId) => {
    try {
      await dispatch(deleteProduct(productId)).unwrap();
      setDeleteConfirm(null);
      dispatch(fetchAllProducts());
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find((cat) => cat._id === categoryId);
    return category ? category.name : "Unknown";
  };

  const bannerError = error || listError;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Products</h1>
          <p className="mt-0.5 text-sm text-muted">
            {products.length ? `${products.length} products in catalog` : "Manage your catalog"}
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-fg shadow-sm transition-colors hover:opacity-90"
        >
          <PlusIcon className="h-5 w-5" />
          Add Product
        </button>
      </div>

      {/* Error banner */}
      {bannerError && (
        <div className="rounded-[12px] border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">
                Error {bannerError.status && `(${bannerError.status})`}
              </p>
              <p className="mt-0.5">{bannerError.message || "An unknown error occurred"}</p>
              {bannerError.details && (
                <>
                  <button
                    onClick={() => setShowErrorDetails(!showErrorDetails)}
                    className="mt-1 text-xs underline"
                  >
                    {showErrorDetails ? "Hide" : "Show"} details
                  </button>
                  {showErrorDetails && (
                    <pre className="mt-2 overflow-auto rounded-[8px] bg-surface p-2 text-xs text-ink">
                      {JSON.stringify(bannerError.details, null, 2)}
                    </pre>
                  )}
                </>
              )}
            </div>
            {error && (
              <button onClick={() => dispatch(clearError())} aria-label="Dismiss error">
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder="Search by name, code, category or tag…"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); reset(); }}
            className={cn(inputCls, "pl-9")}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); reset(); }}
            className={inputCls}
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>{category.name}</option>
            ))}
          </select>
          {(searchTerm || filterCategory) && (
            <button
              onClick={() => { setSearchTerm(""); setFilterCategory(""); reset(); }}
              className="rounded-[8px] p-2 text-muted transition-colors hover:bg-surface-raised hover:text-ink"
              aria-label="Clear filters"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {listLoading && products.length === 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-[18px]" />)}
        </div>
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          title="No products found"
          message={searchTerm || filterCategory ? "Try different filters." : "Add your first product to get started."}
          icon={ShoppingBagIcon}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.slice(0, visible).map((product) => {
              const stock = stockBadge(product.stock);
              return (
                <Card key={product._id} className="overflow-hidden">
                  <div className="relative aspect-square bg-surface-raised">
                    {product.images && product.images.length > 0 ? (
                      <>
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        {product.images.length > 1 && (
                          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                            +{product.images.length - 1}
                          </span>
                        )}
                      </>
                    ) : (
                      <div className="grid h-full w-full place-items-center text-muted">
                        <PhotoIcon className="h-12 w-12" />
                      </div>
                    )}
                    <span className="absolute left-2 top-2">
                      <Badge tone={stock.tone}>{stock.label}</Badge>
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-1 font-medium text-ink">{product.name}</h3>
                      {/* veg / non-veg mark */}
                      <span
                        className={cn(
                          "mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border",
                          product.vegetarian ? "border-success" : "border-danger"
                        )}
                        title={product.vegetarian ? "Vegetarian" : "Non-vegetarian"}
                      >
                        <span className={cn("h-2 w-2 rounded-full", product.vegetarian ? "bg-success" : "bg-danger")} />
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      <span className="font-mono">{product.code}</span> · {getCategoryName(product.category?._id || product.category)}
                    </p>
                    <p className="mt-2 font-display text-xl font-semibold tabular-nums text-ink">
                      ₹{Number(product.price).toLocaleString("en-IN")}
                    </p>
                    {product.quantityDiscounts && product.quantityDiscounts.length > 0 && (
                      <p className="mt-0.5 text-xs text-success">
                        Bulk discounts from {product.quantityDiscounts[0].minQuantity} units
                      </p>
                    )}

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleOpenModal(product)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                      >
                        <PencilIcon className="h-4 w-4" /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(product)}
                        className="inline-flex items-center justify-center rounded-[10px] border border-border bg-surface px-3 py-2 text-danger transition-colors hover:border-danger hover:bg-danger-soft"
                        aria-label={`Delete ${product.name}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Lazy-load sentinel: reveals more cards as you scroll */}
          <div ref={sentinelRef} />
          <p className="text-center text-xs text-muted">
            Showing {Math.min(visible, filteredProducts.length)} of {filteredProducts.length} products
            {visible < filteredProducts.length && " — scroll for more"}
          </p>
        </>
      )}

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[18px] border border-border bg-surface shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
              <h2 className="font-display text-lg font-semibold text-ink">
                {editingProduct ? "Edit Product" : "Add Product"}
              </h2>
              <button onClick={handleCloseModal} className="text-muted transition-colors hover:text-ink" aria-label="Close">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              {/* Basics */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="p-name" className={labelCls}>Product Name <span className="text-danger">*</span></label>
                  <input id="p-name" type="text" name="name" value={formData.name} onChange={handleInputChange} className={inputCls} required />
                </div>
                <div>
                  <label htmlFor="p-code" className={labelCls}>Product Code <span className="text-danger">*</span></label>
                  <input id="p-code" type="text" name="code" value={formData.code} onChange={handleInputChange} className={cn(inputCls, "font-mono")} required />
                </div>
                <div>
                  <label htmlFor="p-category" className={labelCls}>Category <span className="text-danger">*</span></label>
                  <select id="p-category" name="category" value={formData.category} onChange={handleInputChange} className={inputCls} required>
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>{category.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="p-price" className={labelCls}>Price (₹) <span className="text-danger">*</span></label>
                  <input id="p-price" type="number" name="price" value={formData.price} onChange={handleInputChange} step="0.01" min="0" className={inputCls} required />
                </div>
                <div>
                  <label htmlFor="p-stock" className={labelCls}>Stock <span className="text-danger">*</span></label>
                  <input id="p-stock" type="number" name="stock" value={formData.stock} onChange={handleInputChange} min="0" className={inputCls} required />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      name="vegetarian"
                      checked={formData.vegetarian}
                      onChange={handleInputChange}
                      className="accent-[var(--primary)]"
                    />
                    Vegetarian
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="p-desc" className={labelCls}>Description</label>
                <textarea id="p-desc" name="description" value={formData.description} onChange={handleInputChange} rows={3} className={inputCls} />
              </div>

              {/* Rating */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="p-rating" className={labelCls}>Rating (0–5)</label>
                  <input id="p-rating" type="number" name="rating" value={formData.rating} onChange={handleInputChange}
                    min="0" max="5" step="0.1" placeholder="e.g. 4.6" className={inputCls} />
                </div>
                <div>
                  <label htmlFor="p-rating-count" className={labelCls}>Number of Ratings</label>
                  <input id="p-rating-count" type="number" name="ratingCount" value={formData.ratingCount} onChange={handleInputChange}
                    min="0" step="1" placeholder="e.g. 128" className={inputCls} />
                </div>
              </div>

              {/* Weight & dimensions */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <span className={labelCls}>Weight</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" name="weight.number" value={formData.weight.number} onChange={handleInputChange}
                      placeholder="Weight" step="0.01" min="0" className={inputCls} aria-label="Weight value" />
                    <select name="weight.unit" value={formData.weight.unit} onChange={handleInputChange} className={inputCls} aria-label="Weight unit">
                      <option value="g">Grams</option>
                      <option value="kg">Kilograms</option>
                      <option value="ml">Milliliters</option>
                      <option value="l">Liters</option>
                    </select>
                  </div>
                </div>
                <div>
                  <span className={labelCls}>Dimensions (L × B × H, cm)</span>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" name="dimensions.l" value={formData.dimensions.l} onChange={handleInputChange}
                      placeholder="L" step="0.1" min="0" className={inputCls} aria-label="Length" />
                    <input type="number" name="dimensions.b" value={formData.dimensions.b} onChange={handleInputChange}
                      placeholder="B" step="0.1" min="0" className={inputCls} aria-label="Breadth" />
                    <input type="number" name="dimensions.h" value={formData.dimensions.h} onChange={handleInputChange}
                      placeholder="H" step="0.1" min="0" className={inputCls} aria-label="Height" />
                  </div>
                </div>
              </div>

              {/* Quantity Discounts */}
              <div>
                <span className={labelCls}>
                  Quantity Discounts <span className="ml-1 text-xs font-normal text-muted">(for bulk purchases)</span>
                </span>
                <div className="space-y-3">
                  {formData.quantityDiscounts.map((discount, index) => (
                    <div key={index} className="flex items-end gap-3 rounded-[12px] bg-surface-raised p-3">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs text-muted">Min Qty</label>
                        <input
                          type="number"
                          placeholder="e.g. 10"
                          value={discount.minQuantity}
                          onChange={(e) => {
                            const v = parseInt(e.target.value) || 0;
                            setFormData((prev) => ({
                              ...prev,
                              quantityDiscounts: prev.quantityDiscounts.map((d, i) =>
                                i === index ? { ...d, minQuantity: v } : d
                              ),
                            }));
                          }}
                          className={inputCls}
                          min="1"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="mb-1 block text-xs text-muted">Type</label>
                        <select
                          value={discount.discountType}
                          onChange={(e) => {
                            const v = e.target.value;
                            setFormData((prev) => ({
                              ...prev,
                              quantityDiscounts: prev.quantityDiscounts.map((d, i) =>
                                i === index ? { ...d, discountType: v } : d
                              ),
                            }));
                          }}
                          className={inputCls}
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed (₹)</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="mb-1 block text-xs text-muted">
                          Value {discount.discountType === "percentage" ? "(%)" : "(₹)"}
                        </label>
                        <input
                          type="number"
                          placeholder={discount.discountType === "percentage" ? "e.g. 10" : "e.g. 100"}
                          value={discount.discountValue}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            setFormData((prev) => ({
                              ...prev,
                              quantityDiscounts: prev.quantityDiscounts.map((d, i) =>
                                i === index ? { ...d, discountValue: v } : d
                              ),
                            }));
                          }}
                          className={inputCls}
                          min="0"
                          step={discount.discountType === "percentage" ? "1" : "0.01"}
                          max={discount.discountType === "percentage" ? "100" : undefined}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newDiscounts = formData.quantityDiscounts.filter((_, i) => i !== index);
                          setFormData({ ...formData, quantityDiscounts: newDiscounts });
                        }}
                        className="rounded-[8px] p-2 text-danger transition-colors hover:bg-danger-soft"
                        title="Remove discount tier"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        quantityDiscounts: [
                          ...formData.quantityDiscounts,
                          { minQuantity: 1, discountType: "percentage", discountValue: 0 },
                        ],
                      })
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-border py-3 text-sm font-medium text-muted transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Discount Tier
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div>
                <span className={labelCls}>Tags</span>
                {formData.tags.map((tag, index) => (
                  <div key={index} className="mb-2 flex gap-2">
                    <input
                      type="text"
                      value={tag}
                      onChange={(e) => handleTagChange(index, e.target.value)}
                      placeholder="Enter tag"
                      className={cn(inputCls, "flex-1")}
                      aria-label={`Tag ${index + 1}`}
                    />
                    {formData.tags.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
                        className="rounded-[8px] p-2 text-danger transition-colors hover:bg-danger-soft"
                        aria-label={`Remove tag ${index + 1}`}
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addTag} className="text-sm font-medium text-primary hover:underline">
                  + Add Tag
                </button>
              </div>

              {/* Images */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={labelCls}>
                    Product Images
                    <span className="ml-1 text-xs font-normal text-muted">(first image is the main one — reorder below)</span>
                  </span>
                  {formData.imageItems.length > 0 && (
                    <button type="button" onClick={clearAllImages} className="text-sm text-danger hover:underline">
                      Clear all
                    </button>
                  )}
                </div>

                <div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleAddImages}
                    className="w-full text-sm text-muted file:mr-3 file:rounded-[8px] file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/20"
                    aria-label="Upload product images"
                  />
                  <p className="mt-1 text-xs text-muted">JPG/PNG/WebP, up to 5MB each. Drag order with the arrows or “Set as main”.</p>
                </div>

                {formData.imageItems.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {formData.imageItems.map((item, index) => (
                      <div
                        key={item.key}
                        className={cn(
                          "group relative overflow-hidden rounded-[12px] border bg-surface-raised",
                          index === 0 ? "border-primary ring-2 ring-primary/40" : "border-border"
                        )}
                      >
                        <div className="aspect-square">
                          <img
                            src={item.kind === "existing" ? item.url : item.preview}
                            alt={`Image ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        {/* Main badge / new tag */}
                        {index === 0 ? (
                          <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-fg">
                            Main
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => makeMain(index)}
                            className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            Set as main
                          </button>
                        )}
                        {item.kind === "new" && (
                          <span className="absolute bottom-1.5 left-1.5 rounded bg-success/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                            New
                          </span>
                        )}

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-danger text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label={`Remove image ${index + 1}`}
                        >
                          ×
                        </button>

                        {/* Reorder controls */}
                        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => moveImage(index, -1)}
                            disabled={index === 0}
                            className="grid h-6 w-6 place-items-center rounded-md bg-white/90 text-ink disabled:opacity-30"
                            aria-label={`Move image ${index + 1} left`}
                          >
                            <ChevronLeftIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(index, 1)}
                            disabled={index === formData.imageItems.length - 1}
                            className="grid h-6 w-6 place-items-center rounded-md bg-white/90 text-ink disabled:opacity-30"
                            aria-label={`Move image ${index + 1} right`}
                          >
                            <ChevronRightIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 border-t border-border pt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-[10px] border border-border bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-raised"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-fg shadow-sm transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-fg border-t-transparent" />}
                  {saving
                    ? editingProduct ? "Updating…" : "Creating…"
                    : editingProduct ? "Update Product" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardContent>
              <h3 className="font-display text-lg font-semibold text-ink">Confirm Delete</h3>
              <p className="mt-2 text-sm text-muted">
                Are you sure you want to delete "{deleteConfirm.name}"? This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="rounded-[10px] border border-border bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-raised"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm._id)}
                  disabled={saving}
                  className="rounded-[10px] bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Deleting…" : "Delete"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Products;

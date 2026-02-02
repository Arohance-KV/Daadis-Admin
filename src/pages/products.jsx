//pages/prouducts.jsx
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchProducts,
  fetchProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  clearError,
  setPagination,
} from "../redux/slices/productsSlice";
import { fetchCategories } from "../redux/slices/categoriesSlice";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { useLocation, useNavigate } from "react-router-dom";

const Products = () => {
  const dispatch = useDispatch();
  const { products, loading, error, pagination } = useSelector(
    (state) => state.products,
  );
  const { categories } = useSelector((state) => state.categories);

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    category: "",
    price: "",
    stock: "",
    description: "",
    existingImages: [],
    newImages: [],
    imagesToDelete: [], // Track images to be deleted
    tags: [""],
    vegetarian: true,
    weight: { number: "", unit: "g" },
    dimensions: { l: "", b: "", h: "" },
    quantityDiscounts: [
      { minQuantity: 1, discountType: "percentage", discountValue: 5 },
    ],
  });

  // Image preview state
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();

  // Handle navigation from Dashboard
  useEffect(() => {
    if (location.state?.openAddModal) {
      handleOpenModal();
      // Clear the state to prevent reopening on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    dispatch(fetchProducts({ page: 1, limit: 12 }));
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    const searchParams = {
      page: pagination.page,
      limit: pagination.limit,
    };

    if (searchTerm) searchParams.search = searchTerm;
    if (filterCategory) searchParams.category = filterCategory;

    if (filterCategory) {
      dispatch(
        fetchProductsByCategory({
          categoryId: filterCategory,
          params: searchParams,
        }),
      );
    } else {
      dispatch(fetchProducts(searchParams));
    }
  }, [dispatch, filterCategory, searchTerm, pagination.page]);

  // Enhanced error display
  const displayError = (errorObj) => {
    if (!errorObj) return null;

    const message = errorObj.message || "An unknown error occurred";
    const status = errorObj.status;
    const details = errorObj.details;

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mt-0.5 mr-3" />
          <div className="flex-1">
            <h3 className="text-red-800 font-medium">
              Error {status && `(${status})`}
            </h3>
            <p className="text-red-700 mt-1">{message}</p>
            {details && (
              <div className="mt-2">
                <button
                  onClick={() => setShowErrorDetails(!showErrorDetails)}
                  className="text-red-600 hover:text-red-800 text-sm underline"
                >
                  {showErrorDetails ? "Hide" : "Show"} Details
                </button>
                {showErrorDetails && (
                  <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
                    {JSON.stringify(details, null, 2)}
                  </pre>
                )}
              </div>
            )}
            <button
              onClick={() => dispatch(clearError())}
              className="text-red-600 hover:text-red-800 text-sm font-medium mt-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      category: "",
      price: "",
      stock: "",
      description: "",
      existingImages: [],
      newImages: [],
      imagesToDelete: [],
      tags: [""],
      vegetarian: true,
      weight: { number: "", unit: "g" },
      dimensions: { l: "", b: "", h: "" },
      quantityDiscounts: [
        { minQuantity: 1, discountType: "percentage", discountValue: 5 },
      ],
    });
    setImagePreviewUrls([]);
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
        existingImages: product.images || [],
        newImages: [],
        imagesToDelete: [],
        tags: product.tags?.length > 0 ? product.tags : [""],
        vegetarian:
          product.vegetarian !== undefined ? product.vegetarian : true,
        weight: {
          number: product.weight?.number || "",
          unit: product.weight?.unit || "g",
        },
        dimensions: {
          l: product.dimensions?.l || "",
          b: product.dimensions?.b || "",
          h: product.dimensions?.h || "",
        },
        quantityDiscounts:
          product.quantityDiscounts?.length > 0
            ? product.quantityDiscounts
            : [
                {
                  minQuantity: 1,
                  discountType: "percentage",
                  discountValue: 5,
                },
              ],
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
      setFormData((prev) => ({
        ...prev,
        weight: { ...prev.weight, [weightField]: value },
      }));
    } else if (name.startsWith("dimensions.")) {
      const dimField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        dimensions: { ...prev.dimensions, [dimField]: value },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handleTagChange = (index, value) => {
    const newTags = [...formData.tags];
    newTags[index] = value;
    setFormData((prev) => ({ ...prev, tags: newTags }));
  };

  const addTag = () => {
    setFormData((prev) => ({ ...prev, tags: [...prev.tags, ""] }));
  };

  const removeTag = (index) => {
    const newTags = formData.tags.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, tags: newTags }));
  };

  // Enhanced image handling
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);

    // Create preview URLs for new images
    const newPreviewUrls = files.map((file) => URL.createObjectURL(file));

    setFormData((prev) => ({
      ...prev,
      newImages: [...prev.newImages, ...files],
    }));

    setImagePreviewUrls((prev) => [...prev, ...newPreviewUrls]);
  };

  // Remove existing image (mark for deletion)
  const removeExistingImage = (imageUrl, index) => {
    setFormData((prev) => ({
      ...prev,
      existingImages: prev.existingImages.filter((_, i) => i !== index),
      imagesToDelete: [...prev.imagesToDelete, imageUrl],
    }));
  };

  // Remove new image (before upload)
  const removeNewImage = (index) => {
    // Revoke the preview URL to free memory
    URL.revokeObjectURL(imagePreviewUrls[index]);

    setFormData((prev) => ({
      ...prev,
      newImages: prev.newImages.filter((_, i) => i !== index),
    }));

    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Clear all images
  const clearAllImages = () => {
    // Revoke all preview URLs
    imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));

    setFormData((prev) => ({
      ...prev,
      newImages: [],
      imagesToDelete: [...prev.imagesToDelete, ...prev.existingImages],
      existingImages: [],
    }));

    setImagePreviewUrls([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingProduct) {
        // For updates, send both existing and new images properly
        const productData = {
          name: formData.name,
          code: formData.code,
          category: formData.category,
          price: formData.price,
          stock: formData.stock,
          description: formData.description,
          vegetarian: formData.vegetarian,
          tags: formData.tags.filter((tag) => tag.trim() !== ""),
          weight: formData.weight,
          dimensions: formData.dimensions,
          existingImages: formData.existingImages, // Keep as array
          quantityDiscounts: formData.quantityDiscounts,
          images: formData.newImages, // New images to upload
        };

        await dispatch(
          updateProduct({ id: editingProduct._id, productData }),
        ).unwrap();
      } else {
        // For create, pass the complete form data structure
        const productData = {
          name: formData.name,
          code: formData.code,
          category: formData.category,
          price: formData.price,
          stock: formData.stock,
          description: formData.description,
          vegetarian: formData.vegetarian,
          imageFiles: formData.newImages, // All selected images
          weight: formData.weight,
          dimensions: formData.dimensions,
          tags: formData.tags.filter((tag) => tag.trim() !== ""),
          quantityDiscounts: formData.quantityDiscounts,
        };

        await dispatch(createProduct(productData)).unwrap();
      }
      handleCloseModal();
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  const handleDelete = async (productId) => {
    try {
      await dispatch(deleteProduct(productId)).unwrap();
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handlePageChange = (page) => {
    dispatch(setPagination({ page }));
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find((cat) => cat._id === categoryId);
    return category ? category.name : "Unknown Category";
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
        <button
          onClick={() => handleOpenModal()}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Add Product
        </button>
      </div>

      {error && displayError(error)}

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
            {(searchTerm || filterCategory) && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterCategory("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="bg-white rounded-lg shadow-sm border">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
              {products.map((product) => (
                <div
                  key={product._id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden relative">
                    {product.images && product.images.length > 0 ? (
                      <>
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        {product.images.length > 1 && (
                          <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                            +{product.images.length - 1}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <PhotoIcon className="w-12 h-12" />
                      </div>
                    )}
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Code: {product.code}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    Category:{" "}
                    {getCategoryName(product.category?._id || product.category)}
                  </p>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-lg font-semibold text-green-600">
                      ₹{product.price}
                    </span>
                    <span className="text-sm text-gray-600">
                      Stock: {product.stock}
                    </span>
                  </div>
                  {/* Inside product card, after price */}
                  {product.quantityDiscounts &&
                    product.quantityDiscounts.length > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        Bulk discounts available from{" "}
                        {product.quantityDiscounts[0].minQuantity} units
                      </p>
                    )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(product)}
                      className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg flex items-center justify-center gap-1"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(product)}
                      className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg flex items-center justify-center gap-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="border-t p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total,
                    )}{" "}
                    of {pagination.total} products
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    {Array.from(
                      { length: pagination.pages },
                      (_, i) => i + 1,
                    ).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 border rounded-lg ${
                          page === pagination.page
                            ? "bg-blue-600 text-white border-blue-600"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                      className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">
                  {editingProduct ? "Edit Product" : "Add Product"}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Code *
                    </label>
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price *
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock *
                    </label>
                    <input
                      type="number"
                      name="stock"
                      value={formData.stock}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="vegetarian"
                        checked={formData.vegetarian}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Vegetarian
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Weight Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      name="weight.number"
                      value={formData.weight.number}
                      onChange={handleInputChange}
                      placeholder="Weight"
                      step="0.01"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <select
                      name="weight.unit"
                      value={formData.weight.unit}
                      onChange={handleInputChange}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="g">Grams</option>
                      <option value="kg">Kilograms</option>
                      <option value="ml">Milliliters</option>
                      <option value="l">Liters</option>
                    </select>
                  </div>
                </div>

                {/* Dimensions Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dimensions (L x B x H in cm)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      name="dimensions.l"
                      value={formData.dimensions.l}
                      onChange={handleInputChange}
                      placeholder="Length"
                      step="0.1"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="number"
                      name="dimensions.b"
                      value={formData.dimensions.b}
                      onChange={handleInputChange}
                      placeholder="Breadth"
                      step="0.1"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="number"
                      name="dimensions.h"
                      value={formData.dimensions.h}
                      onChange={handleInputChange}
                      placeholder="Height"
                      step="0.1"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Quantity Discounts Section */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Quantity Discounts
                    <span className="text-gray-500 font-normal text-xs ml-2">
                      (Set discounts for bulk purchases)
                    </span>
                  </label>
                  <div className="space-y-3">
                    {formData.quantityDiscounts.map((discount, index) => (
                      <div
                        key={index}
                        className="flex gap-3 items-center bg-gray-50 p-3 rounded-lg"
                      >
                        {/* Min Quantity */}
                        <div className="flex-1">
                          <label className="block text-xs text-gray-600 mb-1">
                            Min Qty
                          </label>
                          <input
                            type="number"
                            placeholder="e.g., 10"
                            value={discount.minQuantity}
                            onChange={(e) => {
                              const newDiscounts = [
                                ...formData.quantityDiscounts,
                              ];
                              newDiscounts[index].minQuantity =
                                parseInt(e.target.value) || 0;
                              setFormData({
                                ...formData,
                                quantityDiscounts: newDiscounts,
                              });
                            }}
                            className="w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                            min="1"
                          />
                        </div>

                        {/* Discount Type */}
                        <div className="flex-1">
                          <label className="block text-xs text-gray-600 mb-1">
                            Type
                          </label>
                          <select
                            value={discount.discountType}
                            onChange={(e) => {
                              const newDiscounts = [
                                ...formData.quantityDiscounts,
                              ];
                              newDiscounts[index].discountType = e.target.value;
                              setFormData({
                                ...formData,
                                quantityDiscounts: newDiscounts,
                              });
                            }}
                            className="w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                          >
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed">Fixed (₹)</option>
                          </select>
                        </div>

                        {/* Discount Value */}
                        <div className="flex-1">
                          <label className="block text-xs text-gray-600 mb-1">
                            Value{" "}
                            {discount.discountType === "percentage"
                              ? "(%)"
                              : "(₹)"}
                          </label>
                          <input
                            type="number"
                            placeholder={
                              discount.discountType === "percentage"
                                ? "e.g., 10"
                                : "e.g., 100"
                            }
                            value={discount.discountValue}
                            onChange={(e) => {
                              const newDiscounts = [
                                ...formData.quantityDiscounts,
                              ];
                              newDiscounts[index].discountValue =
                                parseFloat(e.target.value) || 0;
                              setFormData({
                                ...formData,
                                quantityDiscounts: newDiscounts,
                              });
                            }}
                            className="w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                            min="0"
                            step={
                              discount.discountType === "percentage"
                                ? "1"
                                : "0.01"
                            }
                            max={
                              discount.discountType === "percentage"
                                ? "100"
                                : undefined
                            }
                          />
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const newDiscounts =
                              formData.quantityDiscounts.filter(
                                (_, i) => i !== index,
                              );
                            setFormData({
                              ...formData,
                              quantityDiscounts: newDiscounts,
                            });
                          }}
                          className="mt-5 p-2 rounded-lg transition-colors text-red-600 hover:bg-red-50 hover:text-red-700"
                          title="Remove discount tier"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ))}

                    {/* Add Discount Tier Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          quantityDiscounts: [
                            ...formData.quantityDiscounts,
                            {
                              minQuantity: 1,
                              discountType: "percentage",
                              discountValue: 0,
                            },
                          ],
                        });
                      }}
                      className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add Discount Tier
                    </button>
                  </div>
                </div>

                {/* Tags Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  {formData.tags.map((tag, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={tag}
                        onChange={(e) => handleTagChange(index, e.target.value)}
                        placeholder="Enter tag"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {formData.tags.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTag(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addTag}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Add Tag
                  </button>
                </div>

                {/* Enhanced Image Management Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Product Images
                    </label>
                    {(formData.existingImages.length > 0 ||
                      formData.newImages.length > 0) && (
                      <button
                        type="button"
                        onClick={clearAllImages}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Clear All Images
                      </button>
                    )}
                  </div>

                  {/* File Upload */}
                  <div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Select multiple images. Supported formats: JPG, PNG, GIF,
                      WebP
                    </p>
                  </div>

                  {/* Existing Images (for edit mode) */}
                  {editingProduct && formData.existingImages.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Current Images
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {formData.existingImages.map((imageUrl, index) => (
                          <div
                            key={`existing-${index}`}
                            className="relative group"
                          >
                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                              <img
                                src={imageUrl}
                                alt={`Existing ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                removeExistingImage(imageUrl, index)
                              }
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                            <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                              Current
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Images Preview */}
                  {formData.newImages.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        New Images ({formData.newImages.length})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {formData.newImages.map((file, index) => (
                          <div key={`new-${index}`} className="relative group">
                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                              <img
                                src={imagePreviewUrls[index]}
                                alt={`New ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeNewImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                            <div className="absolute bottom-1 left-1 bg-green-600 bg-opacity-80 text-white text-xs px-1 rounded">
                              New
                            </div>
                            <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                              {(file.size / 1024 / 1024).toFixed(1)}MB
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Image Upload Instructions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start">
                      <PhotoIcon className="w-5 h-5 text-blue-400 mt-0.5 mr-2" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium">Image Upload Tips:</p>
                        <ul className="mt-1 space-y-1 text-xs">
                          <li>
                            • Upload multiple images to showcase your product
                            from different angles
                          </li>
                          <li>
                            • First image will be used as the main product image
                          </li>
                          <li>• Recommended size: 800x800px or larger</li>
                          <li>• Maximum file size: 5MB per image</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {loading
                      ? editingProduct
                        ? "Updating..."
                        : "Creating..."
                      : editingProduct
                        ? "Update Product"
                        : "Create Product"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{deleteConfirm.name}"? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm._id)}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;

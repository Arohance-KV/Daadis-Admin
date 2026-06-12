// redux/slices/productsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { productsAPI } from "../../utils/api";

// Initial state
const initialState = {
  products: [],
  pagination: {
    page: 1,
    pages: 1,
    total: 0,
    limit: 12
  },
  loading: false,
  error: null,
  currentProduct: null,
};

// Async thunks
export const fetchProducts = createAsyncThunk(
  "products/fetchProducts",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await productsAPI.getAllProducts(params);
      return {
        products: response.data.products || [],
        pagination: {
          page: response.data.page || 1,
          pages: response.data.pages || 1,
          total: response.data.total || 0,
          limit: params.limit || 12
        }
      };
    } catch (error) {
      console.error('Fetch products error:', error);
      return rejectWithValue({
        message: error.message || "Failed to fetch products",
        status: error.status,
        details: error.responseData
      });
    }
  }
);

export const fetchProductsByCategory = createAsyncThunk(
  "products/fetchProductsByCategory",
  async ({ categoryId, params = {} }, { rejectWithValue }) => {
    try {
      const response = await productsAPI.getProductsByCategory(categoryId, params);
      return {
        products: response.data.products || [],
        pagination: {
          page: response.data.page || 1,
          pages: response.data.pages || 1,
          total: response.data.total || 0,
          limit: params.limit || 12
        }
      };
    } catch (error) {
      console.error('Fetch category products error:', error);
      return rejectWithValue({
        message: error.message || "Failed to fetch category products",
        status: error.status,
        details: error.responseData
      });
    }
  }
);

export const fetchProductById = createAsyncThunk(
  "products/fetchProductById",
  async (productId, { rejectWithValue }) => {
    try {
      const response = await productsAPI.getProductById(productId);
      return response.data;
    } catch (error) {
      console.error('Fetch product by ID error:', error);
      return rejectWithValue({
        message: error.message || "Failed to fetch product",
        status: error.status,
        details: error.responseData
      });
    }
  }
);

export const createProduct = createAsyncThunk(
  "products/createProduct",
  async (productData, { rejectWithValue }) => {
    try {
      const response = await productsAPI.createProduct(productData);
      // NOTE: The list is refreshed by the component using its current
      // category/search/page filters. Do NOT refresh here with an
      // unfiltered fetchProducts(), or it will overwrite the filtered view.
      return response.data;
    } catch (error) {
      console.error('Create product error:', error);
      return rejectWithValue({
        message: error.message || "Failed to create product",
        status: error.status,
        details: error.responseData
      });
    }
  }
);

export const updateProduct = createAsyncThunk(
  "products/updateProduct",
  async ({ id, productData }, { rejectWithValue }) => {
    try {
      const response = await productsAPI.updateProduct(id, productData);
      // NOTE: The list is refreshed by the component using its current
      // category/search/page filters. Do NOT refresh here with an
      // unfiltered fetchProducts(), or it will overwrite the filtered view.
      return response.data;
    } catch (error) {
      console.error('Update product error:', error);
      return rejectWithValue({
        message: error.message || "Failed to update product",
        status: error.status,
        details: error.responseData
      });
    }
  }
);

export const deleteProduct = createAsyncThunk(
  "products/deleteProduct",
  async (productId, { rejectWithValue }) => {
    try {
      await productsAPI.deleteProduct(productId);
      // NOTE: The list is refreshed by the component using its current
      // category/search/page filters. Do NOT refresh here with an
      // unfiltered fetchProducts(), or it will overwrite the filtered view.
      return productId;
    } catch (error) {
      console.error('Delete product error:', error);
      return rejectWithValue({
        message: error.message || "Failed to delete product",
        status: error.status,
        details: error.responseData
      });
    }
  }
);

// Slice
const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentProduct: (state, action) => {
      state.currentProduct = action.payload;
    },
    clearCurrentProduct: (state) => {
      state.currentProduct = null;
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch products
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.products;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: "Error fetching products" };
        console.error('Products fetch failed:', action.payload);
      })

      // Fetch by category
      .addCase(fetchProductsByCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductsByCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.products;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchProductsByCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: "Error fetching category products" };
        console.error('Category products fetch failed:', action.payload);
      })

      // Fetch product by ID
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: "Error fetching product" };
        console.error('Product fetch by ID failed:', action.payload);
      })

      // Create product
      .addCase(createProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state) => {
        state.loading = false;
        // Product list will be refreshed by the dispatched fetchProducts
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: "Error creating product" };
        console.error('Product creation failed:', action.payload);
      })

      // Update product
      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state) => {
        state.loading = false;
        // Product list will be refreshed by the dispatched fetchProducts
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: "Error updating product" };
        console.error('Product update failed:', action.payload);
      })

      // Delete product
      .addCase(deleteProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state) => {
        state.loading = false;
        // Product list will be refreshed by the dispatched fetchProducts
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: "Error deleting product" };
        console.error('Product deletion failed:', action.payload);
      });
  },
});

export const { clearError, setCurrentProduct, clearCurrentProduct, setPagination } = productsSlice.actions;
export default productsSlice.reducer;
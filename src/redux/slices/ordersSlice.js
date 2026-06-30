// slices/ordersSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ordersAPI } from '../../utils/api';

// Async thunks for API calls
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await ordersAPI.getAllOrders(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await ordersAPI.getOrderById(orderId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async ({ orderId, status }, { rejectWithValue }) => {
    try {
      const response = await ordersAPI.updateOrderStatus(orderId, status);
      return { orderId, status, data: response.data };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch every page of orders so dashboard aggregates are accurate.
// ponytail: sequential page loop, hard-capped at 200 pages (safety).
export const fetchAllOrders = createAsyncThunk(
  'orders/fetchAllOrders',
  async (_, { rejectWithValue }) => {
    try {
      const first = await ordersAPI.getAllOrders({ page: 1, limit: 100 });
      const data = first.data;
      let all = data.orders || [];
      const totalPages = Math.min(data.totalPages || 1, 200);
      if ((data.totalPages || 1) > 200) {
        console.warn(`fetchAllOrders: capped at 200 pages; ${data.totalPages} pages exist. Dashboard totals are partial.`);
      }
      for (let p = 2; p <= totalPages; p++) {
        const res = await ordersAPI.getAllOrders({ page: p, limit: 100 });
        all = all.concat(res.data.orders || []);
      }
      return { orders: all, total: data.total ?? all.length, totalPages, currentPage: 1, limit: 100 };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  orders: [],
  // Full collection for the dashboard — kept separate from the paginated
  // `orders`/`pagination` so the Orders page's paging is never clobbered.
  allOrders: [],
  allLoading: false,
  allError: null,
  selectedOrder: null,
  loading: false,
  error: null,
  pagination: {
    total: 0,
    totalPages: 0,
    currentPage: 1,
    limit: 10
  }
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedOrder: (state) => {
      state.selectedOrder = null;
    },
    setPage: (state, action) => {
      state.pagination.currentPage = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Orders
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload.orders;
        state.pagination = {
          total: action.payload.total,
          totalPages: action.payload.totalPages,
          currentPage: action.payload.currentPage,
          limit: action.payload.limit
        };
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Order by ID
      .addCase(fetchOrderById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedOrder = action.payload;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Order Status
      .addCase(updateOrderStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.loading = false;
        const { orderId, status } = action.payload;
        
        // Update order in orders array
        const orderIndex = state.orders.findIndex(order => order._id === orderId);
        if (orderIndex !== -1) {
          state.orders[orderIndex].status = status;
        }
        
        // Update selected order if it's the same one
        if (state.selectedOrder && state.selectedOrder._id === orderId) {
          state.selectedOrder.status = status;
        }
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch All Orders (full collection for dashboard — isolated state)
      .addCase(fetchAllOrders.pending, (state) => { state.allLoading = true; state.allError = null; })
      .addCase(fetchAllOrders.fulfilled, (state, action) => {
        state.allLoading = false;
        state.allOrders = action.payload.orders;
      })
      .addCase(fetchAllOrders.rejected, (state, action) => { state.allLoading = false; state.allError = action.payload; });
  }
});

export const { clearError, clearSelectedOrder, setPage } = ordersSlice.actions;
export default ordersSlice.reducer;
// pages/Orders.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchOrders, updateOrderStatus, fetchOrderById, clearError } from '../redux/slices/ordersSlice';
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
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const Orders = () => {
  const dispatch = useDispatch();
  const { orders, loading, error, pagination } = useSelector((state) => state.orders);
  
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  // Seed status filter from ?status= so dashboard deep-links land pre-filtered.
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  // Fetch orders on component mount
  useEffect(() => {
    dispatch(fetchOrders({ page: 1, limit: 10 }));
  }, [dispatch]);

  // Keep the status filter in sync if the ?status= deep-link changes while mounted.
  useEffect(() => {
    setStatusFilter(searchParams.get('status') || 'all');
  }, [searchParams]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await dispatch(updateOrderStatus({ orderId, status: newStatus })).unwrap();
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder({...selectedOrder, status: newStatus});
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.shippingAddress.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (order.shippingAddress.phone && order.shippingAddress.phone.includes(searchTerm));
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'returned': return 'bg-orange-100 text-orange-800';
      case 'paid': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <ClockIcon className="w-4 h-4" />;
      case 'processing': return <ShoppingCartIcon className="w-4 h-4" />;
      case 'shipped': return <TruckIcon className="w-4 h-4" />;
      case 'delivered': return <CheckCircleIcon className="w-4 h-4" />;
      case 'cancelled': return <XCircleIcon className="w-4 h-4" />;
      case 'failed': return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'returned': return <ArrowPathIcon className="w-4 h-4" />;
      case 'paid': return <CheckCircleIcon className="w-4 h-4" />;
      default: return <ClockIcon className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOrderStats = () => {
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      processing: orders.filter(o => ['processing', 'shipped'].includes(o.status)).length,
      completed: orders.filter(o => o.status === 'delivered').length,
      totalRevenue: orders.filter(o => !['cancelled', 'failed', 'returned'].includes(o.status)).reduce((sum, o) => sum + o.total, 0)
    };
    return stats;
  };

  const stats = getOrderStats();

  const formatAddress = (address) => {
    return `${address.addressLine1}${address.addressLine2 ? ', ' + address.addressLine2 : ''}, ${address.city}, ${address.state} ${address.pinCode}`;
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600 mt-1">Track and manage customer orders</p>
        </div>
        <button
          onClick={() => dispatch(fetchOrders({ page: pagination.currentPage, limit: pagination.limit }))}
          disabled={loading}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
            <span>{error}</span>
            <button 
              onClick={() => dispatch(clearError())}
              className="ml-auto text-red-700 hover:text-red-900"
            >
              <XCircleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Order Number, Customer Name, or Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="failed">Failed</option>
            <option value="returned">Returned</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <ShoppingCartIcon className="w-12 h-12 text-orange-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <ClockIcon className="w-12 h-12 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Processing</p>
              <p className="text-3xl font-bold text-blue-600">{stats.processing}</p>
            </div>
            <TruckIcon className="w-12 h-12 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <CheckCircleIcon className="w-12 h-12 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <p className="text-3xl font-bold text-purple-600">₹{stats.totalRevenue.toLocaleString()}</p>
            </div>
            <CurrencyRupeeIcon className="w-12 h-12 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                      <div className="text-sm text-gray-500">{formatDate(order.createdAt)}</div>
                      {order.trackingNumber && (
                        <div className="text-xs text-blue-600">Track: {order.trackingNumber}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{order.shippingAddress.name}</div>
                      <div className="text-sm text-gray-500">{order.shippingAddress.phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                    </div>
                    <div className="text-sm text-gray-500">
                      {order.items.slice(0, 2).map(item => item.productName).join(', ')}
                      {order.items.length > 2 && ` +${order.items.length - 2} more`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">₹{order.total.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">{order.paymentMethod.toUpperCase()}</div>
                    <div className="text-xs text-gray-400">Status: {order.paymentStatus}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        disabled={loading}
                        className={`text-xs font-medium px-2.5 py-1.5 rounded-full border-0 ${getStatusColor(order.status)} focus:ring-2 focus:ring-orange-500 disabled:opacity-50`}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="failed">Failed</option>
                        <option value="returned">Returned</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewOrder(order._id)}
                        className="text-orange-600 hover:text-orange-900"
                        title="View Details"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Order Details - {selectedOrder.orderNumber}
                </h3>
                <button
                  onClick={() => setShowOrderDetail(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Customer Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Customer Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> {selectedOrder.shippingAddress.name}</p>
                    <p><span className="font-medium">Phone:</span> {selectedOrder.shippingAddress.phone}</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Order Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Order Date:</span> {formatDate(selectedOrder.createdAt)}</p>
                    <p><span className="font-medium">Payment Method:</span> {selectedOrder.paymentMethod.toUpperCase()}</p>
                    <p><span className="font-medium">Payment Status:</span> {selectedOrder.paymentStatus}</p>
                    {selectedOrder.trackingNumber && (
                      <p><span className="font-medium">Tracking:</span> {selectedOrder.trackingNumber}</p>
                    )}
                    <p>
                      <span className="font-medium">Status:</span> 
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusIcon(selectedOrder.status)}
                        <span className="ml-1">{selectedOrder.status}</span>
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Shipping Address</h4>
                  <div className="text-sm text-gray-700">
                    <p className="font-medium">{selectedOrder.shippingAddress.name}</p>
                    <p>{formatAddress(selectedOrder.shippingAddress)}</p>
                    <p>{selectedOrder.shippingAddress.country}</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Billing Address</h4>
                  <div className="text-sm text-gray-700">
                    <p className="font-medium">{selectedOrder.billingAddress.name}</p>
                    <p>{formatAddress(selectedOrder.billingAddress)}</p>
                    <p>{selectedOrder.billingAddress.country}</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedOrder.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              {item.productImage && (
                                <img src={item.productImage} alt={item.productName} className="w-10 h-10 rounded mr-3" />
                              )}
                              <span className="text-sm font-medium text-gray-900">{item.productName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{item.productCode}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">₹{item.priceAtPurchase}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">₹{item.itemTotal.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Order Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{selectedOrder.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping Charge:</span>
                    <span>₹{selectedOrder.shippingCharge}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax Amount:</span>
                    <span>₹{selectedOrder.taxAmount}</span>
                  </div>
                  {selectedOrder.appliedCoupon && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({selectedOrder.appliedCoupon.code}):</span>
                      <span>-₹{selectedOrder.appliedCoupon.discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>₹{selectedOrder.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Special Instructions</h4>
                  <p className="text-sm text-gray-700">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Status Update */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Update Status:</label>
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => {
                      handleStatusChange(selectedOrder._id, e.target.value);
                      setSelectedOrder({...selectedOrder, status: e.target.value});
                    }}
                    disabled={loading}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="failed">Failed</option>
                    <option value="returned">Returned</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowOrderDetail(false);
                      setShowInvoice(true);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                  >
                    <PrinterIcon className="w-4 h-4" />
                    Print Invoice
                  </button>
                  <button
                    onClick={() => setShowOrderDetail(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
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
      {/* Invoice Print Modal */}
{showInvoice && selectedOrder && (
  <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] overflow-y-auto">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10 modal-header">
        <h3 className="text-lg font-medium text-gray-900">Invoice</h3>
        <div className="flex space-x-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            <PrinterIcon className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => setShowInvoice(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
      <div className="p-4">
        <InvoicePrint 
          order={selectedOrder}
          invoiceNumber={selectedOrder.orderNumber}
        />
      </div>
    </div>
  </div>
)}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => dispatch(fetchOrders({ page: pagination.currentPage - 1, limit: pagination.limit }))}
              disabled={pagination.currentPage === 1 || loading}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              onClick={() => dispatch(fetchOrders({ page: pagination.currentPage + 1, limit: pagination.limit }))}
              disabled={pagination.currentPage === pagination.totalPages || loading}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
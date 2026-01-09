import React, { useState, useEffect } from 'react';
import { productsAPI, categoriesAPI } from '../utils/api';

const InvoicePrint = ({ order, invoiceNumber}) => {
  const [productsData, setProductsData] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch product and category details for HSN codes
  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const productDataMap = {};
        
        // Fetch details for each product in the order
        for (const item of order.items) {
          const productId = item.product || item.productId;
          if (productId) {
            try {
              const response = await productsAPI.getProductById(productId);
              const product = response.data;
              console.log('Product details:', product);
              
              // Fetch category details for HSN code
              let hsn = null;
              const categoryId = product.category || product.categoryId;
              console.log('Category ID:', categoryId);
              if (categoryId) {
                try {
                  const categoryResponse = await categoriesAPI.getCategoryById(categoryId);
                  console.log('Category details:', categoryResponse.data);
                  // Try different possible field names for HSN
                  hsn = categoryResponse.data?.hsn || categoryResponse.data?.HSN || categoryResponse.data?.hsnCode || null;
                  console.log('HSN found:', hsn);
                } catch (error) {
                  console.error('Could not fetch category:', error);
                }
              } else {
                console.log('No category ID found in product');
              }
              
              productDataMap[productId] = {
                hsn: hsn,
                product: product
              };
            } catch (error) {
              console.error(`Could not fetch product ${productId}:`, error);
            }
          }
        }
        
        setProductsData(productDataMap);
      } catch (error) {
        console.error('Error fetching product details:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (order.items && order.items.length > 0) {
      fetchProductDetails();
    } else {
      setLoading(false);
    }
  }, [order]);

  // Calculate tax based on HSN code
  const calculateTax = (unitPrice, hsn) => {
    if (hsn === '21069099') {
      return (unitPrice * 0.05); // 5% tax
    }
    return 0; // 0% for other HSN codes
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatAddress = (address) => {
    return `${address.addressLine1}${address.addressLine2 ? ', ' + address.addressLine2 : ''}, ${address.city}, ${address.state} ${address.pinCode}`;
  };

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto print:p-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @media print {
          /* Hide everything except the invoice */
          body * {
            visibility: hidden;
          }
          
          .print-container,
          .print-container * {
            visibility: visible;
          }
          
          /* Position the print container */
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
          }

          /* Page setup */
          @page {
            size: A4;
            margin: 10mm;
          }

          /* Prevent page breaks inside these elements */
          table, tr, td, th, .signature-section, .no-break {
            page-break-inside: avoid;
          }

          /* Ensure proper page breaks */
          .page-break-before {
            page-break-before: always;
          }

          .page-break-after {
            page-break-after: always;
          }

          /* Remove any modal/overlay styling */
          .fixed, .bg-gray-900, .bg-opacity-75 {
            position: static !important;
            background: white !important;
          }

          /* Hide modal controls */
          button, .modal-header {
            display: none !important;
          }
        }

        /* Screen view only */
        @media screen {
          .print-container {
            max-width: 210mm;
            min-height: 297mm;
          }
        }
      `}</style>
      
      <div className="print-container">
        {/* Header with Logo */}
        <div className="text-center mb-6 no-break">
          <img 
            src="https://res.cloudinary.com/dhezrgjf6/image/upload/v1759314456/daadi_s_logo_wnca68.png" 
            alt="Daadi's Logo" 
            className="inline-block h-30 mb-4"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>

        {/* Tax Invoice Title */}
        <div className="text-center border-t-2 border-b-2 border-gray-800 py-2 mb-6 no-break">
          <h1 className="text-2xl font-bold">TAX INVOICE</h1>
        </div>

        {/* Invoice Details Section */}
        <div className="grid grid-cols-3 gap-6 mb-8 no-break">
          {/* Shipping Address */}
          <div>
            <h3 className="font-bold mb-2 text-sm">SHIPPING ADDRESS:</h3>
            <div className="text-xs leading-relaxed">
              <p>{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>{order.shippingAddress.city}, {order.shippingAddress.state}</p>
              <p>{order.shippingAddress.pinCode}</p>
              <p>{order.shippingAddress.country}</p>
            </div>
          </div>

          {/* Sold By */}
          <div>
            <h3 className="font-bold mb-2 text-sm">SOLD BY:</h3>
            <div className="text-xs leading-relaxed">
              <p className="font-semibold">MEGHRAJ MARKETING PRIVATE</p>
              <p className="font-semibold">LIMITED</p>
              <p>Plot No 322-A, Shed No 13,</p>
              <p>Bommasandra - Jigani Link Road</p>
              <p>Near Indian Oil Petro Pump,</p>
              <p>Bangalore 560105</p>
              <p>Karnataka</p>
              <p>India</p>
              <p>State Code: 29</p>
              <p className="mt-1">GSTIN No: 29AABCM2290G1ZP</p>
              <p>Website: www.daadis.in</p>
              <p>Email: contact@meghrajgroup.in</p>
            </div>
          </div>

          {/* Invoice Details */}
          <div>
            <h3 className="font-bold mb-2 text-sm">INVOICE DETAILS:</h3>
            <div className="text-xs leading-relaxed">
              <p><span className="inline-block w-32">INVOICE NO.</span>: {invoiceNumber}</p>
              <p><span className="inline-block w-32">INVOICE DATE</span>: {formatDate(order.createdAt)}</p>
              <p><span className="inline-block w-32">ORDER NO.</span>: {order.orderNumber}</p>
              <p><span className="inline-block w-32">ORDER DATE</span>: {formatDate(order.createdAt)}</p>
              <p><span className="inline-block w-32">METHOD</span>: {order.paymentMethod}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full border-collapse border border-gray-800 text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-800 px-2 py-2 text-left font-bold">S.NO.</th>
                <th className="border border-gray-800 px-2 py-2 text-left font-bold">PRODUCT NAME</th>
                <th className="border border-gray-800 px-2 py-2 text-center font-bold">HSN</th>
                <th className="border border-gray-800 px-2 py-2 text-center font-bold">QTY</th>
                <th className="border border-gray-800 px-2 py-2 text-right font-bold">UNIT PRICE</th>
                <th className="border border-gray-800 px-2 py-2 text-right font-bold">UNIT DISCOUNT</th>
                <th className="border border-gray-800 px-2 py-2 text-right font-bold">TAXABLE VALUE</th>
                <th className="border border-gray-800 px-2 py-2 text-center font-bold">IGST<br/>(Value | %)</th>
                <th className="border border-gray-800 px-2 py-2 text-right font-bold">TOTAL<br/>(Including GST)</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => {
                const productId = item.product || item.productId;
                const productInfo = productsData[productId];
                const hsn = productInfo?.hsn || 'N/A';
                const unitTax = calculateTax(item.priceAtPurchase, hsn);
                const taxableValue = item.priceAtPurchase - unitTax;
                const totalWithTax = item.itemTotal;
                
                return (
                  <tr key={index}>
                    <td className="border border-gray-800 px-2 py-3 text-center">{index + 1}</td>
                    <td className="border border-gray-800 px-2 py-3">
                      <div className="font-semibold">{item.productName}</div>
                      <div className="text-gray-600">SKU: {item.productCode}</div>
                    </td>
                    <td className="border border-gray-800 px-2 py-3 text-center">{hsn}</td>
                    <td className="border border-gray-800 px-2 py-3 text-center">{item.quantity}</td>
                    <td className="border border-gray-800 px-2 py-3 text-right">Rs. {item.priceAtPurchase.toFixed(2)}</td>
                    <td className="border border-gray-800 px-2 py-3 text-right">Rs. {unitTax.toFixed(2)}</td>
                    <td className="border border-gray-800 px-2 py-3 text-right">Rs. {taxableValue.toFixed(2)}</td>
                    <td className="border border-gray-800 px-2 py-3 text-center">{unitTax.toFixed(2)} | {hsn === '21069099' ? '5.00' : '0.00'}</td>
                    <td className="border border-gray-800 px-2 py-3 text-right">Rs. {totalWithTax.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Net Total */}
        <div className="text-right mb-8 no-break">
          <div className="inline-block">
            <div className="flex justify-between items-center gap-8 mb-2">
              <span className="font-bold">NET TOTAL (In Value)</span>
              <span className="font-bold">Rs. {order.total.toFixed(2)}</span>
            </div>
            <div className="text-xs text-left">
              <p>Whether tax is payable under reverse charge- No</p>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="mt-12 signature-section no-break">
          <div className="border-2 border-gray-800 inline-block p-4" style={{ width: '200px', height: '100px' }}>
            <img 
              src="https://res.cloudinary.com/dhezrgjf6/image/upload/v1759314520/daadissignature_vmvdau.png" 
              alt="Authorized Signature" 
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <div className="mt-2 text-xs">
            <p className="font-bold">Authorized Signature for</p>
            <p className="font-bold">MEGHRAJ MARKETING</p>
            <p className="font-bold">PRIVATE LIMITED</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePrint;
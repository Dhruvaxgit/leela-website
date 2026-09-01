import React, { useState, useEffect } from 'react';

const CART_STORAGE_KEY = 'leela_cart_cache';

function Cartpage({ onBackToSearch }) {
  const [cartItems, setCartItems] = useState([]);
  const [orderCompleteMessage, setOrderCompleteMessage] = useState('');

  // 1. Read all saved items directly from browser cache memory
  useEffect(() => {
    loadCartFromCache();
  }, []);

  const loadCartFromCache = () => {
    try {
      const saved = sessionStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        setCartItems(JSON.parse(saved));
      } else {
        setCartItems([]);
      }
    } catch (e) {
      console.error('Error reading cart from cache:', e);
      setCartItems([]);
    }
  };

  const removeItem = (domainName) => {
    const updated = cartItems.filter((item) => item.domain !== domainName);
    setCartItems(updated);
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleCompletePurchase = () => {
    if (cartItems.length === 0) {
      alert('Your cart is empty!');
      return;
    }
    const total = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);
    setOrderCompleteMessage(`Order placed successfully for Total Bill: ₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Mock Order Confirmed).`);
  };

  const totalBill = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);

  return (
    <div>
      <button type="button" onClick={onBackToSearch}>
        &larr; Back to Domain Search
      </button>

      <h2>Checkout & Order Summary</h2>
      <p>Review the items saved in your cart before completing the purchase.</p>

      {cartItems.length === 0 ? (
        <div>
          <p>There are currently no items in your cart cache memory.</p>
          <button type="button" onClick={onBackToSearch}>
            Search Domains
          </button>
        </div>
      ) : (
        <div>
          <table border="1" cellPadding="8">
            <thead>
              <tr>
                <th>#</th>
                <th>Domain Name</th>
                <th>Registration Duration</th>
                <th>Price</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {cartItems.map((item, index) => (
                <tr key={item.domain}>
                  <td>{index + 1}</td>
                  <td>{item.domain}</td>
                  <td>{item.duration || '1 Year'}</td>
                  <td>{item.priceFormatted || `₹${item.price}`}</td>
                  <td>
                    <button type="button" onClick={() => removeItem(item.domain)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <br />

          <h3>
            Total Bill: ₹{totalBill.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>

          <br />

          {/* Dummy Complete Purchase Button */}
          <button type="button" onClick={handleCompletePurchase}>
            Complete Purchase
          </button>

          {orderCompleteMessage && (
            <div>
              <br />
              <p><strong>Status:</strong> {orderCompleteMessage}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Cartpage;

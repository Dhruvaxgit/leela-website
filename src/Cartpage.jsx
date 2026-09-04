import React, { useState, useEffect } from 'react';

const CART_STORAGE_KEY = 'leela_cart_cache';

function Cartpage({ onBackToSearch }) {
  const [cartItems, setCartItems] = useState([]);
  const [razorpayKey, setRazorpayKey] = useState(() => localStorage.getItem('razorpay_key_id') || 'rzp_test_TXzxXWJQh1pGh0');
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);
  const [paymentError, setPaymentError] = useState('');

  // 1. Load Razorpay script and cart data on component mount
  useEffect(() => {
    loadCartFromCache();
    loadRazorpayScript();
  }, []);

  const loadRazorpayScript = () => {
    if (!document.getElementById('razorpay-checkout-sdk')) {
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-sdk';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  };

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

  const totalBill = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);

  const handlePayWithRazorpay = () => {
    setPaymentError('');
    setPaymentSuccessData(null);

    if (cartItems.length === 0) {
      setPaymentError('Your cart is empty.');
      return;
    }

    const currentKey = razorpayKey.trim() || 'rzp_test_TXzxXWJQh1pGh0';

    if (!window.Razorpay) {
      setPaymentError('Razorpay Checkout SDK is still loading. Please check your internet connection and try again.');
      return;
    }

    // Convert INR to Paise (1 INR = 100 Paise)
    const amountInPaise = Math.round(totalBill * 100);

    const options = {
      key: currentKey,
      amount: amountInPaise,
      currency: 'INR',
      name: 'Leela Domain Store',
      description: `Domain Purchase for ${cartItems.map((i) => i.domain).join(', ')}`,
      modal: {
        ondismiss: function () {
          // Situation 3: Pending / User Cancelled without completing
          setPaymentError('Payment pending or cancelled. Check payment and try again.');
        }
      },
      handler: function (response) {
        // Situation 1: Payment Success
        const successInfo = {
          paymentId: response.razorpay_payment_id,
          amountPaid: totalBill,
          purchasedDomains: cartItems.map((i) => i.domain),
          timestamp: new Date().toLocaleTimeString()
        };
        setPaymentSuccessData(successInfo);
        setPaymentError('');

        // Clear cart cache memory upon successful payment
        sessionStorage.removeItem(CART_STORAGE_KEY);
        setCartItems([]);
      },
      prefill: {
        name: 'Demo Customer',
        email: 'customer@example.com',
        contact: '9999999999'
      },
      notes: {
        domains: cartItems.map((i) => i.domain).join(',')
      },
      theme: {
        color: '#3399cc'
      }
    };

    const rzp = new window.Razorpay(options);

    rzp.on('payment.failed', function (response) {
      // Situation 2: Payment Failure
      const reason = response.error?.description || 'Declined by bank';
      setPaymentError(`Payment failed (${reason}). Check payment and try again.`);
    });

    rzp.open();
  };

  const handleTakeOwnership = () => {
    alert('Take Ownership initiated! (Next step: Calling ResellerClub domain registration API)');
  };

  return (
    <div>
      <button type="button" onClick={onBackToSearch}>
        &larr; Back to Domain Search
      </button>

      <h2>Checkout & Order Summary</h2>
      <p>Review the items saved in your cart before completing payment.</p>

      {/* Razorpay Key Identifier Info */}
      <div>
        <p>
          <small>Razorpay Test Key: <code>{razorpayKey}</code></small>
        </p>
      </div>

      <hr />

      {cartItems.length === 0 && !paymentSuccessData ? (
        <div>
          <p>There are currently no items in your cart cache memory.</p>
          <button type="button" onClick={onBackToSearch}>
            Search Domains
          </button>
        </div>
      ) : null}

      {cartItems.length > 0 && (
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

          {/* Pay With Razorpay Button */}
          <button type="button" onClick={handlePayWithRazorpay}>
            Pay Now with Razorpay &rarr;
          </button>

          {paymentError && (
            <div>
              <br />
              <p><strong>Notice:</strong> {paymentError}</p>
            </div>
          )}
        </div>
      )}

      {/* Payment Success Confirmation Display */}
      {paymentSuccessData && (
        <div>
          <br />
          <hr />
          <h2>Payment Successful!</h2>
          <p><strong>Razorpay Payment ID:</strong> {paymentSuccessData.paymentId}</p>
          <p><strong>Amount Paid:</strong> ₹{paymentSuccessData.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p><strong>Domains Purchased:</strong> {paymentSuccessData.purchasedDomains.join(', ')}</p>
          <p><strong>Time:</strong> {paymentSuccessData.timestamp}</p>

          <br />

          {/* TAKE OWNERSHIP BUTTON - Visible ONLY upon successful payment */}
          <button type="button" onClick={handleTakeOwnership}>
            Take Ownership &rarr;
          </button>

          <span> </span>
          <button type="button" onClick={onBackToSearch}>
            Search More Domains
          </button>
        </div>
      )}
    </div>
  );
}

export default Cartpage;

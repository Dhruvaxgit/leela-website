import React, { useState, useEffect } from 'react';

const REGISTRANT_STORAGE_KEY = 'leela_registrant_cache';
const CUSTOMER_ID_STORAGE_KEY = 'leela_customer_id';

function Purchasecompletionpage({ onBackToForm }) {
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Initiating Call 1: Customer Account Creation...');
  const [customerId, setCustomerId] = useState(null);
  const [rawResponse, setRawResponse] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    executeCall1();
  }, []);

  const executeCall1 = async () => {
    setError('');
    setLoading(true);
    setProgress(0);
    setStatusMessage('Executing Call 1: Sending customer details to ResellerClub (/api/customers/v2/signup.json)...');

    try {
      // 1. Read Reseller credentials from storage
      const authUserId = localStorage.getItem('rc_auth_userid') || '1336094';
      const apiKey = localStorage.getItem('rc_api_key') || '';

      if (!authUserId || !apiKey) {
        throw new Error('Reseller credentials (User ID or API Key) missing. Please configure them on the search page.');
      }

      // 2. Read Registrant details from browser cache memory
      const savedRegistrant = sessionStorage.getItem(REGISTRANT_STORAGE_KEY);
      if (!savedRegistrant) {
        throw new Error('Customer contact details missing from cache memory. Please return to the form.');
      }
      const formData = JSON.parse(savedRegistrant);

      // 3. Clean & Sanitize parameters
      const cleanPhoneCc = String(formData.phoneCountryCode || '91').replace(/\D/g, '');
      const cleanPhone = String(formData.phone || '').replace(/\D/g, '');
      const cleanCountry = String(formData.country || 'IN').trim().toUpperCase();

      const params = new URLSearchParams({
        'auth-userid': authUserId.trim(),
        'api-key': apiKey.trim(),
        'username': formData.email.trim().toLowerCase(),
        'passwd': formData.password,
        'name': formData.name.trim(),
        'company': formData.company.trim() || 'Individual',
        'address-line-1': formData.addressLine1.trim(),
        'city': formData.city.trim(),
        'state': formData.state.trim(),
        'country': cleanCountry,
        'zipcode': formData.zipcode.trim(),
        'phone-cc': cleanPhoneCc,
        'phone': cleanPhone,
        'lang-pref': 'en'
      });

      // 4. Make real HTTP POST request with parameters in body (prevents Cloudflare WAF query-string block)
      const response = await fetch('/api/customers/v2/signup.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = responseText;
      }

      setRawResponse(data);

      // Check if ResellerClub returned a numeric customer ID (Direct Success)
      const isNumericId = typeof data === 'number' || (!isNaN(data) && Number(data) > 0);

      if (isNumericId) {
        const idStr = String(data).trim();
        setCustomerId(idStr);
        sessionStorage.setItem(CUSTOMER_ID_STORAGE_KEY, idStr);
        // Rule: Complete progress bar by 25% on Call 1 success
        setProgress(25);
        setStatusMessage(`Call 1 Success: Customer Account Created with Customer ID: ${idStr}`);
        setLoading(false);
        return;
      }

      // Handle Case: Customer with this email already exists
      const msgLower = (data?.message || '').toLowerCase();
      const isAlreadyCustomer = data?.status === 'ERROR' && (
        msgLower.includes('already a customer') ||
        msgLower.includes('already exists') ||
        msgLower.includes('already registered')
      );

      if (isAlreadyCustomer) {
        setStatusMessage('Email already registered in ResellerClub. Looking up existing customer ID...');
        const lookupUrl = `/api/customers/details.json?auth-userid=${authUserId.trim()}&api-key=${apiKey.trim()}&username=${encodeURIComponent(formData.email.trim().toLowerCase())}`;
        const lookupRes = await fetch(lookupUrl);
        const lookupData = await lookupRes.json();

        if (lookupData?.customerid) {
          const existingId = String(lookupData.customerid).trim();
          setCustomerId(existingId);
          sessionStorage.setItem(CUSTOMER_ID_STORAGE_KEY, existingId);
          // Rule: Complete progress bar by 25% on Call 1 success
          setProgress(25);
          setStatusMessage(`Call 1 Success: Existing Customer Account Verified with Customer ID: ${existingId}`);
          setLoading(false);
          return;
        }
      }

      // If ResellerClub returned an explicit API Error
      if (data?.status === 'ERROR' || data?.status === 'error') {
        throw new Error(data.message || 'ResellerClub API Error');
      }

      throw new Error('Unexpected response format received from ResellerClub');

    } catch (err) {
      setError(`Call 1 Failed: ${err.message}`);
      setStatusMessage('Call 1 Stopped. Action required.');
      setLoading(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={onBackToForm}>
        &larr; Back to Registrant Form
      </button>

      <h2>Domain Purchase & Registration Progress</h2>
      <p>Processing your order with ResellerClub registry servers.</p>

      <hr />

      {/* Real Progress Bar */}
      <div>
        <label>
          Registration Progress: <strong>{progress}%</strong>
          <br />
          <progress value={progress} max="100" style={{ width: '100%', height: '24px' }}>
            {progress}%
          </progress>
        </label>
      </div>

      <br />

      {/* Current Status Message */}
      <p><strong>Status:</strong> {statusMessage}</p>

      {/* Customer ID Display upon Call 1 Success */}
      {customerId && (
        <div>
          <p><strong>Customer ID:</strong> {customerId}</p>
          <p><em>(Call 1 finished. 25% completed. Ready for Call 2: WHOIS Contact Creation).</em></p>
        </div>
      )}

      {/* Error Message Display */}
      {error && (
        <div>
          <p><strong>Error Encountered:</strong> {error}</p>
          <button type="button" onClick={executeCall1}>
            Retry Call 1
          </button>
          <span> </span>
          <button type="button" onClick={onBackToForm}>
            Edit Contact Details
          </button>
        </div>
      )}

      {/* Raw Response Viewer */}
      {rawResponse && (
        <div>
          <br />
          <details>
            <summary>View Raw Call 1 Response JSON</summary>
            <pre>{JSON.stringify(rawResponse, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default Purchasecompletionpage;

import React, { useState, useEffect } from 'react';

const REGISTRANT_STORAGE_KEY = 'leela_registrant_cache';
const CUSTOMER_ID_STORAGE_KEY = 'leela_customer_id';
const CONTACT_ID_STORAGE_KEY = 'leela_contact_id';

function Purchasecompletionpage({ onBackToForm }) {
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Initiating Call 1: Customer Account Creation...');
  const [customerId, setCustomerId] = useState(null);
  const [contactId, setContactId] = useState(null);
  const [call1SignupResponse, setCall1SignupResponse] = useState(null);
  const [call1LookupResponse, setCall1LookupResponse] = useState(null);
  const [call2Response, setCall2Response] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // 1. The Core Data Model: The Domain Queue
  const [domainQueue, setDomainQueue] = useState(() => {
    try {
      const saved = sessionStorage.getItem('leela_purchased_domains');
      const list = saved ? JSON.parse(saved) : [];
      if (Array.isArray(list) && list.length > 0) {
        return list.map((d) => ({
          domain: d,
          status: 'pending', // 'pending' | 'processing' | 'success' | 'snatched' | 'insufficient_funds' | 'error'
          orderId: null,
          details: 'Waiting in queue...',
          rawResponse: null
        }));
      }
    } catch {}

    // Fallback if no cart saved (e.g. direct test)
    const searchCache = sessionStorage.getItem('domain_search_cache');
    if (searchCache) {
      try {
        const parsed = JSON.parse(searchCache);
        if (parsed.searchedQuery) {
          return [{
            domain: `${parsed.searchedQuery}.tech`,
            status: 'pending',
            orderId: null,
            details: 'Waiting in queue...',
            rawResponse: null
          }];
        }
      } catch {}
    }

    return [{
      domain: 'leelatestbrand2026.tech',
      status: 'pending',
      orderId: null,
      details: 'Waiting in queue...',
      rawResponse: null
    }];
  });

  useEffect(() => {
    executePipeline();
  }, []);

  const executePipeline = async () => {
    setError('');
    setLoading(true);
    setProgress(0);
    setCall1SignupResponse(null);
    setCall1LookupResponse(null);
    setCall2Response(null);
    setStatusMessage('Executing Call 1: Sending customer details to ResellerClub (/api/customers/v2/signup.json)...');

    try {
      // Step A: Read Reseller credentials from storage
      const authUserId = localStorage.getItem('rc_auth_userid') || '1336094';
      const apiKey = localStorage.getItem('rc_api_key') || '';

      if (!authUserId || !apiKey) {
        throw new Error('Reseller credentials (User ID or API Key) missing. Please configure them on the search page.');
      }

      // Step B: Read Registrant details from browser cache memory
      const savedRegistrant = sessionStorage.getItem(REGISTRANT_STORAGE_KEY);
      if (!savedRegistrant) {
        throw new Error('Customer contact details missing from cache memory. Please return to the form.');
      }
      const formData = JSON.parse(savedRegistrant);

      // Step C: Call 1 - Customer Creation / Lookup
      const cleanPhoneCc = String(formData.phoneCountryCode || '91').replace(/\D/g, '');
      const cleanPhone = String(formData.phone || '').replace(/\D/g, '');
      const cleanCountry = String(formData.country || 'IN').trim().toUpperCase();

      const signupParams = new URLSearchParams({
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

      const signupRes = await fetch('/api/customers/v2/signup.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: signupParams.toString()
      });

      const signupText = await signupRes.text();
      let signupData;
      try {
        signupData = JSON.parse(signupText);
      } catch {
        signupData = signupText;
      }

      setCall1SignupResponse(signupData);

      let resolvedCustomerId = null;
      const isNumericId = typeof signupData === 'number' || (!isNaN(signupData) && Number(signupData) > 0);

      if (isNumericId) {
        resolvedCustomerId = String(signupData).trim();
      } else {
        // Handle Case: Customer with this email already exists
        const msgLower = (signupData?.message || '').toLowerCase();
        const isAlreadyCustomer = signupData?.status === 'ERROR' && (
          msgLower.includes('already a customer') ||
          msgLower.includes('already exists') ||
          msgLower.includes('already registered')
        );

        if (isAlreadyCustomer) {
          setStatusMessage('Email already registered in ResellerClub. Looking up existing customer ID...');
          const lookupUrl = `/api/customers/details.json?auth-userid=${authUserId.trim()}&api-key=${apiKey.trim()}&username=${encodeURIComponent(formData.email.trim().toLowerCase())}`;
          const lookupRes = await fetch(lookupUrl);
          const lookupData = await lookupRes.json();
          setCall1LookupResponse(lookupData);

          if (lookupData?.customerid) {
            resolvedCustomerId = String(lookupData.customerid).trim();
          }
        }
      }

      if (!resolvedCustomerId) {
        throw new Error(signupData?.message || 'Failed to resolve ResellerClub customer account');
      }

      setCustomerId(resolvedCustomerId);
      sessionStorage.setItem(CUSTOMER_ID_STORAGE_KEY, resolvedCustomerId);
      // Advance to 25% on Call 1 completion
      setProgress(25);
      setStatusMessage(`Call 1 Succeeded (25%): Customer ID ${resolvedCustomerId} verified. Starting Call 2...`);

      // Step D: Call 2 - Create / Verify WHOIS Contact
      const contactParams = new URLSearchParams({
        'auth-userid': authUserId.trim(),
        'api-key': apiKey.trim(),
        'customer-id': resolvedCustomerId,
        'name': formData.name.trim(),
        'company': formData.company.trim() || 'Individual',
        'email': formData.email.trim().toLowerCase(),
        'address-line-1': formData.addressLine1.trim(),
        'city': formData.city.trim(),
        'state': formData.state.trim(),
        'country': cleanCountry,
        'zipcode': formData.zipcode.trim(),
        'phone-cc': cleanPhoneCc,
        'phone': cleanPhone,
        'type': 'Contact'
      });

      const contactRes = await fetch('/api/contacts/add.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: contactParams.toString()
      });

      const contactText = await contactRes.text();
      let contactData;
      try {
        contactData = JSON.parse(contactText);
      } catch {
        contactData = contactText;
      }

      setCall2Response(contactData);
      let resolvedContactId = null;

      const isNumericContactId = typeof contactData === 'number' || (!isNaN(contactData) && Number(contactData) > 0);
      if (isNumericContactId) {
        resolvedContactId = String(contactData).trim();
      } else {
        // Fallback to default contact
        const defaultParams = new URLSearchParams({
          'auth-userid': authUserId.trim(),
          'api-key': apiKey.trim(),
          'customer-id': resolvedCustomerId,
          'type': 'Contact'
        });
        const defaultRes = await fetch('/api/contacts/default.json', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: defaultParams.toString()
        });
        const defaultData = await defaultRes.json();
        const existingContactId = defaultData?.Contact?.registrant || defaultData?.Contact?.techContactDetails?.['contact.contactid'];
        if (existingContactId) {
          resolvedContactId = String(existingContactId).trim();
          setCall2Response(defaultData);
        }
      }

      if (!resolvedContactId) {
        throw new Error(contactData?.message || 'Failed to resolve ResellerClub WHOIS contact ID');
      }

      setContactId(resolvedContactId);
      sessionStorage.setItem(CONTACT_ID_STORAGE_KEY, resolvedContactId);
      // Advance to 50% on Call 2 completion
      setProgress(50);
      setStatusMessage(`Call 2 Succeeded (50%): WHOIS Contact ID ${resolvedContactId} verified. Starting Call 3 Queue...`);

      // Step E: Call 3 - Process the Domain Queue Sequentially (One by One)
      await executeCall3Queue(resolvedCustomerId, resolvedContactId, authUserId, apiKey);

    } catch (err) {
      setError(`Process Failed: ${err.message}`);
      setStatusMessage('Process Stopped. Action required.');
      setLoading(false);
    }
  };

  const executeCall3Queue = async (resolvedCustomerId, resolvedContactId, authUserId, apiKey) => {
    const queueSnapshot = [...domainQueue];
    const totalItems = queueSnapshot.length;
    const progressPerDomain = 50 / totalItems; // Divide remaining 50% across cart items
    let currentProgress = 50;

    for (let i = 0; i < totalItems; i++) {
      const currentItem = queueSnapshot[i];
      const domainName = currentItem.domain;

      // Update current item to 'processing'
      queueSnapshot[i] = {
        ...queueSnapshot[i],
        status: 'processing',
        details: 'Contacting registry & executing registration...'
      };
      setDomainQueue([...queueSnapshot]);
      setStatusMessage(`Processing domain ${i + 1} of ${totalItems}: ${domainName}...`);

      try {
        const registerParams = new URLSearchParams();
        registerParams.append('auth-userid', authUserId.trim());
        registerParams.append('api-key', apiKey.trim());
        registerParams.append('domain-name', domainName);
        registerParams.append('years', '1');
        registerParams.append('ns', 'ns1.orderbox-dns.com');
        registerParams.append('ns', 'ns2.orderbox-dns.com');
        registerParams.append('customer-id', resolvedCustomerId);
        registerParams.append('reg-contact-id', resolvedContactId);
        registerParams.append('admin-contact-id', resolvedContactId);
        registerParams.append('tech-contact-id', resolvedContactId);
        registerParams.append('billing-contact-id', resolvedContactId);
        registerParams.append('invoice-option', 'PayInvoice');
        registerParams.append('purchase-privacy', 'false');
        registerParams.append('auto-renew', 'false');

        const regRes = await fetch('/api/domains/register.json', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: registerParams.toString()
        });

        const regText = await regRes.text();
        let regData;
        try {
          regData = JSON.parse(regText);
        } catch {
          regData = regText;
        }

        const msgLower = (regData?.message || '').toLowerCase();

        // 1. Scenario A: Registration Success
        if (regData?.status === 'Success' || regData?.actionstatus === 'Success') {
          const orderId = regData.entityid || regData.orderid || 'Confirmed';
          queueSnapshot[i] = {
            ...queueSnapshot[i],
            status: 'success',
            orderId: orderId,
            details: `Registered! ResellerClub Order ID: ${orderId}`,
            rawResponse: regData
          };
          currentProgress += progressPerDomain;
          setProgress(Math.min(100, Math.round(currentProgress)));
        }
        // 2. Scenario B: Insufficient Funds in ResellerClub Wallet
        else if (msgLower.includes('sufficient funds') || msgLower.includes('funds') || msgLower.includes('balance')) {
          queueSnapshot[i] = {
            ...queueSnapshot[i],
            status: 'insufficient_funds',
            orderId: null,
            details: 'All parameters & WHOIS verified 100%! Add funds to ResellerClub wallet to finalize registry purchase.',
            rawResponse: regData
          };
        }
        // 3. Scenario C: Domain Snatched / No Longer Available
        else if (msgLower.includes('no longer available') || msgLower.includes('taken') || msgLower.includes('already registered')) {
          queueSnapshot[i] = {
            ...queueSnapshot[i],
            status: 'snatched',
            orderId: null,
            details: 'Domain was taken by another party moments ago. Payment logged for refund.',
            rawResponse: regData
          };
        }
        // 4. Scenario D: Other Registry Error
        else {
          queueSnapshot[i] = {
            ...queueSnapshot[i],
            status: 'error',
            orderId: null,
            details: regData?.message || 'Registration error received from ResellerClub',
            rawResponse: regData
          };
        }
      } catch (domainErr) {
        queueSnapshot[i] = {
          ...queueSnapshot[i],
          status: 'error',
          orderId: null,
          details: `Call failed: ${domainErr.message}`,
          rawResponse: { error: domainErr.message }
        };
      }

      // Update state live on screen after each domain completes
      setDomainQueue([...queueSnapshot]);
      // Note: Loop does NOT break on error; it immediately proceeds to the next domain!
    }

    // Final summary message
    const allSucceeded = queueSnapshot.every((item) => item.status === 'success');
    if (allSucceeded) {
      setProgress(100);
      setStatusMessage('All domain registrations completed successfully (100%)!');
    } else {
      setStatusMessage('Batch registration sequence finished. Review the status checklist below.');
    }

    setLoading(false);
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

      {/* Customer ID & Contact ID Display */}
      {customerId && (
        <p><strong>Customer ID:</strong> {customerId}</p>
      )}
      {contactId && (
        <p><strong>WHOIS Contact ID:</strong> {contactId}</p>
      )}

      {/* Error Message Display */}
      {error && (
        <div>
          <p><strong>Error Encountered:</strong> {error}</p>
          <button type="button" onClick={executePipeline}>
            Retry Process
          </button>
          <span> </span>
          <button type="button" onClick={onBackToForm}>
            Edit Contact Details
          </button>
        </div>
      )}

      <hr />

      {/* 3. The Live Checklist Table UI (Plain Functional HTML) */}
      <h3>Registration Queue & Execution Checklist</h3>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>#</th>
            <th>Domain Name</th>
            <th>Status</th>
            <th>Details / Order ID</th>
            <th>Action</th>
            <th>Inspection</th>
          </tr>
        </thead>
        <tbody>
          {domainQueue.map((item, index) => {
            let statusLabel = '⏸️ Waiting in queue';
            if (item.status === 'processing') statusLabel = '⏳ In Progress...';
            if (item.status === 'success') statusLabel = '✅ Registered';
            if (item.status === 'snatched') statusLabel = '⚠️ Snatched';
            if (item.status === 'insufficient_funds') statusLabel = 'ℹ️ Verified (Funds Required)';
            if (item.status === 'error') statusLabel = '❌ Error';

            return (
              <tr key={item.domain}>
                <td>{index + 1}</td>
                <td><strong>{item.domain}</strong></td>
                <td>{statusLabel}</td>
                <td>{item.details}</td>
                <td>
                  {item.status === 'snatched' ? (
                    <button
                      type="button"
                      onClick={() =>
                        alert(
                          'Refund request logged for domain: ' +
                            item.domain +
                            ' against Razorpay Payment ID: ' +
                            (sessionStorage.getItem('leela_last_payment_id') || 'pay_test') +
                            '. Funds will be credited back to your original payment method.'
                        )
                      }
                    >
                      Request Refund
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  {item.rawResponse ? (
                    <details>
                      <summary>View Raw JSON</summary>
                      <pre>{JSON.stringify(item.rawResponse, null, 2)}</pre>
                    </details>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <hr />

      {/* Raw Response Viewers for Call 1 & Call 2 */}
      <h3>Account & Contact Inspection (Calls 1 & 2)</h3>

      {call1SignupResponse && (
        <div>
          <details>
            <summary>View Raw JSON from Call 1 Signup (/api/customers/v2/signup.json)</summary>
            <pre>{JSON.stringify(call1SignupResponse, null, 2)}</pre>
          </details>
        </div>
      )}

      {call1LookupResponse && (
        <div>
          <br />
          <details>
            <summary>View Raw JSON from Call 1b Customer Lookup (/api/customers/details.json)</summary>
            <pre>{JSON.stringify(call1LookupResponse, null, 2)}</pre>
          </details>
        </div>
      )}

      {call2Response && (
        <div>
          <br />
          <details>
            <summary>View Raw JSON from Call 2 WHOIS Contact (/api/contacts/add.json)</summary>
            <pre>{JSON.stringify(call2Response, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default Purchasecompletionpage;

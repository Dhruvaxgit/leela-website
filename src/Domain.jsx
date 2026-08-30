import React, { useState, useEffect } from 'react';

// Key used to store and retrieve data from browser cache memory (sessionStorage)
const CACHE_STORAGE_KEY = 'domain_search_cache';

function Domain() {
  const [query, setQuery] = useState('');
  const [authUserId, setAuthUserId] = useState(() => localStorage.getItem('rc_auth_userid') || '');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('rc_api_key') || '');
  const [cachedResults, setCachedResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedNotice, setSavedNotice] = useState('');

  const [prices, setPrices] = useState(() => {
    try {
      const saved = sessionStorage.getItem('rc_pricing_catalog');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 1. Check for existing cached search results on initial load
  useEffect(() => {
    loadFromBrowserCache();
    // Pre-fetch pricing if credentials exist
    const currentUserId = authUserId.trim() || localStorage.getItem('rc_auth_userid');
    const currentApiKey = apiKey.trim() || localStorage.getItem('rc_api_key');
    if (currentUserId && currentApiKey && !prices) {
      fetchPricing(currentUserId, currentApiKey);
    }
  }, []);

  const fetchPricing = async (userId, key) => {
    try {
      const url = `/api/products/customer-price.json?auth-userid=${userId}&api-key=${key}`;
      const res = await fetch(url);
      if (res.ok) {
        const pricingData = await res.json();
        setPrices(pricingData);
        sessionStorage.setItem('rc_pricing_catalog', JSON.stringify(pricingData));
      }
    } catch (e) {
      console.error('Failed to fetch pricing:', e);
    }
  };

  const saveCredentials = (e) => {
    e.preventDefault();
    localStorage.setItem('rc_auth_userid', authUserId.trim());
    localStorage.setItem('rc_api_key', apiKey.trim());
    setSavedNotice('Credentials saved successfully in browser storage.');
    fetchPricing(authUserId.trim(), apiKey.trim());
    setTimeout(() => setSavedNotice(''), 3000);
  };

  // Helper to extract 1-year price for a domain from the pricing catalog
  const getDomainPrice = (domainName) => {
    if (!prices) return null;
    let priceVal = null;
    if (domainName.endsWith('.com')) {
      priceVal = prices.domcno?.addnewdomain?.['1'];
    } else if (domainName.endsWith('.in')) {
      priceVal = prices.dotin?.addnewdomain?.['1'];
    } else if (domainName.endsWith('.io')) {
      priceVal = prices.dotio?.addnewdomain?.['1'];
    }
    if (priceVal !== undefined && priceVal !== null) {
      return `₹${Number(priceVal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / yr`;
    }
    return null;
  };

  // 2. Fetch data from browser cache memory
  const loadFromBrowserCache = () => {
    try {
      const savedData = sessionStorage.getItem(CACHE_STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setCachedResults(parsed);
      }
    } catch (e) {
      console.error('Error reading from browser cache:', e);
    }
  };

  // 3. Save received JSON data into browser cache memory
  const saveToBrowserCache = (domainSearchData) => {
    try {
      sessionStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(domainSearchData));
      loadFromBrowserCache();
    } catch (e) {
      console.error('Error writing to browser cache:', e);
    }
  };

  // 4. Handle Real API Call
  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');

    const rawInput = query.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
    const parts = rawInput.split('.');
    const cleanName = parts[0];

    if (!cleanName) {
      setError('Please enter a domain name.');
      return;
    }

    // Detect if user explicitly typed an extension (e.g. .in, .com, or .io)
    const preferredTld = parts.length > 1 && ['in', 'com', 'io'].includes(parts[1]) ? parts[1] : null;

    const currentUserId = authUserId.trim() || localStorage.getItem('rc_auth_userid');
    const currentApiKey = apiKey.trim() || localStorage.getItem('rc_api_key');

    // If credentials are not entered, fail immediately with error
    if (!currentUserId || !currentApiKey) {
      setError('Failed to fetch data from Reseller API: Missing Reseller Auth User ID or API Key. Please configure your credentials above.');
      return;
    }

    setLoading(true);

    try {
      // Ensure pricing catalog is loaded in parallel
      if (!prices) {
        fetchPricing(currentUserId, currentApiKey);
      }

      // Connect directly to ResellerClub API endpoint via local proxy (querying .com, .in, and .io)
      const queryParams = new URLSearchParams({
        'auth-userid': currentUserId,
        'api-key': currentApiKey,
        'domain-name': cleanName,
        'tlds': 'com'
      });
      const url = `/api/domains/available.json?${queryParams.toString()}&tlds=in&tlds=io`;

      const response = await fetch(url);
      const text = await response.text();

      let responseJsonData;
      try {
        responseJsonData = JSON.parse(text);
      } catch (jsonErr) {
        // If ResellerClub returned HTML error or Cloudflare block
        throw new Error('Received non-JSON response from server (possible Cloudflare block or IP not whitelisted)');
      }

      // Check if ResellerClub returned an API-level error object (e.g. { status: 'ERROR', message: '...' })
      if (responseJsonData.status === 'ERROR' || responseJsonData.status === 'error') {
        throw new Error(responseJsonData.message || 'ResellerClub API error response');
      }

      // Check if expected domain keys exist in the JSON response
      const comKey = `${cleanName}.com`;
      const inKey = `${cleanName}.in`;
      const ioKey = `${cleanName}.io`;
      if (!responseJsonData[comKey] && !responseJsonData[inKey] && !responseJsonData[ioKey]) {
        throw new Error('Unexpected response format from Reseller API');
      }

      // Save real API JSON response directly into browser cache memory along with preferred extension
      const cachePayload = {
        searchedQuery: cleanName,
        preferredTld: preferredTld,
        timestamp: new Date().toLocaleTimeString(),
        data: responseJsonData
      };
      saveToBrowserCache(cachePayload);

    } catch (err) {
      // If-Else failure: Display exact failure message
      setError(`Failed to fetch data from Reseller API: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearBrowserCache = () => {
    sessionStorage.removeItem(CACHE_STORAGE_KEY);
    setCachedResults(null);
  };

  // Helper to order results: if user specified .in or .com, put that domain at the top; otherwise keep default registry order
  const getOrderedResults = () => {
    if (!cachedResults || !cachedResults.data) return [];
    const entries = Object.entries(cachedResults.data);
    const preferred = cachedResults.preferredTld;

    if (!preferred) {
      // Default rule: preserve natural order received from registry
      return entries;
    }

    // User explicitly typed an extension: place matching domain first
    return [...entries].sort(([domainA], [domainB]) => {
      const aMatches = domainA.endsWith(`.${preferred}`);
      const bMatches = domainB.endsWith(`.${preferred}`);
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return 0;
    });
  };

  return (
    <div>
      <h2>ResellerClub Credentials Configuration</h2>
      <form onSubmit={saveCredentials}>
        <div>
          <label>
            Reseller Auth User ID:{' '}
            <input
              type="text"
              value={authUserId}
              onChange={(e) => setAuthUserId(e.target.value)}
              placeholder="e.g. 123456"
            />
          </label>
        </div>
        <div>
          <label>
            Reseller API Key:{' '}
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API Key"
            />
          </label>
        </div>
        <button type="submit">Save Credentials</button>
        {savedNotice && <p>{savedNotice}</p>}
      </form>

      <hr />

      <h2>Domain Availability Search (.com, .in & .io)</h2>

      {/* Search Bar Form */}
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter domain name (e.g. google, brandname, or brand.io)"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Checking with Reseller API...' : 'Search'}
        </button>
      </form>

      {/* Error Message when API fetch fails */}
      {error && (
        <div>
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}

      {/* Display data fetched from browser cache memory */}
      {cachedResults && (
        <div>
          <h3>Results for "{cachedResults.searchedQuery}" (Cached at {cachedResults.timestamp})</h3>

          <table border="1" cellPadding="6">
            <thead>
              <tr>
                <th>Domain Name</th>
                <th>Status</th>
                <th>Price / Year</th>
              </tr>
            </thead>
            <tbody>
              {getOrderedResults().map(([domain, details]) => {
                const isAvailable = details?.status === 'available';
                const priceFormatted = getDomainPrice(domain);
                return (
                  <tr key={domain}>
                    <td>{domain}</td>
                    <td>
                      {isAvailable ? 'Available' : 'Not Available'}
                    </td>
                    <td>
                      {isAvailable ? (priceFormatted || 'Loading price...') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <br />
          <details>
            <summary>View Raw JSON from ResellerClub API</summary>
            <pre>{JSON.stringify(cachedResults.data, null, 2)}</pre>
          </details>

          <br />
          <button type="button" onClick={clearBrowserCache}>
            Clear Cache Memory
          </button>
        </div>
      )}
    </div>
  );
}

export default Domain;

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

  // 1. Check for existing cached search results on initial load
  useEffect(() => {
    loadFromBrowserCache();
  }, []);

  const saveCredentials = (e) => {
    e.preventDefault();
    localStorage.setItem('rc_auth_userid', authUserId.trim());
    localStorage.setItem('rc_api_key', apiKey.trim());
    setSavedNotice('Credentials saved successfully in browser storage.');
    setTimeout(() => setSavedNotice(''), 3000);
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

    const cleanName = query.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('.')[0];
    if (!cleanName) {
      setError('Please enter a domain name.');
      return;
    }

    const currentUserId = authUserId.trim() || localStorage.getItem('rc_auth_userid');
    const currentApiKey = apiKey.trim() || localStorage.getItem('rc_api_key');

    // If credentials are not entered, fail immediately with error
    if (!currentUserId || !currentApiKey) {
      setError('Failed to fetch data from Reseller API: Missing Reseller Auth User ID or API Key. Please configure your credentials above.');
      return;
    }

    setLoading(true);

    try {
      // Connect directly to ResellerClub API endpoint via local proxy
      const queryParams = new URLSearchParams({
        'auth-userid': currentUserId,
        'api-key': currentApiKey,
        'domain-name': cleanName,
        'tlds': 'com'
      });
      const url = `/api/domains/available.json?${queryParams.toString()}`;

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

      // Check if the expected domain key exists in the JSON response
      const domainKey = `${cleanName}.com`;
      if (!responseJsonData[domainKey]) {
        throw new Error('Unexpected response format from Reseller API');
      }

      // Save real API JSON response directly into browser cache memory
      const cachePayload = {
        searchedQuery: cleanName,
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

      <h2>Domain Availability Search (.com)</h2>

      {/* Search Bar Form */}
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter domain name (e.g. google, brandname)"
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
          <h3>Results for "{cachedResults.searchedQuery}.com" (Cached at {cachedResults.timestamp})</h3>

          <table border="1" cellPadding="6">
            <thead>
              <tr>
                <th>Domain Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(cachedResults.data).map(([domain, details]) => {
                const isAvailable = details?.status === 'available';
                return (
                  <tr key={domain}>
                    <td>{domain}</td>
                    <td>
                      {isAvailable ? 'Available' : 'Not Available'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

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

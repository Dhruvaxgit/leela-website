import React, { useState, useEffect } from 'react';

// Key used to store and retrieve data from browser cache memory (sessionStorage)
const CACHE_STORAGE_KEY = 'domain_search_cache';

function Domain() {
  const [query, setQuery] = useState('');
  const [cachedResults, setCachedResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // On initial component load, check if there is existing data in browser cache memory
  useEffect(() => {
    loadFromBrowserCache();
  }, []);

  // Function to fetch data from browser cache memory
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

  // Function to save JSON response into browser cache memory
  const saveToBrowserCache = (domainSearchData) => {
    try {
      sessionStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(domainSearchData));
      // After saving, load it back from cache to display
      loadFromBrowserCache();
    } catch (e) {
      console.error('Error writing to browser cache:', e);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');

    // Clean input: remove spaces, http://, www., and any entered extensions
    const cleanName = query.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('.')[0];

    if (!cleanName) {
      setError('Please enter a domain name.');
      return;
    }

    setLoading(true);

    try {
      const authUserId = localStorage.getItem('rc_auth_userid');
      const apiKey = localStorage.getItem('rc_api_key');

      let responseJsonData;

      if (authUserId && apiKey) {
        // Step 1: Connect to ResellerClub API via the proxy (only .com)
        const queryParams = new URLSearchParams({
          'auth-userid': authUserId,
          'api-key': apiKey,
          'domain-name': cleanName,
          'tlds': 'com'
        });
        const url = `/api/domains/available.json?${queryParams.toString()}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
        }
        responseJsonData = await response.json();
      } else {
        // Simulated API response for testing (only .com)
        await new Promise((resolve) => setTimeout(resolve, 400));
        responseJsonData = {
          [`${cleanName}.com`]: {
            status: cleanName.length % 2 === 0 ? 'available' : 'regthroughothers',
            classkey: 'domcno'
          }
        };
      }

      // Step 2: Save received JSON response directly into browser cache memory (sessionStorage)
      const cachePayload = {
        searchedQuery: cleanName,
        timestamp: new Date().toLocaleTimeString(),
        data: responseJsonData
      };
      saveToBrowserCache(cachePayload);

    } catch (err) {
      setError(`Search failed: ${err.message}`);
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
      <h2>Domain Availability Search</h2>

      {/* Search Bar Form */}
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter domain name (e.g. google, mycompany)"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Checking...' : 'Search'}
        </button>
      </form>

      {error && (
        <p><strong>Error:</strong> {error}</p>
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

import React, { useState } from 'react';

function App() {
  const [domainName, setDomainName] = useState('');
  const [authUserId, setAuthUserId] = useState(() => localStorage.getItem('rc_auth_userid') || '');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('rc_api_key') || '');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const saveCredentials = () => {
    localStorage.setItem('rc_auth_userid', authUserId);
    localStorage.setItem('rc_api_key', apiKey);
    alert('Credentials saved to browser storage!');
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setResults(null);

    const cleanName = domainName.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('.')[0];
    if (!cleanName) {
      setError('Please enter a domain name to search.');
      return;
    }

    setLoading(true);

    try {
      // If user hasn't set credentials yet, provide simulated response for testing
      if (!authUserId || !apiKey) {
        // Mock data to demonstrate functionality before ResellerClub credentials are configured
        await new Promise((resolve) => setTimeout(resolve, 600));
        const mockResponse = {
          [`${cleanName}.com`]: { status: cleanName.length % 2 === 0 ? 'available' : 'regthroughothers', classkey: 'domcno' },
          [`${cleanName}.in`]: { status: 'available', classkey: 'dotin' }
        };
        setResults({ data: mockResponse, isMock: true });
        setLoading(false);
        return;
      }

      // Live call via Vite proxy to ResellerClub test/sandbox API
      const queryParams = new URLSearchParams({
        'auth-userid': authUserId,
        'api-key': apiKey,
        'domain-name': cleanName,
        'tlds': 'com'
      });
      // Append additional TLDs
      const url = `/api/domains/available.json?${queryParams.toString()}&tlds=in`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setResults({ data, isMock: false });
    } catch (err) {
      setError(`Failed to check domain availability: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Leela - Domain Availability Checker</h1>
      <p>Search domain availability for .com and .in extensions.</p>

      <hr />

      <section>
        <h3>API Configuration (Optional for Live ResellerClub Test)</h3>
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
        <button type="button" onClick={saveCredentials}>
          Save Credentials
        </button>
        {(!authUserId || !apiKey) && (
          <p>
            <em>Note: If credentials are empty, search runs in simulated mode for testing.</em>
          </p>
        )}
      </section>

      <hr />

      <section>
        <h2>Search Domain</h2>
        <form onSubmit={handleSearch}>
          <input
            type="text"
            value={domainName}
            onChange={(e) => setDomainName(e.target.value)}
            placeholder="Type domain name (e.g. mycompany)"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Searching...' : 'Check Availability'}
          </button>
        </form>

        {error && (
          <div>
            <p><strong>Error:</strong> {error}</p>
          </div>
        )}

        {results && (
          <div>
            <h3>Search Results {results.isMock && '(Simulated)'}</h3>
            <table border="1" cellPadding="5">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Status</th>
                  <th>Availability</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(results.data).map(([domain, details]) => {
                  const isAvailable = details?.status === 'available';
                  return (
                    <tr key={domain}>
                      <td>{domain}</td>
                      <td>{details?.status || 'unknown'}</td>
                      <td>{isAvailable ? 'AVAILABLE' : 'TAKEN'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <details>
              <summary>View Raw JSON Data</summary>
              <pre>{JSON.stringify(results.data, null, 2)}</pre>
            </details>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;

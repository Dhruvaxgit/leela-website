import React, { useState, useEffect } from 'react';

const REGISTRANT_STORAGE_KEY = 'leela_registrant_cache';

function RegistrantForm({ onBackToCart, onProceedToCompletion }) {
  const [formData, setFormData] = useState(() => {
    try {
      const saved = sessionStorage.getItem(REGISTRANT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {
        name: '',
        company: '',
        email: '',
        phoneCountryCode: '91',
        phone: '',
        addressLine1: '',
        city: '',
        state: '',
        country: 'IN',
        zipcode: '',
        password: ''
      };
    } catch {
      return {
        name: '',
        company: '',
        email: '',
        phoneCountryCode: '91',
        phone: '',
        addressLine1: '',
        city: '',
        state: '',
        country: 'IN',
        zipcode: '',
        password: ''
      };
    }
  });

  const [savedNotice, setSavedNotice] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveAndContinue = (e) => {
    e.preventDefault();

    // Basic validation for essential WHOIS fields + Password
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.addressLine1.trim() || !formData.city.trim() || !formData.zipcode.trim() || !formData.password.trim()) {
      alert('Please fill in all essential contact details (Name, Email, Password, Phone, Address, City, Zipcode).');
      return;
    }

    if (formData.password.length < 8) {
      alert('Password must be at least 8 characters long as required by ResellerClub.');
      return;
    }

    // Save into browser cache memory
    sessionStorage.setItem(REGISTRANT_STORAGE_KEY, JSON.stringify(formData));
    setSavedNotice('Contact information & account password saved successfully in cache memory!');
    if (onProceedToCompletion) {
      onProceedToCompletion();
    }
  };

  return (
    <div>
      <button type="button" onClick={onBackToCart}>
        &larr; Back to Order Summary
      </button>

      <h2>Domain Ownership & Registrant Details (WHOIS)</h2>
      <p>
        ICANN requires official contact details to assign legal ownership of your purchased domains.
      </p>

      <hr />

      <form onSubmit={handleSaveAndContinue}>
        {/* Contact Name */}
        <div>
          <label>
            Full Legal Name:*<br />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. John Doe"
              required
            />
          </label>
        </div>

        <br />

        {/* Company Name */}
        <div>
          <label>
            Company / Organization Name (Optional):<br />
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="e.g. Acme Corp or Individual"
            />
          </label>
        </div>

        <br />

        {/* Email Address */}
        <div>
          <label>
            Email Address (for domain ownership & transfer notices):*<br />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. owner@example.com"
              required
            />
          </label>
        </div>

        <br />

        {/* Account Password */}
        <div>
          <label>
            Account Password:*<br />
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password (min 8 characters)"
              required
            />
          </label>
          <br />
          <small>(Required for domain management sub-account. Min 8 characters with letters, numbers & symbols).</small>
        </div>

        <br />

        {/* Phone Number */}
        <div>
          <label>
            Phone Number:*<br />
            +<input
              type="text"
              name="phoneCountryCode"
              value={formData.phoneCountryCode}
              onChange={handleChange}
              style={{ width: '40px' }}
              required
            />{' '}
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. 9876543210"
              required
            />
          </label>
        </div>

        <br />

        {/* Address */}
        <div>
          <label>
            Street Address:*<br />
            <input
              type="text"
              name="addressLine1"
              value={formData.addressLine1}
              onChange={handleChange}
              placeholder="e.g. Flat 101, MG Road"
              required
            />
          </label>
        </div>

        <br />

        {/* City & State */}
        <div>
          <label>
            City:*<br />
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g. Mumbai"
              required
            />
          </label>
          <br /><br />
          <label>
            State / Region:*<br />
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="e.g. Maharashtra"
              required
            />
          </label>
        </div>

        <br />

        {/* Country & Zipcode */}
        <div>
          <label>
            Country Code (ISO 2-letter):*<br />
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="IN"
              maxLength={2}
              required
            />
          </label>
          <br /><br />
          <label>
            Zip / Postal Code:*<br />
            <input
              type="text"
              name="zipcode"
              value={formData.zipcode}
              onChange={handleChange}
              placeholder="e.g. 400001"
              required
            />
          </label>
        </div>

        <br />
        <hr />

        {/* Save and Continue Button (Dummy for now) */}
        <button type="submit">
          Save and Continue &rarr;
        </button>
      </form>

      {savedNotice && (
        <div>
          <br />
          <p><strong>Status:</strong> {savedNotice}</p>
        </div>
      )}
    </div>
  );
}

export default RegistrantForm;

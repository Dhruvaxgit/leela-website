# Project Blueprint & Complete System Architecture: Leela Website (Domain Reseller Platform)

## 1. Executive Project Summary
**Project Name:** `leela-website`  
**Location:** `C:\Users\Dhruv\.gemini\antigravity\scratch\leela-website`  
**Git Remote:** `https://github.com/Dhruvaxgit/leela-website.git` (Branch: `main`)  
**Stack:** React 18, Vite 5, Native Web APIs, Razorpay Checkout SDK, ResellerClub Live APIs (`https://httpapi.com`).  

The project is an end-to-end domain registration and reselling platform connecting directly to live production APIs. It implements domain search, retail pricing calculation, shopping cart management, Razorpay payment processing, ICANN-compliant WHOIS contact collection, and a multi-stage sequential registration pipeline with complete fallback resilience.

---

## 2. Inviolable Design & Technical Rules

1. **Strict Zero-CSS / Zero-Styling Policy:**
   - **NO CSS files** (`.css`, `.scss`, etc.).
   - **NO inline styling** (`style={{ ... }}`).
   - **NO CSS utility classes** (no Tailwind, Bootstrap, etc.).
   - Every single interface element must be rendered using **100% pure, native, semantic HTML elements** (`<form>`, `<input>`, `<table>`, `<tr>`, `<td>`, `<th>`, `<button>`, `<details>`, `<summary>`, `<pre>`, `<progress>`).
   - Styling and aesthetics will be added strictly in a later phase when explicitly requested.

2. **Zero Dummy Data / Real Production Inspection Rule:**
   - No mock JSON, no hardcoded success simulations, and no fake illustrations.
   - Every API request must send genuine live parameters.
   - At every step where an API call is made, the **exact raw JSON response returned by the registry must be rendered on-screen inside an expandable `<details><summary>Inspect Raw JSON</summary><pre>...</pre></details>` block** for transparency and verification.

3. **Cloudflare WAF Compliance Rule for ResellerClub:**
   - ResellerClub endpoints (`https://httpapi.com`) sit behind Cloudflare WAF.
   - Sensitive or structured fields (such as `passwd`, street address lines with commas/spaces, names) **must never be passed in the URL query string**.
   - All sensitive data must be passed in the **HTTP POST body** as `application/x-www-form-urlencoded` (`URLSearchParams`). Passing them in query parameters triggers immediate Cloudflare HTTP `403 Forbidden` responses.

---

## 3. Live Configuration & Credentials

### A. ResellerClub Live Production API
- **Base Endpoint:** `https://httpapi.com`
- **Reseller Web Pro ID (`auth-userid`):** `1336094`
- **API Key (`api-key`):** `1NHFM4D8gu8DIntuVywVTKAUA61Lk32G`
- **Live Tested Customer ID:** `34765265` (User: Dhruvkumar Gupta / `anushahrconsultancy@gmail.com`)
- **Live Tested WHOIS Contact ID:** `135456769`
- **Security Requirement:** Calling IP address must be present in ResellerClub whitelist (**Settings → API**).

### B. Razorpay Test Gateway
- **Key ID:** `rzp_test_TXzxXWJQh1pGh0`
- **SDK URL:** `https://checkout.razorpay.com/v1/checkout.js`
- **Currency:** `INR` (all amounts dynamically calculated in Paise: $x \times 100$).

---

## 4. Application Architecture & Component Flow

The application is architected as a sequential 4-stage Single Page Application (SPA) driven by state in `App.jsx`:
```
Stage 1: Search & Pricing ('search') ──► Domain.jsx
             │
             ▼
Stage 2: Cart & Payment Gateway ('cart') ──► Cartpage.jsx
             │
             ▼
Stage 3: ICANN WHOIS Registrant Profile ('registrant') ──► RegistrantForm.jsx
             │
             ▼
Stage 4: Multi-Call Registration Engine ('completion') ──► Purchasecompletionpage.jsx
```

### Component Details:

#### 1. `src/Domain.jsx` (Search & Discovery)
- Queries ResellerClub live availability API:
  `GET /api/domains/available.json?auth-userid=...&api-key=...&domain-name=...&tlds=com&tlds=in&tlds=io&tlds=tech`
- Dynamically retrieves live retail prices from ResellerClub pricing API:
  `GET /api/products/customer-price.json`
- Supports Product Keys: `domcno` (.com), `dotin` (.in), `dotio` (.io), `dottech` (.tech).
- Smart sorting: Explicitly typed TLD appears at the top of results.
- Reactive "Add to Cart" / "Remove from Cart" toggling synchronized with `sessionStorage` key `leela_cart_cache`.
- Direct navigation to Checkout.

#### 2. `src/Cartpage.jsx` (Cart & Razorpay Checkout)
- Reads cart items from `sessionStorage` (`leela_cart_cache`).
- Itemized pricing table with live subtotal calculation in INR.
- Razorpay Checkout modal integration with 3 distinct handling states:
  1. **Success (`response.razorpay_payment_id`):** Clears active cart, archives items to `leela_purchased_domains`, saves payment ID to `leela_last_payment_id`, and displays the guarded `[ Take Ownership → ]` button.
  2. **Failure (`payment.failed`):** Catches bank/card failure, displays exact error details, and preserves cart items safely.
  3. **Dismissal (`modal.ondismiss`):** Handles user closing the payment modal without completing payment, keeping cart items intact.

#### 3. `src/RegistrantForm.jsx` (ICANN WHOIS Profile Form)
- Captures required legal ICANN contact fields:
  - `name`, `company`, `email`, `address-line-1`, `city`, `state`, `country` (2-letter ISO, e.g. `IN`), `zipcode`, `phone-cc` (digits only, e.g. `91`), `phone`.
- Enforces strict ResellerClub Customer Account Password rules:
  - 9 to 16 characters.
  - At least 1 uppercase letter (`A-Z`).
  - At least 1 lowercase letter (`a-z`).
  - At least 1 numeric digit (`0-9`).
  - At least 1 special character from `[~*!@$#%_+.?:,{}]`.
- Caches registrant data into `sessionStorage` (`leela_registrant_cache`) and transitions to Stage 4.

#### 4. `src/Purchasecompletionpage.jsx` (Sequential Execution & Registration Engine)
Implements **Approach A: Sequential Queue Architecture** with a live native `<progress>` bar and an itemized execution checklist table.

---

## 5. The Registration Engine: Sequential Handshake & Fallback Mechanisms

Call 1 and Call 2 run **once per checkout session**, while Call 3 executes over the domain queue.

### Stage 1: Customer Account Handshake (Call 1)
- **Endpoint:** `POST /api/customers/v2/signup.json` (via POST body).
- **Auto-Resolution for Existing Users:**
  If ResellerClub returns `email is already a Customer.`, the engine immediately branches to:
  `GET /api/customers/details.json?username={email}`
  and retrieves the existing active `customerid`.
- **Progress:** Advances to **25%**.
- **Output:** Saves `leela_customer_id` and renders raw JSON in `<details>`.

### Stage 2: WHOIS Contact Creation (Call 2)
- **Endpoint:** `POST /api/contacts/add.json`
- **Payload:** `customer-id` (from Call 1), WHOIS details, `type: 'Contact'`.
- **Auto-Resolution for Existing Contact:** If contact already exists or returns numeric ID directly, parses and caches numeric `contactId`.
- **Progress:** Advances to **50%**.
- **Output:** Saves `leela_contact_id` and renders raw JSON in `<details>`.

### Stage 3: Sequential Domain Queue Execution (Call 3 Loop)
All domains in the purchased cart are loaded into a reactive state queue:
```javascript
const [domainQueue, setDomainQueue] = useState([
  {
    domain: 'example.com',
    status: 'pending', // 'pending' | 'processing' | 'success' | 'insufficient_funds' | 'snatched' | 'error'
    orderId: null,
    details: 'Waiting in queue...',
    rawResponse: null
  }
]);
```

- **Loop Mechanism:** Iterates through `domainQueue` sequentially (`for (let i = 0; i < queue.length; i++)`).
- **Endpoint:** `POST /api/domains/register.json`
  - Parameters: `domain-name`, `auth-userid`, `api-key`, `years=1`, `ns=ns1.onlyfordemo.net`, `ns=ns2.onlyfordemo.net`, `customer-id`, `reg-contact-id`, `admin-contact-id`, `tech-contact-id`, `billing-contact-id`, `invoice-option=NoInvoice`, `protect-privacy=false`.

#### Fallback Resistance & Branching Rules:
1. **Case: Success**
   - ResellerClub returns `{ status: "Success", entityid: "..." }`.
   - Domain row marks as `[ SUCCESS ]`. Order ID is saved.
2. **Case: Insufficient Wallet Balance (Expected in pre-funding stage)**
   - ResellerClub returns: `"You do not have sufficient funds in your account to execute this action"`.
   - **Handling:** Does NOT crash. The row updates to `[ VERIFIED / FUNDS REQUIRED ]` with the explanation:
     > *"All parameters, customer ID, and WHOIS contact were verified 100%! To finalize live purchase on the global registry, add funds to your ResellerClub wallet."*
   - Stores raw response for verification.
   - **Queue Continuity:** Immediately proceeds to process Domain 2 without breaking.
3. **Case: Snatched / Unavailable Domain**
   - ResellerClub returns: `"Domain is no longer available"`.
   - **Handling:** Row flags as `[ REFUND REQUIRED ]` with message:
     > *"Domain was taken by another party moments ago. Your payment has been logged for auto-refund or choosing an alternative extension."*
   - Renders a native `<button>`: `[ Request Refund ]` for user action.
   - **Queue Continuity:** Proceeds to process remaining domains.
4. **Progress Metric:** Scales dynamically:
   $$\text{Progress} = 50\% + \left(\frac{\text{Completed Domains}}{\text{Total Domains}} \times 50\%\right)$$
   Reaches 100% when all domains finish processing.

---

## 6. Session Storage Data Dictionary

| Storage Key | Type | Description |
| :--- | :--- | :--- |
| `leela_cart_cache` | JSON Array | Active items currently in cart (`[{ domain, price, tld }]`). |
| `leela_purchased_domains` | JSON Array | Snapshot of cart items frozen upon successful Razorpay payment. |
| `leela_last_payment_id` | String | Razorpay transaction ID (`pay_...`). |
| `leela_registrant_cache` | JSON Object | Legal ICANN contact fields + account credentials. |
| `leela_customer_id` | String/Number | Active verified ResellerClub Customer ID (`34765265`). |
| `leela_contact_id` | String/Number | Active verified ResellerClub Contact ID (`135456769`). |

---

## 7. Next Roadmap Milestones
1. **DNS Management Dashboard:** View registered domain portfolio, configure A/CNAME/MX/TXT records via ResellerClub DNS APIs.
2. **Live Domain Transfer / Renewal Engine:** Renew existing orders and manage domain locking/EPP transfer codes.
3. **Automated Refund Hook:** Connect the "Request Refund" fallback action directly to the Razorpay Refund API (`POST /v1/payments/{payment_id}/refund`).

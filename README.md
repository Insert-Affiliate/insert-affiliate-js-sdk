# Insert Affiliate JavaScript SDK

![Version](https://img.shields.io/badge/version-1.0.0-brightgreen) ![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Capacitor-blue) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

The official JavaScript SDK for [Insert Affiliate](https://insertaffiliate.com) - track affiliate-driven purchases on web and hybrid applications.

**What does this SDK do?** It connects your web or Capacitor app to Insert Affiliate's platform, enabling you to track which affiliates drive subscriptions and automatically pay them commissions when users make purchases.

## Table of Contents

- [Quick Start (5 Minutes)](#-quick-start-5-minutes)
- [Essential Setup](#%EF%B8%8F-essential-setup)
  - [1. Initialize the SDK](#1-initialize-the-sdk)
  - [2. Configure Payment Verification](#2-configure-payment-verification)
  - [3. Set Up Deep Linking](#3-set-up-deep-linking)
- [Verify Your Integration](#-verify-your-integration)
- [Advanced Features](#-advanced-features)
- [API Reference](#-api-reference)
- [Troubleshooting](#-troubleshooting)
- [Support](#-support)

---

## 🚀 Quick Start (5 Minutes)

Get up and running with minimal code to validate the SDK works.

### Prerequisites

- **Modern web browser** or **Capacitor 4+**
- **Company Code** from your [Insert Affiliate dashboard](https://app.insertaffiliate.com/settings)

### Supported Platforms

| Platform | Status |
|----------|--------|
| Capacitor (iOS / Android) | ✅ Fully tested |
| Web Browsers | ✅ Tested in modern browsers |
| Other JS Environments | ⚠️ May work, not officially tested |

### Installation

```bash
npm install insert-affiliate-js-sdk
```

For Capacitor apps, also run:
```bash
npx cap sync
```

### Your First Integration

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

// Initialize with verbose logging for setup
await InsertAffiliate.initialize('YOUR_COMPANY_CODE', true);
```

**Expected Console Output:**

```
[Insert Affiliate] SDK initialized with company code: YOUR_COMPANY_CODE
[Insert Affiliate] [VERBOSE] SDK marked as initialized
```

✅ **If you see these logs, the SDK is working!** Now proceed to Essential Setup.

⚠️ **Disable verbose logging in production** by setting the second parameter to `false`.

---

## ⚙️ Essential Setup

Complete these three steps to start tracking affiliate-driven purchases.

### 1. Initialize the SDK

Add SDK initialization to your main entry point (`main.ts`, `main.js`, or `App.tsx`):

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

await InsertAffiliate.initialize('YOUR_COMPANY_CODE');
```

<details>
<summary><strong>Advanced Initialization Options</strong> (click to expand)</summary>

```javascript
// Full initialization with all options
await InsertAffiliate.initialize(
  'YOUR_COMPANY_CODE',   // Company code (required)
  true,                  // Enable verbose logging (optional, default: false)
  86400000,              // Attribution timeout in milliseconds (optional, e.g., 24 hours)
  true                   // Prevent affiliate transfer (optional, default: false)
);
```

**Parameters:**
- `companyCode` (required): Your Insert Affiliate company code
- `verboseLogging` (optional): Enable detailed console logs for debugging
- `affiliateAttributionActiveTime` (optional): Time in milliseconds before attribution expires (e.g., `86400000` for 24 hours)
- `preventAffiliateTransfer` (optional): When `true`, prevents new affiliates from overwriting existing attribution

**Verbose logging shows:**
- Initialization process and company code validation
- Deep link processing and short code detection
- API communication details
- Storage operations

</details>

---

### 2. Configure Payment Verification

**Choose the payment method(s) that match your platform:**

| Method | Best For | Setup Guide |
|--------|----------|-------------|
| [**RevenueCat**](#option-1-revenuecat) | Mobile IAP (iOS/Android) | [View](#option-1-revenuecat) |
| [**Stripe**](#option-2-stripe) | Web-based payments | [View](#option-2-stripe) |
| [**Both**](#hybrid-apps) | Hybrid apps with mobile + web payments | Set up both |

<details open>
<summary><h4>Option 1: RevenueCat</h4></summary>

For mobile in-app purchases via Capacitor.

**Step 1: Code Setup**

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';
import { Purchases } from '@revenuecat/purchases-capacitor';

window.addEventListener('DOMContentLoaded', async () => {
  await InsertAffiliate.initialize(
    'YOUR_COMPANY_CODE',
    false,    // verbose logging
    86400000, // 24 hour attribution timeout (optional)
    true      // prevent affiliate transfer (optional)
  );
  await Purchases.configure({ apiKey: 'YOUR_REVENUECAT_API_KEY' });

  // Set up callback for when affiliate identifier changes
  InsertAffiliate.setInsertAffiliateIdentifierChangeCallback(async (identifier, offerCode) => {
    if (!identifier) return;

    // Ensure RevenueCat subscriber exists before setting attributes
    await Purchases.getCustomerInfo();

    // Get expiry timestamp for RevenueCat targeting
    const expiryTimestamp = await InsertAffiliate.getAffiliateExpiryTimestamp();

    // Set attributes for RevenueCat
    const attributes = {
      insert_affiliate: identifier,
      insert_timedout: expiryTimestamp?.toString() || '',
    };

    // Add offer code for RevenueCat Targeting (if available)
    if (offerCode) {
      attributes.affiliateOfferCode = offerCode;
    }

    await Purchases.setAttributes(attributes);
    await Purchases.syncAttributesAndOfferingsIfNeeded();
  });
});
```

**Using RevenueCat Targeting (Recommended)**

RevenueCat Targeting automatically shows different offerings based on the `affiliateOfferCode` attribute. Simply display `offerings.current`:

```javascript
const offerings = await Purchases.getOfferings();
const currentOffering = offerings.current;
// RevenueCat targeting automatically shows the correct offering based on affiliateOfferCode
```

**Step 2: Webhook Setup**

1. In RevenueCat, [create a new webhook](https://www.revenuecat.com/docs/integrations/webhooks)
2. Configure webhook settings:
   - **Webhook URL**: `https://api.insertaffiliate.com/v1/api/revenuecat-webhook`
   - **Event Type**: "All events"
3. In your [Insert Affiliate dashboard](https://app.insertaffiliate.com/settings):
   - Set **In-App Purchase Verification** to `RevenueCat`
   - Copy the `RevenueCat Webhook Authentication Header` value
4. Paste the authentication header into RevenueCat's **Authorization header** field

✅ **RevenueCat setup complete!**

</details>

<details>
<summary><h4>Option 2: Stripe</h4></summary>

For web-based subscriptions and payments.

**Step 1: Connect Stripe Account**

1. Go to your [Insert Affiliate dashboard settings](https://app.insertaffiliate.com/settings)
2. Select **Stripe** as your verification method
3. Click **Connect with Stripe** to authorize via Stripe Connect

**Step 2: Pass Affiliate Data to Checkout**

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

const affiliateId = await InsertAffiliate.returnInsertAffiliateIdentifier();
const companyId = await InsertAffiliate.returnCompanyId();

const response = await fetch('/create-checkout-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    priceId: 'price_xxxxx',
    insertAffiliate: affiliateId,
    insertAffiliateCompanyId: companyId,
    successUrl: window.location.origin + '/success',
    cancelUrl: window.location.origin + '/canceled',
  }),
});
```

**Step 3: Store in Stripe Metadata (Backend)**

```javascript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: priceId, quantity: 1 }],
  metadata: {
    insertAffiliate: insertAffiliate || '',
    insertAffiliateCompanyId: insertAffiliateCompanyId || '',
  },
  subscription_data: {
    metadata: {
      insertAffiliate: insertAffiliate || '',
      insertAffiliateCompanyId: insertAffiliateCompanyId || '',
    },
  },
  success_url: successUrl,
  cancel_url: cancelUrl,
});
```

📖 **[View complete Stripe integration guide →](docs/stripe-integration.md)**

Includes:
- Stripe Billing with RevenueCat
- RevenueCat Web Billing integration
- RevenueCat Web Purchase Links
- Callback-based integration

✅ **Stripe setup complete!**

</details>

---

### 3. Set Up Deep Linking

**Deep linking lets affiliates share unique links that track users to your app/website.**

| Provider | Best For | Complexity |
|----------|----------|------------|
| [**Insert Links**](#option-1-insert-links-automatic) | Simplest setup, no 3rd party | Simple |
| [**Branch.io**](#option-2-branchio) | Robust attribution | Medium |
| [**AppsFlyer**](#option-3-appsflyer) | Enterprise analytics | Medium |

<details open>
<summary><h4>Option 1: Insert Links (Automatic)</h4></summary>

Insert Links is Insert Affiliate's built-in deep linking - no configuration needed for web.

The SDK automatically:
1. Detects `insertAffiliate` parameter from URLs
2. Validates and stores the affiliate identifier
3. Triggers callbacks when affiliate changes

**That's it!** Just initialize the SDK and affiliate links work automatically.

Learn more: [Insert Links Documentation](https://docs.insertaffiliate.com/insert-links)

</details>

<details>
<summary><h4>Option 2: Branch.io</h4></summary>

**For web redirects:** Configure your Branch.io Quick Links to redirect to your web URL with the affiliate parameter:

```
https://yourwebsite.com/checkout?insertAffiliate={affiliateShortCode}
```

**For Capacitor apps:** Use the Branch.io Capacitor plugin:

```javascript
import { BranchDeepLinks } from 'capacitor-branch-deep-links';
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

BranchDeepLinks.addListener('init', async (event) => {
  const clicked = event?.referringParams?.['+clicked_branch_link'];
  const referringLink = event?.referringParams?.['~referring_link'];

  if (clicked && referringLink) {
    await InsertAffiliate.setInsertAffiliateIdentifier(referringLink);
  }
});
```

📖 **[View complete deep linking guide →](docs/deep-linking-web.md)**

</details>

<details>
<summary><h4>Option 3: AppsFlyer</h4></summary>

Configure your AppsFlyer OneLinks to redirect to your web URL with the affiliate parameter:

```
https://yourwebsite.com/checkout?insertAffiliate={affiliateShortCode}
```

The SDK automatically detects `insertAffiliate` from the URL and attributes the payment.

📖 **[View complete deep linking guide →](docs/deep-linking-web.md)**

</details>

---

## ✅ Verify Your Integration

### Integration Checklist

- [ ] **SDK Initializes**: Check console for `SDK initialized with company code` log
- [ ] **Affiliate Detected**: Visit your site with `?insertAffiliate=TEST123` and verify it's captured
- [ ] **Payment Tracked**: Make a test purchase and verify it appears in Insert Affiliate dashboard

### Testing URL Parameters

Visit your app with an affiliate parameter:
```
https://yourwebsite.com?insertAffiliate=TEST123
```

Check the affiliate was captured:
```javascript
const affiliateId = await InsertAffiliate.returnInsertAffiliateIdentifier();
console.log('Detected affiliate:', affiliateId); // Should output: TEST123
```

### Common Setup Issues

| Issue | Solution |
|-------|----------|
| "Company code not set" | Ensure `initialize()` is called before other SDK methods |
| Affiliate not detected | Check URL parameter is exactly `insertAffiliate` (case-sensitive) |
| Payment not tracked | Verify Stripe/RevenueCat webhook is configured correctly |

---

## 🔧 Advanced Features

<details>
<summary><h3>Event Tracking (Beta)</h3></summary>

Track custom events beyond purchases to incentivize affiliates for specific actions.

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

// Track a signup event (affiliate identifier must be set first)
await InsertAffiliate.trackEvent('user_signup');
```

**Use Cases:**
- Pay affiliates for signups instead of purchases
- Track trial starts or content unlocks

</details>

<details>
<summary><h3>Short Codes</h3></summary>

Short codes are unique, 3-25 character alphanumeric identifiers that affiliates can share (e.g., "SAVE20" in a TikTok description).

**Validate and Store Short Code:**

```javascript
const isValid = await InsertAffiliate.setShortCode('SAVE20');

if (isValid) {
  alert('Affiliate code applied!');

  // Check for associated offer
  const offerCode = await InsertAffiliate.getOfferCode();
  if (offerCode) {
    alert(`You unlocked: ${offerCode}`);
  }
} else {
  alert('Invalid affiliate code');
}
```

**Get Affiliate Details Without Setting:**

```javascript
const details = await InsertAffiliate.getAffiliateDetails('SAVE20');

if (details) {
  console.log('Affiliate Name:', details.affiliateName);
  console.log('Short Code:', details.affiliateShortCode);
  console.log('Deep Link:', details.deeplinkUrl);
}
```

Learn more: [Short Codes Documentation](https://docs.insertaffiliate.com/short-codes)

</details>

<details>
<summary><h3>Affiliate Change Callback</h3></summary>

Get notified when the affiliate identifier changes:

```javascript
InsertAffiliate.setInsertAffiliateIdentifierChangeCallback((identifier, offerCode) => {
  if (identifier) {
    console.log('Affiliate changed:', identifier);
    console.log('Offer code:', offerCode || 'none');

    // Update UI
    document.getElementById('affiliate-banner').style.display = 'block';

    // Track in analytics
    analytics.track('affiliate_link_clicked', { identifier, offerCode });
  }
});

// Clear callback when done
InsertAffiliate.setInsertAffiliateIdentifierChangeCallback(null);
```

**Callback Parameters:**
- `identifier` (string | null): The full affiliate identifier (shortCode-userId)
- `offerCode` (string | null): The offer code associated with this affiliate (if any)

</details>

---

## 📖 API Reference

### Core Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `initialize(companyCode, verbose?, timeout?, preventTransfer?)` | Initialize the SDK | `Promise<void>` |
| `returnInsertAffiliateIdentifier(ignoreTimeout?)` | Get current affiliate identifier | `Promise<string \| null>` |
| `returnCompanyId()` | Get company ID | `Promise<string \| null>` |
| `setInsertAffiliateIdentifier(link)` | Set affiliate from deep link | `Promise<string \| null>` |
| `setShortCode(code)` | Validate and store short code | `Promise<boolean>` |
| `getAffiliateDetails(code)` | Get affiliate info without storing | `Promise<AffiliateDetails \| null>` |
| `trackEvent(eventName)` | Track custom event | `Promise<void>` |
| `getOfferCode()` | Get offer code modifier | `Promise<string \| null>` |
| `getAffiliateExpiryTimestamp()` | Get Unix timestamp (ms) when attribution expires | `Promise<number \| null>` |
| `getAffiliateStoredDate()` | Get ISO date string when affiliate was stored | `Promise<string \| null>` |
| `isAffiliateAttributionValid()` | Check if attribution is still valid | `Promise<boolean>` |
| `setInsertAffiliateIdentifierChangeCallback(fn)` | Set change callback | `void` |

<details>
<summary><strong>Detailed Method Documentation</strong></summary>

#### `returnInsertAffiliateIdentifier(ignoreTimeout?)`

Retrieves the current affiliate identifier.

**Parameters:**
- `ignoreTimeout` (optional, boolean): Set to `true` to get identifier even if attribution window expired

**Returns:** `Promise<string | null>`

```javascript
// Respects attribution window
const affiliateId = await InsertAffiliate.returnInsertAffiliateIdentifier();

// Ignores attribution window
const affiliateIdAlways = await InsertAffiliate.returnInsertAffiliateIdentifier(true);
```

#### `returnCompanyId()`

Retrieves the company ID used during initialization.

**Returns:** `Promise<string | null>`

```javascript
const companyId = await InsertAffiliate.returnCompanyId();
```

</details>

---

## 🔍 Troubleshooting

### Initialization Issues

**Error:** "Company code not set"
- **Solution:** Call `initialize()` before any other SDK methods

### Deep Linking Issues

**Problem:** Affiliate parameter not detected
- **Solution:** Ensure parameter name is exactly `insertAffiliate` (case-sensitive)
- Initialize SDK before URL parameters are processed

### Payment Tracking Issues

**Problem:** Purchases not appearing in dashboard
- **Solution:** Verify webhook configuration in Stripe/RevenueCat
- Check both `insertAffiliate` and `insertAffiliateCompanyId` are in metadata

### Verbose Logging

Enable detailed logs to diagnose issues:

```javascript
await InsertAffiliate.initialize('YOUR_COMPANY_CODE', true);
```

---

## 📚 Support

- **Documentation**: [docs.insertaffiliate.com](https://docs.insertaffiliate.com)
- **Stripe Integration Guide**: [docs/stripe-integration.md](docs/stripe-integration.md)
- **Deep Linking Guide**: [docs/deep-linking-web.md](docs/deep-linking-web.md)
- **Dashboard**: [app.insertaffiliate.com](https://app.insertaffiliate.com)
- **Issues**: [GitHub Issues](https://github.com/Insert-Affiliate/insert-affiliate-js-sdk/issues)

---

**Need help?** Check our [documentation](https://docs.insertaffiliate.com) or [contact support](https://app.insertaffiliate.com/help).

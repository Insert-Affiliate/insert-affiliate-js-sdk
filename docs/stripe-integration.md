# Stripe Integration Guide

This guide covers all Stripe-based payment integrations for affiliate tracking with Insert Affiliate.

## Prerequisites

- Insert Affiliate SDK initialized in your web application
- Stripe account connected to Insert Affiliate (see [Connect Stripe Account](#1-connect-your-stripe-account) below)

## 1. Connect Your Stripe Account

Before integrating the SDK code, you must connect your Stripe account to Insert Affiliate:

1. Go to your [Insert Affiliate dashboard settings](https://app.insertaffiliate.com/settings)
2. Navigate to the payment verification settings
3. Select **Stripe** as your verification method
4. Click **Connect with Stripe** to authorize the connection via Stripe Connect
5. Once connected, Insert Affiliate will automatically receive your Stripe events

## 2. Direct Stripe Checkout Integration

For web-based subscriptions and payments using Stripe Checkout directly.

### Frontend Code

Retrieve the affiliate identifier and company ID before creating a checkout session:

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

const affiliateId = await InsertAffiliate.returnInsertAffiliateIdentifier();
const companyId = await InsertAffiliate.returnCompanyId();

const response = await fetch('https://your-backend.com/create-checkout-session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    priceId: 'price_xxxxx',
    insertAffiliate: affiliateId,
    insertAffiliateCompanyId: companyId,
    successUrl: window.location.origin + '/success',
    cancelUrl: window.location.origin + '/canceled',
  }),
});

const { sessionId } = await response.json();
// Redirect to Stripe Checkout
```

### Backend Code (Node.js)

Store both the affiliate identifier and company ID in Stripe metadata:

```javascript
const stripe = require('stripe')('sk_test_xxxxx');

app.post('/create-checkout-session', async (req, res) => {
  const { priceId, insertAffiliate, insertAffiliateCompanyId, successUrl, cancelUrl } = req.body;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{
      price: priceId,
      quantity: 1,
    }],
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

  res.json({ sessionId: session.id });
});
```

**Required Metadata Fields:**
- `insertAffiliate`: The affiliate's short code
- `insertAffiliateCompanyId`: Your Insert Affiliate company ID

Both fields are required for proper affiliate attribution and commission tracking.

## 3. Stripe Billing with RevenueCat

If you're using RevenueCat's [Stripe Billing](https://www.revenuecat.com/docs/web/integrations/stripe), you can track affiliate conversions through Insert Affiliate while using RevenueCat for subscription management.

**Prerequisites:**
- You must host your own web checkout page where Stripe Checkout is embedded
- Follow RevenueCat's [Stripe integration guide](https://www.revenuecat.com/docs/web/integrations/stripe)

**Integration:**

Follow the same steps as [Direct Stripe Checkout Integration](#2-direct-stripe-checkout-integration) above. Since you've connected your Stripe account via Stripe Connect, Insert Affiliate will automatically receive all Stripe events. RevenueCat handles subscription management, while Insert Affiliate handles affiliate attribution through the Stripe metadata.

## 4. RevenueCat Web Billing Integration

If you're using [RevenueCat's Web SDK with Web Billing](https://www.revenuecat.com/docs/web/web-billing/overview), pass UTM parameters as purchase metadata.

**Prerequisites:**
- RevenueCat Web SDK installed and configured
- RevenueCat Web Billing set up with Stripe
- Insert Affiliate SDK initialized on your page
- Stripe account connected via Stripe Connect

### Implementation

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';
import { Purchases } from '@revenuecat/purchases-js';

// Initialize both SDKs
await InsertAffiliate.initialize('your_company_code');
const purchases = Purchases.configure('your_revenuecat_web_api_key');

// Get affiliate information
const affiliateId = await InsertAffiliate.returnInsertAffiliateIdentifier(true);
const companyId = await InsertAffiliate.returnCompanyId();

// Prepare metadata with UTM parameters
const metadata: Record<string, string> = {};

if (affiliateId && affiliateId !== 'none') {
  metadata.utm_source = 'insertAffiliate';
  metadata.utm_medium = companyId || 'none';
  metadata.utm_campaign = affiliateId;
}

// Get offerings and make purchase
const offerings = await purchases.getOfferings();
const selectedPackage = offerings.current?.availablePackages[0];

if (selectedPackage) {
  const { customerInfo } = await purchases.purchase({
    rcPackage: selectedPackage,
    metadata: metadata,
  });
  console.log('Purchase successful!');
}
```

**UTM Parameter Mapping:**
| Parameter | Value | Purpose |
|-----------|-------|---------|
| `utm_source` | `'insertAffiliate'` | Identifies Insert Affiliate conversions |
| `utm_medium` | Your company ID | Links to your Insert Affiliate account |
| `utm_campaign` | Affiliate identifier | Credits the specific affiliate |

## 5. RevenueCat Web Purchase Links

If you're using [RevenueCat Web Purchase Links](https://www.revenuecat.com/docs/web/web-billing/web-purchase-links) for online campaigns, append UTM parameters to the links.

### URL Format

Base URL:
```
https://pay.rev.cat/sandbox/viqxbcoudyfaeaae/
```

With affiliate parameters:
```
https://pay.rev.cat/sandbox/viqxbcoudyfaeaae/?utm_source=insertAffiliate&utm_medium={companyId}&utm_campaign={affiliateShortCode}
```

### Full Example

```
https://pay.rev.cat/sandbox/viqxbcoudyfaeaxa/?utm_source=insertAffiliate&utm_medium=12345&utm_campaign=AFF123
```

Where:
- `utm_source=insertAffiliate` - Identifies this as an Insert Affiliate conversion
- `utm_medium=12345` - Your Insert Affiliate company ID
- `utm_campaign=AFF123` - The affiliate's short code

The Insert Affiliate SDK automatically processes the UTM parameters when users open these URLs and attributes the resulting purchase to the correct affiliate.

## Using the Callback for Automatic Integration

The SDK provides a callback that fires whenever the affiliate identifier changes, making it easy to automatically update your checkout flow:

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

let currentAffiliateId = null;

InsertAffiliate.setInsertAffiliateIdentifierChangeCallback((identifier) => {
  if (identifier) {
    console.log('Affiliate identifier changed:', identifier);
    currentAffiliateId = identifier;
  }
});

// Later, when creating a Stripe checkout session
const companyId = await InsertAffiliate.returnCompanyId();

const response = await fetch('/create-checkout-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    priceId: 'price_xxxxx',
    insertAffiliate: currentAffiliateId,
    insertAffiliateCompanyId: companyId,
    successUrl: window.location.origin + '/success',
    cancelUrl: window.location.origin + '/canceled',
  }),
});
```

## Troubleshooting

**Problem:** Affiliate not credited for purchase
- **Solution:** Verify both `insertAffiliate` and `insertAffiliateCompanyId` are included in Stripe metadata
- Check that your Stripe account is connected via Stripe Connect in the Insert Affiliate dashboard

**Problem:** Metadata not appearing in Stripe
- **Solution:** Ensure metadata is passed to both `metadata` and `subscription_data.metadata` in the checkout session

**Problem:** UTM parameters not being captured
- **Solution:** Initialize the Insert Affiliate SDK before users interact with purchase flows
- Verify the SDK is processing URL parameters on page load

## Next Steps

- Test with a test affiliate link to verify attribution
- Make a test purchase to confirm tracking works end-to-end
- Monitor conversions in your Insert Affiliate dashboard

[Back to Main README](../README.md)

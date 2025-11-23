# Insert Affiliate JavaScript SDK

## Overview

The **Insert Affiliate JavaScript SDK** brings affiliate tracking to web and hybrid applications, providing seamless integration with the [Insert Affiliate platform](https://insertaffiliate.com). It is fully compatible with Capacitor, making it a great choice for modern cross-platform apps that require affiliate attribution and purchase tracking support.

This SDK is ideal for developers who want to integrate affiliate marketing into their app's monetisation strategy and track purchases via partners like RevenueCat.

### Features

- **Unique Device ID**: Creates a unique ID to anonymously associate purchases with users for tracking purposes.
- **Affiliate Identifier Management**: Set and retrieve the affiliate identifier based on user-specific links or short codes.
- **Short Code Support (Beta)**: Allow users to enter affiliate short codes for tracking.

### Supported Platforms
- ✅ Capacitor (iOS / Android) – Fully tested
- ✅ Web Browsers – Tested in modern desktop and mobile browsers
- ⚠️ Other JavaScript Environments – May work, but not officially tested

## Getting Started
To get started with the Insert Affiliate JavaScript SDK:

1. [Install the SDK via NPM](#installation)
2. [Initialise the SDK in your Main Javascript/Typescript File](#basic-usage)
3. [Set up in-app purchases (Required)](#in-app-purchase-setup-required)
4. [Set up deep linking (Required)](#deep-link-setup-required)
5. [Use additional features like short codes and event tracking.](#additional-features)


## Installation

Install the Insert Affiliate JavaScript SDK and required plugins:

```bash
npm install insert-affiliate-js-sdk
```

Then run
```bash
npx cap sync
```

## Basic Usage
### Import the SDKs

In your ```main.ts``` or ```main.js``` file:

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';
await InsertAffiliate.initialize("your_company_code");

```
- Replace `{{ your_company_code }}` with the unique company code associated with your Insert Affiliate account. You can find this code in your dashboard under [Settings](http://app.insertaffiliate.com/settings).

### Verbose Logging (Optional)

By default, the SDK operates with minimal logging to avoid cluttering the console. However, you can enable verbose logging to see detailed information about SDK operations. This is particularly useful for debugging during development or testing.

#### Enable Verbose Logging

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

// Enable verbose logging (second parameter)
await InsertAffiliate.initialize("your_company_code", true);
```

**When verbose logging is enabled, you'll see detailed logs with the `[Insert Affiliate] [VERBOSE]` prefix that show:**

- **Initialization Process**: SDK startup, company code validation, storage operations
- **Data Management**: User ID generation, referrer link storage, company code state management
- **Deep Link Processing**: Input validation, short code detection, API conversion process
- **API Communication**: Request/response details for all server calls
- **Event Tracking**: Event parameters, payload construction, success/failure status
- **Purchase Operations**: Transaction storage, token validation, webhook processing

**Example verbose output:**
```
[Insert Affiliate] [VERBOSE] Starting SDK initialization...
[Insert Affiliate] [VERBOSE] Company code provided: Yes
[Insert Affiliate] [VERBOSE] Verbose logging enabled
[Insert Affiliate] SDK initialized with company code: your-company-code
[Insert Affiliate] [VERBOSE] Company code saved to storage
[Insert Affiliate] [VERBOSE] SDK marked as initialized
```

**Benefits of verbose logging:**
- **Debug Deep Linking Issues**: See exactly what links are being processed and how they're converted
- **Monitor API Communication**: Track all server requests, responses, and error details
- **Identify Storage Problems**: Understand storage read/write operations and state management
- **Performance Insights**: Monitor async operation timing and identify bottlenecks
- **Integration Troubleshooting**: Quickly identify configuration or setup issues

⚠️ **Important**: Disable verbose logging in production builds to avoid exposing sensitive debugging information and to optimize performance.

## In-App Purchase Setup [Required]

Insert Affiliate requires a receipt verification platform to validate purchases. Choose the integration method(s) that match your platform:

- **Mobile In-App Purchases (iOS/Android) or RevenueCat Web Payments**: Use [RevenueCat](https://www.revenuecat.com/)
- **Web-Based Payments**: Use [Stripe](https://stripe.com/)
- **Hybrid Apps**: If your app supports both native mobile purchases AND web payments, set up both integrations

### Mobile In-App Purchases: RevenueCat Integration

#### Code Setup
1. **Install RevenueCat SDK** - First, complete the set up of the relevant [RevenueCat SDK](https://www.revenuecat.com/docs/getting-started/installation) to set up in-app purchases and subscriptions.

2. **Modify Initialisation Code** - Update the file where you initialise your deep linking (e.g., Branch.io) and RevenueCat to include a call to ```InsertAffiliate.returnInsertAffiliateIdentifier()```. This ensures that the Insert Affiliate identifier is passed to RevenueCat every time the app starts or a deep link is clicked.

3. **Implementation Example**

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';
import { Purchases } from '@revenuecat/purchases-capacitor';

window.addEventListener('DOMContentLoaded', async () => {
    await Purchases.configure({ apiKey: 'your_revcat_api_key' });
    
    const affiliateIdentifier = await InsertAffiliate.returnInsertAffiliateIdentifier();
    
    if (affiliateIdentifier) {
        await Purchases.setAttributes({ insert_affiliate: affiliateIdentifier });
    }
});
```

#### Webhook Setup

Next, you must setup a webhook to allow us to communicate directly with RevenueCat to track affiliate purchases.

1. Go to RevenueCat and [create a new webhook](https://www.revenuecat.com/docs/integrations/webhooks)

2. Configure the webhook with these settings:
   - Webhook URL: `https://api.insertaffiliate.com/v1/api/revenuecat-webhook`
   - Authorization header: Use the value from your Insert Affiliate dashboard (you'll get this in step 4)
   - Set "Event Type" to "All events"

3. In your [Insert Affiliate dashboard settings](https://app.insertaffiliate.com/settings):
   - Navigate to the verification settings
   - Set the in-app purchase verification method to `RevenueCat`

4. Back in your Insert Affiliate dashboard:
   - Locate the `RevenueCat Webhook Authentication Header` value
   - Copy this value
   - Paste it as the Authorization header value in your RevenueCat webhook configuration

## Web-Based Payments: Stripe Integration

For web-based subscriptions and payments using Stripe, you'll need to connect your Stripe account and pass the Insert Affiliate identifier and company ID to Stripe's metadata during checkout.

**📚 For complete setup instructions, see: [Stripe Web-Based Transactions Documentation](https://docs.insertaffiliate.com/stripe-web-based-transactions)**

#### Setup Steps

1. **Connect Your Stripe Account (Required First Step)**

Before integrating the SDK code, you must connect your Stripe account to Insert Affiliate:

- Go to your [Insert Affiliate dashboard settings](https://app.insertaffiliate.com/settings)
- Navigate to the payment verification settings
- Select **Stripe** as your verification method
- Click **Connect with Stripe** to authorize the connection via Stripe Connect
- Once connected, Insert Affiliate will automatically receive your Stripe events

2. **Retrieve the Affiliate Identifier and Company ID**

Before creating a Stripe checkout session, retrieve the current affiliate identifier and company ID from the Insert Affiliate SDK:

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

const affiliateId = await InsertAffiliate.returnInsertAffiliateIdentifier();
const companyId = await InsertAffiliate.returnCompanyId();
```

3. **Pass to Your Backend**

When calling your backend to create a Stripe checkout session, include both the affiliate identifier and company ID:

```javascript
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
```

4. **Store in Stripe Metadata (Backend)**

In your backend, when creating the Stripe checkout session, store both the affiliate identifier and company ID in the session metadata and subscription metadata:

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

Both fields are required for proper affiliate attribution and commission tracking. Once you've connected your Stripe account via Stripe Connect (Step 1), Insert Affiliate will automatically receive all Stripe events and read these metadata fields to credit affiliates.

### Stripe Billing with RevenueCat

If you're using RevenueCat's [Stripe Billing](https://www.revenuecat.com/docs/web/integrations/stripe), you can track affiliate conversions through Insert Affiliate while using RevenueCat for subscription management.

**Prerequisites:**
- You must host your own web checkout page where Stripe Checkout is embedded (Insert Affiliate SDK needs to run on your page)
- Follow RevenueCat's [Stripe integration guide](https://www.revenuecat.com/docs/web/integrations/stripe) to set up the RevenueCat-Stripe connection

**Integration:**

Simply follow the same **[Stripe Integration steps above](#web-based-payments-stripe-integration)**, which includes:
1. Connecting your Stripe account via Stripe Connect in the Insert Affiliate dashboard
2. Installing the SDK on your checkout page
3. Passing the affiliate metadata to Stripe

That's it! Since you've connected your Stripe account via Stripe Connect, Insert Affiliate will automatically receive all Stripe events. RevenueCat handles subscription management, while Insert Affiliate handles affiliate attribution through the Stripe metadata.

### RevenueCat Web Billing Integration

If you're using [RevenueCat's Web SDK with Web Billing](https://www.revenuecat.com/docs/web/web-billing/overview), you can track affiliate conversions by passing UTM parameters as purchase metadata.

**Prerequisites:**
- RevenueCat Web SDK installed and configured
- RevenueCat Web Billing set up with Stripe
- Insert Affiliate SDK initialized on your page
- Connecting your Stripe account via Stripe Connect in the Insert Affiliate dashboard as described [above](#web-based-payments-stripe-integration)

**Integration Steps:**

1. **Install and Initialize Both SDKs**

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';
import { Purchases } from '@revenuecat/purchases-js';

// Initialize Insert Affiliate SDK
await InsertAffiliate.initialize('your_company_code');

// Initialize RevenueCat Web SDK
const purchases = Purchases.configure('your_revenuecat_web_api_key');
```

2. **Retrieve Affiliate Information and Pass as Metadata During Purchase**

Before making a purchase, retrieve the current affiliate identifier and company ID from the Insert Affiliate SDK, then pass them as UTM parameters in the RevenueCat purchase metadata:

```javascript
// Get the current affiliate identifier and company ID
// Use ignoreTimeout: true to get the identifier even if attribution window expired
const affiliateId = await InsertAffiliate.returnInsertAffiliateIdentifier(true);
const companyId = await InsertAffiliate.returnCompanyId();

console.log('Affiliate ID:', affiliateId || 'none');
console.log('Company ID:', companyId || 'none');

// Prepare metadata with UTM parameters for RevenueCat Web Billing
const metadata: Record<string, string> = {};

if (affiliateId && affiliateId !== 'none') {
  metadata.utm_source = 'insertAffiliate';
  metadata.utm_medium = companyId || 'none';
  metadata.utm_campaign = affiliateId;
}

console.log('Purchase metadata:', JSON.stringify(metadata, null, 2));

// Get offerings and select a package
const offerings = await purchases.getOfferings();
const selectedPackage = offerings.current?.availablePackages[0];

if (!selectedPackage) {
  console.error('No packages available');
  return;
}

// Make the purchase with metadata
const { customerInfo } = await purchases.purchase({
  rcPackage: selectedPackage,
  metadata: metadata,
});

console.log('Purchase successful!');
console.log('Active entitlements:', Object.keys(customerInfo.entitlements.active));
```

**Important Notes:**
- Always call `returnInsertAffiliateIdentifier()` and `returnCompanyId()` **before** initiating the purchase
- Only include UTM parameters in metadata if an affiliate identifier exists
- The metadata will be sent with the purchase and available in RevenueCat webhook events


**UTM Parameter Mapping:**
- `utm_source`: Always set to `'insertAffiliate'` to identify Insert Affiliate conversions
- `utm_medium`: Your Insert Affiliate company ID
- `utm_campaign`: The affiliate's identifier

## RevenueCat Web Purchase Links

If you are using [**RevenueCat Web Purchase Links**](https://www.revenuecat.com/docs/web/web-billing/web-purchase-links) for online campaigns (such as email marketing, social media, or affiliate promotions), you must append the following UTM parameters to ensure proper affiliate tracking:

- **utm_source**
- **utm_medium**
- **utm_campaign**

These parameters allow Insert Affiliate to track and attribute web-based purchases correctly.

### Example

If your RevenueCat Web Purchase Link is:

```text
https://pay.rev.cat/sandbox/viqxbcoudyfaeaae/
```

You should append:
```text
?utm_source=insertAffiliate&utm_medium={insertAffiliateCompanyId}&utm_campaign={insertAffiliateUtmCampaign}
```

#### Full Example With Parameters
```text
https://pay.rev.cat/sandbox/viqxbcoudyfaeaxa/?utm_source=insertAffiliate&utm_medium=12345&utm_campaign=AFF123
```

Where:
- utm_source=insertAffiliate
- utm_medium={insertAffiliateCompanyId} → your unique Insert Affiliate company ID
- utm_campaign={insertAffiliateShortCode} → the affiliate’s short code

Once the user opens this URL, the Insert Affiliate SDK automatically processes the UTM parameters and attributes the resulting purchase to the correct affiliate.

## Configuring Deep Links for Web-Based Payments
Use this section to configure Branch.io, AppsFlyer, or Insert Links so that your deep links correctly pass the insertAffiliate parameter to your web checkout.

### Branch.io – Web Redirect Setup

Use these steps if you're using [Branch.io](https://docs.insertaffiliate.com/branch) Quick Links to send users to your web-hosted payment page.

### Creating a Branch.io Quick Link for Stripe Checkout:

1. **Create a new Quick Link** in your Branch.io dashboard
2. Go to the **Redirects** section.
3. **Select "Web URL"** as the redirect destination
4. **Configure the URL** to point to your web app hosting the Stripe payment form:
   - Enter your web app's URL
   - Append the parameter: `?insertAffiliate={affiliateShortCode}`
   - Replace `{affiliateShortCode}` with the actual [short code](https://docs.insertaffiliate.com/short-codes) of the affiliate you're creating the link for

**Example:**
```
https://yourwebsite.com?insertAffiliate=ABC123
```

Once the user arrives on your site, the Insert Affiliate SDK automatically detects insertAffiliate and attributes the payment.

For more details, see the [Short Codes documentation](https://docs.insertaffiliate.com/short-codes).

### AppsFlyer – Web Redirect Setup

Use these steps if you're using [AppsFlyer](https://docs.insertaffiliate.com/appsflyer) OneLinks to send users to your Stripe or RevenueCat web checkout flow.

### Creating an AppsFlyer OneLink for Stripe Checkout
1. **Create a new OneLink** in your AppsFlyer dashboard
2. Open the link configuration settings
3. Under **"When link is clicked on desktop web page"**, set the redirect URL
4. Enter your web app’s checkout URL.
5. Append the parameter: `?insertAffiliate={affiliateShortCode}`
   - Replace `{affiliateShortCode}` with the actual [short code](https://docs.insertaffiliate.com/short-codes) of the affiliate you're creating the link for

**Example:**
```
https://yourwebsite.com?insertAffiliate=ABC123
```

The Insert Affiliate SDK will automatically detect the parameter and attribute the resulting payment.

For more details, see the [Short Codes documentation](https://docs.insertaffiliate.com/short-codes).

### Insert Links – Web Automatic Configuration

If you're using [**Insert Links**](https://docs.insertaffiliate.com/insert-links) (Insert Affiliate’s built-in deep linking solution), you don’t need to configure anything for web payments.

Insert Links automatically:
1. Adds the `insertAffiliate` parameter
2. Detects and processes attribution in your web app
3. Tracks the payment to the correct affiliate

No extra setup, no redirects to configure — just initialise the SDK and you're done.

Learn more in our[Insert Links documentation](https://docs.insertaffiliate.com/insert-links).

## Using the Callback for Automatic Integration

The SDK provides a callback that fires whenever the affiliate identifier changes.
This makes it easy to automatically update your UI, analytics, or checkout flow.

#### Example: Storing Affiliate Identifier for Checkout

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

// Track the current affiliate identifier
let currentAffiliateId = null;

InsertAffiliate.setInsertAffiliateIdentifierChangeCallback((identifier) => {
  if (identifier) {
    console.log('Affiliate identifier changed:', identifier);
    currentAffiliateId = identifier;
  }
});

// Later, when creating a Stripe checkout session
const companyId = await InsertAffiliate.returnCompanyId();

const response = await fetch('https://your-backend.com/create-checkout-session', {
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

#### Example: Updating the UI When an Affiliate Link Is Clicked

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

// Update the UI when the affiliate identifier changes
InsertAffiliate.setInsertAffiliateIdentifierChangeCallback((identifier) => {
  if (identifier) {
    console.log('Affiliate identifier changed:', identifier);

    const banner = document.getElementById('affiliate-banner');
    if (banner) {
      banner.textContent = 'You used a special affiliate link!';
      banner.style.display = 'block';
    }

    analytics.track('affiliate_link_clicked', { identifier });
  }
});
```

**Benefits of using the callback:**
- Automatically captures affiliate identifiers
- No need for manual checks
- Ensures attribution is always up-to-date
- Perfect for handling dynamic user flows
- Enables custom UI updates and analytics events

**To clear the callback:**
```javascript
InsertAffiliate.setInsertAffiliateIdentifierChangeCallback(null);
```

## Capacitor/Hybrid App Deep Link Handling

If your app uses Branch.io via Capacitor, you may want to manually capture the referring link.
Here’s an example using the Branch.io Capacitor Plugin:

#### Example with Branch.io Capacitor Plugin

```javascript
import { BranchDeepLinks, BranchInitEvent } from 'capacitor-branch-deep-links';
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

// Set up callback to automatically capture affiliate identifier when user clicks a link
InsertAffiliate.setInsertAffiliateIdentifierChangeCallback((identifier) => {
  if (identifier) {
    console.log('Affiliate identifier changed:', identifier);
    console.log('Affiliate attribution captured successfully');
  }
});

let branchInitialised = false;

async function setUpBranchListener() {
    if (branchInitialised) return;
    branchInitialised = true;

    try {
        await BranchDeepLinks.addListener('init', async (event: BranchInitEvent) => {
            const clicked = event?.referringParams?.['+clicked_branch_link'];
            const referringLink = event?.referringParams?.['~referring_link'];

            if (clicked && referringLink) {
                // This will automatically trigger the callback
                await InsertAffiliate.setInsertAffiliateIdentifier(referringLink);
            }
        });

        BranchDeepLinks.addListener('initError', (error: any) => {
            console.error('Branch init error:', error);
        });
    } catch (err) {
        console.error('Error setting up Branch listener:', err);
    }
}
```

**Note:** For most web applications, the automatic URL detection method is recommended and requires no additional setup.

## Additional Features

### 1. Event Tracking (Beta)

Insert Affiliate now includes a beta feature for event tracking. Use event tracking to log key user actions such as signups, purchases, or referrals. This is useful for:
- Understanding user behaviour.
- Measuring the effectiveness of marketing campaigns.
- Incentivising affiliates for designated actions being taken by the end users, rather than just in app purchases (i.e. pay an affilaite for each signup).

At this stage, we cannot guarantee that this feature is fully resistant to tampering or manipulation.

#### Using `trackEvent`

To track an event, use the `trackEvent` function. Make sure to set an affiliate identifier first; otherwise, event tracking won’t work. Here’s an example:

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

async function trackSignupEvent() {
    try {
        await InsertAffiliate.trackEvent('your_event_name_here');
    } catch (error) {
        console.error('❌ Failed to track event:', error);
    }
}
```

### 2. Short Codes (Beta)

### What are Short Codes?

Short codes are unique, 3 to 25 character alphanumeric identifiers that affiliates can use to promote products or subscriptions. These codes are ideal for influencers or partners, making them easier to share than long URLs.

**Example Use Case**: An influencer promotes a subscription with the short code "JOIN123456" within their TikTok video's description. When users enter this code within your app during sign-up or before purchase, the app tracks the subscription back to the influencer for commission payouts.

For more information, visit the [Insert Affiliate Short Codes Documentation](https://docs.insertaffiliate.com/short-codes).

### Setting a Short Code

Use the `setShortCode` method to associate a short code with an affiliate. This is ideal for scenarios where users enter the code via an input field, pop-up, or similar UI element.

Short codes must meet the following criteria:
- Between **3 and 25 characters long**.
- Contain only **letters and numbers** (alphanumeric characters).
- Replace {{ user_entered_short_code }} with the short code the user enters through your chosen input method, i.e. an input field / pop up element


#### Example Integration
Below is an example SwiftUI implementation where users can enter a short code, which will be validated and associated with the affiliate's account:

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

// Example: user entered this in a form
const userEnteredCode = 'B3SC6VRRKQ';

InsertAffiliate.setShortCode(userEnteredCode);
```

## API Reference

### Core Methods

#### `returnInsertAffiliateIdentifier()`

Retrieves the current affiliate identifier that has been set via deep links, URL parameters, or short codes. This is the primary method for getting the affiliate's unique identifier to pass to payment processors or analytics platforms.

**Parameters:**
- `ignoreTimeout` (optional, boolean): Set to `true` to retrieve the identifier even if the attribution window has expired. Default is `false`.

**Returns:** `Promise<string | null>`
- Returns the affiliate identifier if one has been set and is still valid
- Returns `null` if no affiliate identifier is set or if the attribution window has expired

**Example Usage:**

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

// Initialize the SDK first
await InsertAffiliate.initialize('your_company_code');

// Later, retrieve the affiliate identifier (respects attribution window)
const affiliateId = await InsertAffiliate.returnInsertAffiliateIdentifier();
console.log('Affiliate ID:', affiliateId); // Output: 'ABC123' or null

// Retrieve even if attribution window expired
const affiliateIdIgnoreTimeout = await InsertAffiliate.returnInsertAffiliateIdentifier(true);
console.log('Affiliate ID (ignore timeout):', affiliateIdIgnoreTimeout);

// Use with Stripe checkout
const response = await fetch('/create-checkout-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    priceId: 'price_xxxxx',
    insertAffiliate: affiliateId,
    insertAffiliateCompanyId: await InsertAffiliate.returnCompanyId(),
    successUrl: window.location.origin + '/success',
    cancelUrl: window.location.origin + '/canceled',
  }),
});
```

**Use Cases:**
- **Payment Attribution**: Pass the affiliate ID to Stripe, RevenueCat, or other payment processors
- **Analytics Tracking**: Include affiliate information in analytics events
- **Conditional UI**: Show special messaging or discounts when an affiliate link was used
- **Backend API Calls**: Send affiliate information to your backend for custom tracking

**Notes:**
- The identifier is set when users click affiliate links or enter short codes
- By default, the identifier expires after the attribution window (configurable in your dashboard)
- Use `ignoreTimeout: true` if you need the identifier regardless of expiration
- Returns `null` if no affiliate link has been clicked or short code entered
- The identifier persists in local storage across sessions

#### `returnCompanyId()`

Retrieves the company ID that was used during SDK initialization. This is particularly useful when integrating with payment processors like Stripe that require the company ID to be passed as metadata for proper affiliate attribution.

**Returns:** `Promise<string | null>`
- Returns the company ID if the SDK has been initialized
- Returns `null` if no company ID is available

**Example Usage:**

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

// Initialize the SDK first
await InsertAffiliate.initialize('your_company_code');

// Later, retrieve the company ID
const companyId = await InsertAffiliate.returnCompanyId();
console.log('Company ID:', companyId); // Output: 'your_company_code'

// Use with Stripe checkout
const response = await fetch('/create-checkout-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    priceId: 'price_xxxxx',
    insertAffiliate: await InsertAffiliate.returnInsertAffiliateIdentifier(),
    insertAffiliateCompanyId: companyId,
  }),
});
```

**Use Cases:**
- **Stripe Integration**: Pass the company ID as metadata to Stripe for proper webhook attribution
- **Backend API Calls**: Include the company ID in API requests for multi-tenant applications
- **Analytics**: Track which company's affiliate links are being used

**Notes:**
- The company ID is set during SDK initialization and persists in local storage
- This method retrieves the value from memory first, falling back to storage if needed
- Returns the same value that was passed to `initialize()`

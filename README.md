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
Insert Affiliate requires a Receipt Verification platform to validate in-app purchases. You must choose **one** of our supported options:
- [RevenueCat](https://www.revenuecat.com/)
- [Stripe](https://stripe.com/)

### Option 1: RevenueCat Integration

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

### Option 2: Stripe Integration

For web-based subscriptions and payments using Stripe, you'll need to pass the Insert Affiliate identifier to Stripe's metadata during checkout.

#### Code Setup

1. **Retrieve the Affiliate Identifier**

Before creating a Stripe checkout session, retrieve the current affiliate identifier from the Insert Affiliate SDK:

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

const affiliateId = await InsertAffiliate.returnInsertAffiliateIdentifier();
```

2. **Pass to Your Backend**

When calling your backend to create a Stripe checkout session, include the affiliate identifier:

```javascript
const response = await fetch('https://your-backend.com/create-checkout-session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    priceId: 'price_xxxxx',
    insertAffiliate: affiliateId,
    successUrl: window.location.origin + '/success',
    cancelUrl: window.location.origin + '/canceled',
  }),
});
```

3. **Store in Stripe Metadata (Backend)**

In your backend, when creating the Stripe checkout session, store the affiliate identifier in both the session metadata and subscription metadata:

```javascript
const stripe = require('stripe')('sk_test_xxxxx');

app.post('/create-checkout-session', async (req, res) => {
  const { priceId, insertAffiliate, successUrl, cancelUrl } = req.body;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{
      price: priceId,
      quantity: 1,
    }],
    metadata: {
      insertAffiliate: insertAffiliate || '',
    },
    subscription_data: {
      metadata: {
        insertAffiliate: insertAffiliate || '',
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  res.json({ sessionId: session.id });
});
```


## Deep Link Setup [Required]
Insert Affiliate requires a Deep Linking platform to create links for your affiliates. Our platform works with **any** deep linking provider, and you only need to follow these steps:
1. **Create a deep link** in your chosen third-party platform and pass it to our dashboard when an affiliate signs up. 
2. **Handle deep link clicks** in your app by passing the clicked link:
   ```javascript
   InsertAffiliate.setInsertAffiliateIdentifier(data["~referring_link"]);
   ```

### Deep Linking with Branch.io
To set up deep linking with Branch.io, follow these steps:

1. Create a deep link in Branch and pass it to our dashboard when an affiliate signs up.
    - Example: [Create Affiliate](https://docs.insertaffiliate.com/create-affiliate).
2. Modify Your Deep Link Handling
    - After setting up your Branch integration, add the following code to initialise the Insert Affiliate SDK in your iOS app:


```javascript
import { BranchDeepLinks, BranchInitEvent } from 'capacitor-branch-deep-links';
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

let branchInitialised = false;

async function setUpBranchListener() {
    if (branchInitialised) return;
    branchInitialised = true;
    
    try {
        await BranchDeepLinks.addListener('init', async (event: BranchInitEvent) => {
            const clicked = event?.referringParams?.['+clicked_branch_link'];
            const referringLink = event?.referringParams?.['~referring_link'];
            
            if (clicked && referringLink) {
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

# Deep Linking for Web Payments

This guide covers how to configure deep links from Branch.io, AppsFlyer, or Insert Links to correctly pass affiliate parameters to your web checkout.

## Overview

When using web-based payments (Stripe), your deep linking provider needs to redirect users to your web checkout page with the `insertAffiliate` parameter. The Insert Affiliate SDK will automatically detect this parameter and attribute the payment to the correct affiliate.

## Insert Links (Automatic)

If you're using [Insert Links](https://docs.insertaffiliate.com/insert-links) (Insert Affiliate's built-in deep linking solution), no additional configuration is needed for web payments.

Insert Links automatically:
1. Adds the `insertAffiliate` parameter to URLs
2. Detects and processes attribution in your web app
3. Tracks the payment to the correct affiliate

Just initialize the SDK and you're done:

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

await InsertAffiliate.initialize('your_company_code');
// Affiliate parameters are automatically detected from the URL
```

Learn more: [Insert Links Documentation](https://docs.insertaffiliate.com/insert-links)

## Branch.io Web Redirect Setup

Use these steps if you're using [Branch.io](https://docs.insertaffiliate.com/branch) Quick Links to send users to your web-hosted payment page.

### Creating a Branch.io Quick Link for Web Checkout

1. **Create a new Quick Link** in your Branch.io dashboard
2. Go to the **Redirects** section
3. **Select "Web URL"** as the redirect destination
4. **Configure the URL** to point to your web app:
   - Enter your web app's URL
   - Append the parameter: `?insertAffiliate={affiliateShortCode}`
   - Replace `{affiliateShortCode}` with the actual short code of the affiliate

**Example URL:**
```
https://yourwebsite.com/checkout?insertAffiliate=ABC123
```

Once the user arrives on your site, the Insert Affiliate SDK automatically detects `insertAffiliate` and attributes the payment.

### Branch.io with Capacitor (Hybrid Apps)

For Capacitor apps using the Branch.io plugin:

```javascript
import { BranchDeepLinks, BranchInitEvent } from 'capacitor-branch-deep-links';
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

// Set up callback to capture affiliate identifier
InsertAffiliate.setInsertAffiliateIdentifierChangeCallback((identifier) => {
  if (identifier) {
    console.log('Affiliate identifier captured:', identifier);
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

## AppsFlyer Web Redirect Setup

Use these steps if you're using [AppsFlyer](https://docs.insertaffiliate.com/appsflyer) OneLinks to send users to your web checkout.

### Creating an AppsFlyer OneLink for Web Checkout

1. **Create a new OneLink** in your AppsFlyer dashboard
2. Open the link configuration settings
3. Under **"When link is clicked on desktop web page"**, set the redirect URL
4. Enter your web app's checkout URL
5. Append the parameter: `?insertAffiliate={affiliateShortCode}`
   - Replace `{affiliateShortCode}` with the actual short code of the affiliate

**Example URL:**
```
https://yourwebsite.com/checkout?insertAffiliate=ABC123
```

The Insert Affiliate SDK will automatically detect the parameter and attribute the resulting payment.

## How the SDK Detects Parameters

When your web app loads, the Insert Affiliate SDK automatically:

1. Checks the URL for `insertAffiliate` parameter
2. Validates the affiliate code with the Insert Affiliate API
3. Stores the affiliate identifier for later use
4. Triggers any registered callbacks

**Automatic URL Detection:**

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

// Initialize the SDK - it automatically checks URL parameters
await InsertAffiliate.initialize('your_company_code');

// The affiliate identifier is now available
const affiliateId = await InsertAffiliate.returnInsertAffiliateIdentifier();
console.log('Detected affiliate:', affiliateId);
```

## Using the Change Callback

For dynamic updates when an affiliate link is clicked:

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

// Set up callback before initialization
InsertAffiliate.setInsertAffiliateIdentifierChangeCallback((identifier) => {
  if (identifier) {
    console.log('Affiliate identifier changed:', identifier);

    // Update UI
    const banner = document.getElementById('affiliate-banner');
    if (banner) {
      banner.textContent = 'You used a special affiliate link!';
      banner.style.display = 'block';
    }

    // Track in analytics
    analytics.track('affiliate_link_clicked', { identifier });
  }
});

await InsertAffiliate.initialize('your_company_code');
```

## URL Parameter Reference

| Parameter | Description | Example |
|-----------|-------------|---------|
| `insertAffiliate` | The affiliate's short code | `?insertAffiliate=ABC123` |

## Testing

Test your deep link setup by visiting your web app with the affiliate parameter:

```
https://yourwebsite.com/checkout?insertAffiliate=TEST123
```

Then check the console for:
```
[Insert Affiliate] Affiliate identifier set: TEST123
```

## Troubleshooting

**Problem:** Affiliate parameter not detected
- **Solution:** Ensure the SDK is initialized before the URL parameters are processed
- Check that the parameter name is exactly `insertAffiliate` (case-sensitive)

**Problem:** Deep link opens app instead of web checkout
- **Solution:** Configure your deep linking provider to redirect to web URL for web-only flows
- Check the "Desktop redirect" settings in Branch.io or AppsFlyer

**Problem:** Parameter lost after page navigation
- **Solution:** The SDK stores the affiliate identifier in local storage, so it persists across pages
- Verify local storage is not being cleared

## Next Steps

- Configure your deep linking provider to pass `insertAffiliate` parameter
- Test with a sample affiliate short code
- Integrate with your payment flow (see [Stripe Integration Guide](./stripe-integration.md))

[Back to Main README](../README.md)

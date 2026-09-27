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
- `preventAffiliateTransfer` (optional): When `true`, prevents a new affiliate link from overwriting an existing affiliate attribution (defaults to `false`)
  - Use this to ensure the first affiliate who acquired the user always gets credit
  - New affiliate links will be silently ignored if the user already has an affiliate

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
  // Note: Use preventAffiliateTransfer in initialize() to block affiliate changes in the SDK
  InsertAffiliate.setInsertAffiliateIdentifierChangeCallback(async (identifier, offerCode) => {
    if (!identifier) return;

    // Ensure RevenueCat subscriber exists before setting attributes
    const customerInfo = await Purchases.getCustomerInfo();

    // OPTIONAL: Prevent attribution for existing subscribers
    // Uncomment to ensure affiliates only earn from users they actually brought:
    // const hasActiveEntitlement = Object.keys(customerInfo.entitlements.active).length > 0;
    // if (hasActiveEntitlement) return; // User already subscribed, don't attribute

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

<details>
<summary><h3>In-App Referrals (Refer a Friend)</h3></summary>

Turn your own users into affiliates from inside your app, show them a ready-made "Refer a friend" screen, and read their referral stats so you can reward them. Referrers are normal affiliates: they get the same dashboard, referrals tab and commission as any other affiliate.

Switch the program on in your Insert Affiliate dashboard first.

**Drop-in modal (quickest):**

```javascript
import { InsertAffiliate } from 'insert-affiliate-js-sdk';

document.getElementById('refer-button').addEventListener('click', () => {
  const modal = InsertAffiliate.showReferAFriend({
    email: currentUser.email, // prefills the form (usually your logged-in user)
    name: currentUser.name,
    onClose: () => console.log('Refer a friend closed'),
  });

  // modal.close() dismisses it from code
});
```

The modal handles everything: the "Get my link" form, the 6-digit email code step for existing affiliates, the code and link with Copy buttons, a Share button, stats (referrals and amount earned), a "Free premium until {date}" line while a premium reward is active, a "Your rewards" list of App Store offer codes or Google Play promo codes with a Redeem button each (opens the store's redemption page in a new tab) and an "Open my dashboard" button. It injects its own scoped styles, needs no framework, closes on Escape or a backdrop click, keeps keyboard focus inside while open, and returns focus afterwards. Only one modal is shown at a time: calling `showReferAFriend` again while it is open focuses the open one.

| Option | Description |
|--------|-------------|
| `email`, `name` | Prefill the form |
| `shareMessage` | Share message. May use `{link}` and `{code}` placeholders |
| `primaryColor` | Overrides the dashboard colour (any CSS colour). Default `#6A0DAD` |
| `headline`, `rewardText` | Override the dashboard copy. Default headline "Refer a friend" |
| `fontFamily`, `cornerRadius` | Match your app's look |
| `appUserId`, `playPurchaseToken` | The user's own accounts, for automatic referrer rewards. Sent when the user joins, or saved once when the modal opens for a user who already joined |
| `strings` | Replaces any of the modal's labels, for translating or rewording it |
| `onClose` | Called once when the modal closes |

Headline, reward text and colour set in the dashboard are used when you do not pass them, so wording changes need no release.

**Translating the modal:** pass `strings` with the keys you want to change. Every key is optional: a missing or blank one keeps the English default, and an unknown one is ignored.

```javascript
InsertAffiliate.showReferAFriend({
  headline: 'Parrainez un ami',
  strings: {
    emailLabel: 'E-mail',
    nameLabel: 'Nom',
    joinButton: 'Obtenir mon lien',
    codeSentNotice: 'Nous avons envoye un code a 6 chiffres a {email}.',
    verifyButton: 'Valider',
    copyCodeButton: 'Copier le code',
    shareButton: 'Partager',
    referralsLabel: 'Parrainages',
    earnedLabel: 'Gagne',
    premiumUntil: 'Premium gratuit jusqu\'au {date}',
    errorNetwork: 'Connexion impossible. Verifiez votre connexion.',
  },
});
```

Keep the `{email}` placeholder in `codeSentNotice` and `{date}` in `premiumUntil`; they are filled in for you.

| Group | Keys |
|-------|------|
| Joining | `emailLabel`, `nameLabel`, `joinButton`, `joiningButton` |
| Email code step | `codeLabel`, `codeSentNotice` (`{email}`), `verifyButton`, `verifyingButton`, `resendButton`, `sendingNotice`, `codeResentNotice`, `differentEmailButton`, `errorCodeLength` |
| Joined | `copyCodeButton`, `copyLinkButton`, `copiedNotice`, `copyFailedNotice`, `shareButton`, `shareFailedNotice`, `referralsLabel`, `earnedLabel`, `premiumUntil` (`{date}`), `rewardsHeading`, `redeemButton`, `dashboardLink` |
| Frame and states | `closeButton`, `loading`, `tryAgainButton` |
| Errors | `errorProgramDisabled`, `errorAffiliateLimitReached`, `errorInvalidCode`, `errorTooManyCodes`, `errorRateLimited`, `errorInvalidEmail`, `errorNetwork`, `errorServer` |

`headline` and `rewardText` are not in `strings`: they come from the dashboard and are overridden with their own options. The full type is exported as `ReferralStrings`.

**Build your own screen:**

You can skip the modal and use the methods directly. In the order an app calls them:

1. `getReferralProgramConfig()` to check the program is on (`enabled`) and to read the dashboard copy, colour and `companyName`.
2. `isUserAnAffiliate()` to see whether this browser is already connected (no network call).
3. `createAffiliateForUser(email, name, options?)` to join. `status` is `created` (connected, `affiliate` holds the code and link), `verificationRequired` (a 6-digit code was emailed) or `error`.
4. `verifyAffiliateCode(email, code, name?, options?)` for the code step. Call `createAffiliateForUser` again to send a new code.
5. `getMyAffiliateDetails()` for the code, link, `referralCount`, `totalEarned`, `currency`, `rewardsGranted`, `premiumUntil`, `rewardCodes` (each with `code`, `store` and `redeemUrl`) and `dashboardUrl`.
6. `setReferrerAccount({ appUserId, playPurchaseToken })` when the user subscribes or logs in after joining.
7. `shareReferralLink(message?)` from a click handler, or build your own text from `details.affiliateShortCode` and `details.deeplinkurl`.
8. `signOutAffiliate()` on logout.

States to handle:

| State | How you know | What to show |
|-------|--------------|--------------|
| Program off | `config.enabled === false` | Hide the entry point |
| Not enrolled | `isUserAnAffiliate()` is false | Your email and name form |
| Code needed | `status === 'verificationRequired'` | A 6-digit code field, with resend and "use a different email" |
| Enrolled | `getMyAffiliateDetails()` returns details | The code and link with copy and share, plus the stats |
| Rewards | `premiumUntil` in the future, or `rewardCodes` is not empty | The premium line, and each code with a link to `redeemUrl` |
| Errors | `result.status === 'error'`, then `result.errorCode` | Your own wording per code |
| Disconnected | `getMyAffiliateDetails()` returns `null` while `isUserAnAffiliate()` is false | Back to the join form |

`getMyAffiliateDetails()` returns `null` both when the browser is not connected and when the request failed. Check `isUserAnAffiliate()` afterwards to tell them apart: still `true` means the request failed and is worth retrying.

```javascript
// 1. Make the user a referrer
const result = await InsertAffiliate.createAffiliateForUser('jane@example.com', 'Jane');

if (result.status === 'verificationRequired') {
  // The email is already an affiliate: we emailed a 6-digit code
  const code = prompt('Enter the code we emailed you');
  const verified = await InsertAffiliate.verifyAffiliateCode('jane@example.com', code);
  if (verified.status === 'error') alert(verified.errorMessage);
} else if (result.status === 'error') {
  console.log(result.errorCode, result.errorMessage); // e.g. PROGRAM_DISABLED
}

// 2. Read their stats, and load the program config (the app name used in the share text)
const [details] = await Promise.all([
  InsertAffiliate.getMyAffiliateDetails(),
  InsertAffiliate.getReferralProgramConfig(),
]);
if (details) {
  console.log(details.affiliateShortCode, details.deeplinkurl);
  console.log(`${details.referralCount} referrals, ${details.totalEarned} ${details.currency} earned`);
  console.log(`${details.rewardsGranted} rewards, premium until ${details.premiumUntil}`);
  details.rewardCodes.forEach((reward) => console.log(reward.code, reward.redeemUrl));
}

// 3. Share (call from a click handler, after step 2 has loaded the details)
await InsertAffiliate.shareReferralLink(); // 'shared' | 'copied' | 'cancelled' | 'failed'

// On logout
await InsertAffiliate.signOutAffiliate();
```

- `createAffiliateForUser` creates a new affiliate and connects this browser straight away. If the email is already an affiliate it never connects on the email alone: it emails a 6-digit code and returns `verificationRequired`.
- Connecting stores a private token in `localStorage`, one per company. `isUserAnAffiliate()` checks for it without a network call. `signOutAffiliate()` removes it; the affiliate account is kept.
- If the token stops working (for example the affiliate was removed), `getMyAffiliateDetails()` clears it and returns `null`.
- `referralCount` is the count for the trigger you chose in the dashboard (install, event or purchase). It only ever goes up.
- Sharing uses the browser share sheet (`navigator.share`), or copies the text to the clipboard where that is not available. Browsers only allow either shortly after the tap, so `shareReferralLink()` never waits on the network: it uses the details and config already loaded by `getMyAffiliateDetails()` and `getReferralProgramConfig()`, and returns `'failed'` if the details are not loaded yet. Default text: `Try {companyName}: {link}`, or `Use my code {code} in {companyName}` when you use Short Code Only.
- Error codes: `INVALID_EMAIL`, `INVALID_CODE`, `PROGRAM_DISABLED`, `AFFILIATE_LIMIT_REACHED`, `TOO_MANY_CODES`, `RATE_LIMITED`, `COMPANY_NOT_FOUND`, `NETWORK_ERROR`, `NOT_INITIALIZED`.

**Automatic referrer rewards:** when you set up referrer rewards in the dashboard (RevenueCat, Adapty, App Store offer codes or Google Play), pass the user's own accounts so the reward can be granted to them:

```javascript
// When they join
await InsertAffiliate.createAffiliateForUser('jane@example.com', 'Jane', {
  appUserId: 'RevenueCat or Adapty app user id',
  playPurchaseToken: 'their own Google Play purchase token', // Android apps only
});
// verifyAffiliateCode(email, code, name, options) takes the same options

// Or later, if they subscribe or log in after joining
const saved = await InsertAffiliate.setReferrerAccount({ appUserId: 'rc_user_123' });
```

- `setReferrerAccount` needs a connected referrer on this browser and returns `false` otherwise. Any rewards that were waiting for these accounts are granted once they are saved.
- The SDK also sends this browser's device id (the same one in `returnInsertAffiliateIdentifier()`), so a referrer who uses their own link is not counted as their own referral.
- `rewardCodes` are App Store offer codes or Google Play promo codes, newest first, each with a `redeemUrl` and a `store` (`app_store` or `google_play`). `premiumUntil` is an ISO date or `null`.

**Rewarding referrers yourself:** values read on the device are for display. A modified browser can show anything, so grant anything valuable (credits, premium time) from your server using the `referral.created` webhook or the Public API. The webhook includes a running `referral_count`, so rewarding up to that number is safe to repeat.

**Store rules:** the SDK only uses the share sheet and never asks for contacts. Never lock features behind sharing, and never reward ratings or reviews.

</details>

### Prevent Affiliate Transfer

By default, clicking a new affiliate link will overwrite any existing attribution. Enable `preventAffiliateTransfer` to lock the first affiliate:

```javascript
await InsertAffiliate.initialize(
  "YOUR_COMPANY_CODE",
  false,   // verboseLogging
  604800,  // 7-day attribution timeout
  true     // preventAffiliateTransfer - locks first affiliate
);
```

**How it works:**
- When enabled, once a user is attributed to an affiliate, that attribution is locked
- New affiliate links will not overwrite the existing attribution
- The callback still fires with the existing affiliate data (not the new one)
- Useful for preventing "affiliate stealing" where users click competitor links

Learn more: [Prevent Affiliate Transfer Documentation](https://docs.insertaffiliate.com/prevent-affiliate-transfer)

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

### In-App Referral Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `createAffiliateForUser(email, name, options?)` | Make the app user a referrer, or email a code if they already are one | `Promise<AffiliateEnrolmentResult>` |
| `verifyAffiliateCode(email, code, name?, options?)` | Finish connecting with the emailed 6-digit code | `Promise<AffiliateEnrolmentResult>` |
| `setReferrerAccount(options)` | Save the referrer's app user id or Play purchase token after joining | `Promise<boolean>` |
| `getMyAffiliateDetails()` | Connected referrer's details and stats | `Promise<MyAffiliateDetails \| null>` |
| `isUserAnAffiliate()` | Whether a referrer is connected on this device (no network) | `Promise<boolean>` |
| `signOutAffiliate()` | Disconnect the referrer from this device | `Promise<void>` |
| `getReferralProgramConfig()` | Program on/off plus dashboard copy and colour | `Promise<ReferralProgramConfig \| null>` |
| `shareReferralLink(message?)` | Share sheet, or copy to clipboard | `Promise<ReferralShareOutcome>` |
| `showReferAFriend(options?)` | Show the drop-in modal | `ReferAFriendHandle` |

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

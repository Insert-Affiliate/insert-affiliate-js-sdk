# Changelog

All notable changes to the Insert Affiliate JavaScript SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0]

### Added
- **Refer a friend modal** - Follows the dashboard's display settings
  - `ReferralProgramConfig.showCode`: when false the modal hides the short code box (the link keeps its Copy button), unless there is no web link to share, when the code still shows. Defaults to true for older servers
  - `MyAffiliateDetails.rewardDaysEarned` and `earnedDisplay` (`{ cash, days }`): the stats strip shows Referrals, then Earned only when `cash`, then a new "Days earned" stat only when `days`. Older servers show Referrals and Earned only
  - New `ReferralStrings` keys: `daysEarnedLabel`, `dayUnitOne` and `dayUnitOther` (both use `{count}`)
  - Exported type: `ReferralEarnedDisplay`

## [1.5.1]

### Changed
- npm metadata: real package description (was README badge markdown), homepage set to https://insertaffiliate.com, issues link added.

### Added
- **In-app referrals** - Turn app users into affiliates and show them a "Refer a friend" screen
  - `createAffiliateForUser()`, `verifyAffiliateCode()`, `getMyAffiliateDetails()`, `isUserAnAffiliate()`, `signOutAffiliate()`, `getReferralProgramConfig()`, `shareReferralLink()`
  - `showReferAFriend()` drop-in web modal (no dependencies, accessible, themeable)
  - Exported types: `AffiliateEnrolmentResult`, `MyAffiliateDetails`, `ReferralProgramConfig`, `ReferAFriendOptions`, `ReferAFriendHandle` and related
- **Referrer rewards** - Let the server grant rewards to referrers automatically
  - `createAffiliateForUser()` and `verifyAffiliateCode()` take optional `{ appUserId, playPurchaseToken }` and send this browser's device id
  - `setReferrerAccount()` saves those accounts after joining, so waiting rewards are granted
  - `MyAffiliateDetails` adds `rewardsGranted`, `premiumUntil` and `rewardCodes`
  - `showReferAFriend()` takes optional `appUserId` and `playPurchaseToken` and passes them on, so modal-only apps need no extra call
  - The modal shows "Free premium until {date}" and a "Your rewards" list with a Redeem button per App Store offer code or Google Play promo code; each `ReferralRewardCode` has a `store`
  - Exported types: `ReferrerAccountOptions`, `ReferralRewardCode`
- **Modal text overrides** - `showReferAFriend({ strings })` replaces any label in the modal, so a site can translate or reword it
  - Every key is optional: a missing, blank or unknown key keeps the English default, so nothing changes for apps that do not pass `strings`
  - `codeSentNotice` keeps `{email}` and `premiumUntil` keeps `{date}`
  - Exported type: `ReferralStrings`

## [1.3.1] - 2026-03-29

### Fixed
- **Offer code sanitization** - Fixed offer codes with dashes/underscores being stripped (e.g. `pro-v3-ext` was incorrectly becoming `prov3ext`)
  - Now checks for API error responses before cleaning the offer code
  - Sanitization regex updated to preserve dashes and underscores

## [1.1.0] - 2025-11-23

### Added
- **New `getAffiliateDetails()` method** - Retrieve affiliate information without setting the identifier
  - Returns `Promise<AffiliateDetails | null>` with affiliateName, affiliateShortCode, and deeplinkUrl
  - Useful for displaying affiliate info or showing personalized content based on referrer
  - Automatically strips UUIDs from codes
  - Works with both short codes and deep link URLs

- **New `AffiliateDetails` interface** - Exported interface for affiliate information
  - Contains affiliateName, affiliateShortCode, and deeplinkUrl properties

### Changed
- **BREAKING: `setShortCode()` now returns validation result** - Method signature changed from `Promise<void>` to `Promise<boolean>`
  - Validates short codes against the Insert Affiliate API before storing
  - Returns `true` if code is valid and stored, `false` otherwise
  - Provides immediate feedback for user-facing validation
  - Console logs success message with affiliate name when validation succeeds

### Fixed
- **Offer Code API** - Fixed `fetchAndConditionallyOpenUrl()` to properly include company code in API requests
  - URL now correctly formatted as: `/v1/affiliateReturnOfferCode/{companyCode}/{affiliateLink}`
  - Ensures offer codes are properly retrieved from the API

### Documentation
- Added comprehensive README documentation for `getAffiliateDetails()`
- Updated `setShortCode()` documentation with validation examples
- Added JavaScript/TypeScript code examples showing async/await patterns with alerts
- Updated API reference section with new method signatures

## [1.0.2] - 2024-11-22

### Fixed
- Various bug fixes and improvements

## [1.0.1] - 2024-11-02

### Fixed
- Initial release fixes

## [1.0.0] - 2024-03-25

### Added
- Initial release of Insert Affiliate JavaScript SDK
- Affiliate tracking and attribution
- Short code support
- Deep linking integration
- Event tracking
- Offer codes support
- Attribution timeout functionality
- URL parameter detection (`insertAffiliate`)
- Stripe integration support
- Iaptic purchase validation

# Changelog

All notable changes to the Insert Affiliate JavaScript SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

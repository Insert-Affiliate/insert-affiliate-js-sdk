// src/referrals/referralTypes.ts
// Types for in-app referrals: turning an app's own user into an affiliate,
// reading their referral stats and presenting the "Refer a friend" modal.

/** What the company counts as a referral (set in the Insert Affiliate portal). */
export type ReferralTrigger = 'install' | 'event' | 'purchase';

/** The referrer's own affiliate record, as returned by enrol and verify. */
export interface ReferrerAffiliate {
  affiliateName: string;
  affiliateShortCode: string;
  /** The link to share. For Short Code Only companies this is the short code itself; empty when no link is assigned yet. */
  deeplinkurl: string;
}

/** The referrer's affiliate record plus referral stats. Values are for display only. */
export interface MyAffiliateDetails extends ReferrerAffiliate {
  referralTrigger: ReferralTrigger;
  /** The count for the company's configured trigger. Only ever goes up. */
  referralCount: number;
  installCount: number;
  eventCount: number;
  purchaseCount: number;
  totalEarned: number;
  totalPaid: number;
  totalUnpaid: number;
  currency: string;
  dashboardUrl: string;
}

/** Program on/off plus the drop-in UI copy and colour configured in the portal. */
export interface ReferralProgramConfig {
  enabled: boolean;
  companyName: string;
  referralTrigger: ReferralTrigger;
  headline: string;
  rewardText: string;
  /** `#RRGGBB`, or empty when the company has not set one. */
  primaryColor: string;
}

export type AffiliateEnrolmentStatus = 'created' | 'connected' | 'verificationRequired' | 'error';

/**
 * Server error codes, plus two raised by the SDK itself:
 * `NETWORK_ERROR` (request failed or the response was unreadable) and
 * `NOT_INITIALIZED` (no company code; call `initialize` first).
 */
export type ReferralErrorCode =
  | 'INVALID_EMAIL'
  | 'INVALID_COMPANY_ID'
  | 'INVALID_CODE'
  | 'PROGRAM_DISABLED'
  | 'AFFILIATE_LIMIT_REACHED'
  | 'COMPANY_NOT_FOUND'
  | 'TOO_MANY_CODES'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'NOT_INITIALIZED'
  | (string & {});

export interface AffiliateEnrolmentResult {
  status: AffiliateEnrolmentStatus;
  affiliate?: ReferrerAffiliate;
  errorCode?: ReferralErrorCode;
  errorMessage?: string;
}

/** How a share ended: the share sheet completed, the text was copied instead, the user dismissed the sheet, or neither was possible. */
export type ReferralShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

export interface ReferAFriendOptions {
  /** Prefills the email field (usually the app's logged-in user). */
  email?: string;
  /** Prefills the name field. */
  name?: string;
  /** Share message. May use `{link}` and `{code}` placeholders. */
  shareMessage?: string;
  /** Overrides the portal colour. Any CSS colour. */
  primaryColor?: string;
  /** Overrides the portal headline. */
  headline?: string;
  /** Overrides the portal reward text. */
  rewardText?: string;
  /** CSS font-family for the modal. Defaults to the system font stack. */
  fontFamily?: string;
  /** Corner radius of the modal and its controls, in pixels. Defaults to 12. */
  cornerRadius?: number;
  /** Called once after the modal closes, however it was closed. */
  onClose?: () => void;
}

export interface ReferAFriendHandle {
  /** Closes the modal. Safe to call more than once. */
  close(): void;
}

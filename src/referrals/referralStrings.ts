// src/referrals/referralStrings.ts
// The English text the "Refer a friend" modal shows, and the merge that lets
// an app translate or reword any of it. Headline and reward text are not here:
// they come from the portal and from the modal's own options.
import type { ReferralStrings } from './referralTypes';

export const DEFAULT_REFERRAL_STRINGS: ReferralStrings = {
  // Joining
  emailLabel: 'Email',
  nameLabel: 'Name',
  joinButton: 'Get my link',
  joiningButton: 'Please wait...',

  // Email code step
  codeLabel: 'Code',
  codeSentNotice: 'We sent a 6-digit code to {email}. Enter it below to connect this device.',
  verifyButton: 'Verify',
  verifyingButton: 'Verifying...',
  resendButton: 'Send a new code',
  sendingNotice: 'Sending...',
  codeResentNotice: 'We sent a new code.',
  differentEmailButton: 'Use a different email',
  errorCodeLength: 'Enter the 6-digit code from the email.',

  // Joined
  copyCodeButton: 'Copy code',
  copyLinkButton: 'Copy link',
  copiedNotice: 'Copied',
  copyFailedNotice: 'Could not copy. Select the text to copy it.',
  shareButton: 'Share',
  shareFailedNotice: 'Could not share. Copy your code instead.',
  referralsLabel: 'Referrals',
  earnedLabel: 'Earned',
  premiumUntil: 'Free premium until {date}',
  rewardsHeading: 'Your rewards',
  redeemButton: 'Redeem',
  dashboardLink: 'Open my dashboard',

  // Frame and states
  closeButton: 'Close',
  loading: 'Loading...',
  tryAgainButton: 'Try again',

  // Errors, by the server's error code
  errorProgramDisabled: 'Referrals are not available in this app right now.',
  errorAffiliateLimitReached: 'The referral program is full right now. Please try again later.',
  errorInvalidCode: 'That code is wrong or has expired. Check it or send a new code.',
  errorTooManyCodes: 'Too many codes have been sent. Please wait a while and try again.',
  errorRateLimited: 'Too many attempts. Please try again later.',
  errorInvalidEmail: 'Please enter a valid email address.',
  errorNetwork: 'Could not connect. Check your connection and try again.',
  errorServer: 'Something went wrong. Please try again.',
};

/** The error string for a server error code, or the generic one. */
export const ERROR_STRING_KEYS: Record<string, keyof ReferralStrings> = {
  PROGRAM_DISABLED: 'errorProgramDisabled',
  AFFILIATE_LIMIT_REACHED: 'errorAffiliateLimitReached',
  INVALID_CODE: 'errorInvalidCode',
  TOO_MANY_CODES: 'errorTooManyCodes',
  RATE_LIMITED: 'errorRateLimited',
  INVALID_EMAIL: 'errorInvalidEmail',
  NETWORK_ERROR: 'errorNetwork',
};

/**
 * The app's overrides on top of the English defaults. A missing, blank or
 * non-string value keeps the default, and an unknown key is ignored.
 */
export const resolveReferralStrings = (overrides?: Partial<ReferralStrings>): ReferralStrings => {
  const resolved: ReferralStrings = { ...DEFAULT_REFERRAL_STRINGS };
  if (!overrides) return resolved;
  (Object.keys(DEFAULT_REFERRAL_STRINGS) as (keyof ReferralStrings)[]).forEach((key) => {
    const value = overrides[key];
    if (typeof value === 'string' && value.trim()) resolved[key] = value;
  });
  return resolved;
};

/** Fills `{name}` placeholders, leaving any the app did not use alone. */
export const fillPlaceholders = (text: string, values: Record<string, string>): string =>
  Object.keys(values).reduce(
    (out, name) => out.split(`{${name}}`).join(values[name]),
    text
  );

// src/referrals/referrerTokenStore.ts
// The device token that lets this browser read its own referrer's stats.
// One token per company ID in localStorage. Storage can be unavailable
// (private mode, blocked site data), so every access is guarded; when it
// throws, the token lives in memory for this page load only. The token is
// never logged.

const KEY_PREFIX = 'insertAffiliateReferrerToken_';
const memoryTokens: Record<string, string> = {};

const keyFor = (companyId: string): string => `${KEY_PREFIX}${companyId}`;

export const readReferrerToken = (companyId: string): string | null => {
  try {
    return localStorage.getItem(keyFor(companyId)) || null;
  } catch {
    return memoryTokens[companyId] || null;
  }
};

/** Returns false when only the in-memory copy could be kept. */
export const saveReferrerToken = (companyId: string, token: string): boolean => {
  try {
    localStorage.setItem(keyFor(companyId), token);
    return true;
  } catch {
    memoryTokens[companyId] = token;
    return false;
  }
};

export const clearReferrerToken = (companyId: string): void => {
  delete memoryTokens[companyId];
  try {
    localStorage.removeItem(keyFor(companyId));
  } catch {
    // Nothing stored that we can reach.
  }
};

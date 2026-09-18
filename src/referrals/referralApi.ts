// src/referrals/referralApi.ts
// HTTP calls and response parsing for the /V1/sdk/affiliate endpoints.
// The parsers are pure so they can be checked without a network.
import type {
  AffiliateEnrolmentResult,
  MyAffiliateDetails,
  ReferralProgramConfig,
  ReferralShareOutcome,
  ReferralTrigger,
  ReferrerAffiliate,
} from './referralTypes';
import { clearReferrerToken, saveReferrerToken } from './referrerTokenStore';

const BASE_URL = 'https://api.insertaffiliate.com/V1/sdk/affiliate';
const TOKEN_HEADER = 'X-Insert-Affiliate-Token';
const PLATFORM = 'web';
const TRIGGERS: ReferralTrigger[] = ['install', 'event', 'purchase'];

export type ReferralLog = (message: string) => void;

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

const str = (value: unknown): string => (typeof value === 'string' ? value : '');

const num = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const trigger = (value: unknown): ReferralTrigger =>
  TRIGGERS.includes(value as ReferralTrigger) ? (value as ReferralTrigger) : 'purchase';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const parseReferrerAffiliate = (raw: unknown): ReferrerAffiliate => {
  const data = isObject(raw) ? raw : {};
  return {
    affiliateName: str(data.affiliateName),
    affiliateShortCode: str(data.affiliateShortCode),
    deeplinkurl: str(data.deeplinkurl),
  };
};

export const parseMyAffiliateDetails = (raw: unknown): MyAffiliateDetails => {
  const data = isObject(raw) ? raw : {};
  return {
    ...parseReferrerAffiliate(data),
    referralTrigger: trigger(data.referralTrigger),
    referralCount: num(data.referralCount),
    installCount: num(data.installCount),
    eventCount: num(data.eventCount),
    purchaseCount: num(data.purchaseCount),
    totalEarned: num(data.totalEarned),
    totalPaid: num(data.totalPaid),
    totalUnpaid: num(data.totalUnpaid),
    currency: str(data.currency) || 'USD',
    dashboardUrl: str(data.dashboardUrl),
  };
};

export const parseReferralProgramConfig = (raw: unknown): ReferralProgramConfig => {
  const data = isObject(raw) ? raw : {};
  const color = str(data.primaryColor);
  return {
    enabled: data.enabled === true,
    companyName: str(data.companyName),
    referralTrigger: trigger(data.referralTrigger),
    headline: str(data.headline),
    rewardText: str(data.rewardText),
    primaryColor: /^#[0-9a-fA-F]{6}$/.test(color) ? color : '',
  };
};

const errorResult = (code: string, message: string): AffiliateEnrolmentResult => ({
  status: 'error',
  errorCode: code,
  errorMessage: message,
});

/**
 * Turns an enrol or verify response into a result. A token is only returned
 * alongside `created` or `connected`; the caller stores it.
 */
export const parseEnrolmentResponse = (
  httpStatus: number,
  body: unknown
): { result: AffiliateEnrolmentResult; token: string | null } => {
  const data = isObject(body) ? body : {};

  if (httpStatus < 200 || httpStatus >= 300) {
    return {
      result: errorResult(
        str(data.code) || `HTTP_${httpStatus}`,
        str(data.error) || `Request failed with status ${httpStatus}.`
      ),
      token: null,
    };
  }

  if (data.status === 'verificationRequired') {
    return { result: { status: 'verificationRequired' }, token: null };
  }

  const token = str(data.token);
  if ((data.status === 'created' || data.status === 'connected') && token) {
    return {
      result: { status: data.status, affiliate: parseReferrerAffiliate(data.affiliate) },
      token,
    };
  }

  return { result: errorResult('NETWORK_ERROR', 'Unexpected response from the server.'), token: null };
};

// ---------------------------------------------------------------------------
// Share text
// ---------------------------------------------------------------------------

/**
 * The text to share. A real link shares "<message> <link>" (default message
 * "Try {companyName}:"). Short Code Only companies (the "link" is the code
 * itself) share "Use my code {code} in {companyName}". An app message that
 * contains `{link}` or `{code}` is used as is with those filled in.
 * Returns an empty string when there is nothing to share.
 */
export const buildReferralShareText = (
  affiliate: Pick<ReferrerAffiliate, 'affiliateShortCode' | 'deeplinkurl'>,
  companyName: string,
  message?: string
): string => {
  const code = affiliate.affiliateShortCode || '';
  const hasLink = /^http/i.test(affiliate.deeplinkurl || '');
  const link = hasLink ? affiliate.deeplinkurl : code;
  const appName = companyName || 'the app';
  const custom = (message || '').trim();

  if (!link) return '';

  if (custom && /\{link\}|\{code\}/.test(custom)) {
    return custom.replace(/\{link\}/g, link).replace(/\{code\}/g, code);
  }
  if (hasLink) {
    return `${custom || `Try ${companyName || 'this app'}:`} ${link}`;
  }
  return custom ? `${custom} ${code}` : `Use my code ${code} in ${appName}`;
};

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const networkError = (): AffiliateEnrolmentResult =>
  errorResult('NETWORK_ERROR', 'Could not reach Insert Affiliate. Check the connection and try again.');

/** GET /config/{companyId}. Null when the request fails. */
export const fetchReferralProgramConfig = async (
  companyId: string,
  log: ReferralLog
): Promise<ReferralProgramConfig | null> => {
  const url = `${BASE_URL}/config/${encodeURIComponent(companyId)}`;
  log(`Making API call to: ${url}`);
  try {
    const response = await fetch(url);
    log(`Referral config response status: ${response.status}`);
    if (!response.ok) return null;
    return parseReferralProgramConfig(await readJson(response));
  } catch (error) {
    log(`Error fetching referral config: ${error}`);
    return null;
  }
};

/** POST /enrol or /verify, storing the token on success. Never logs the body (it holds the token). */
export const postEnrolment = async (
  path: 'enrol' | 'verify',
  companyId: string,
  payload: Record<string, string>,
  log: ReferralLog
): Promise<AffiliateEnrolmentResult> => {
  const url = `${BASE_URL}/${path}`;
  log(`Making API call to: ${url}`);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, platform: PLATFORM, ...payload }),
    });
    log(`Referral ${path} response status: ${response.status}`);

    const { result, token } = parseEnrolmentResponse(response.status, await readJson(response));
    if (token && !saveReferrerToken(companyId, token)) {
      log('localStorage unavailable; referrer token kept for this page load only');
    }
    log(`Referral ${path} result: ${result.status}${result.errorCode ? ` (${result.errorCode})` : ''}`);
    return result;
  } catch (error) {
    log(`Network error during referral ${path}: ${error}`);
    return networkError();
  }
};

export type MyDetailsFetch =
  | { kind: 'ok'; details: MyAffiliateDetails }
  | { kind: 'signedOut' }
  | { kind: 'failed' };

/**
 * GET /me with the device token. A 401 or 404 means the token no longer
 * works, so it is cleared and the user counts as signed out.
 */
export const fetchMyAffiliateDetails = async (
  companyId: string,
  token: string,
  log: ReferralLog
): Promise<MyDetailsFetch> => {
  const url = `${BASE_URL}/me`;
  log(`Making API call to: ${url}`);
  try {
    const response = await fetch(url, { headers: { [TOKEN_HEADER]: token } });
    log(`Referral details response status: ${response.status}`);

    if (response.status === 401 || response.status === 404) {
      clearReferrerToken(companyId);
      log('Referrer token no longer valid; cleared');
      return { kind: 'signedOut' };
    }
    if (!response.ok) return { kind: 'failed' };

    const body = await readJson(response);
    if (!isObject(body)) return { kind: 'failed' };
    return { kind: 'ok', details: parseMyAffiliateDetails(body) };
  } catch (error) {
    log(`Error fetching referral details: ${error}`);
    return { kind: 'failed' };
  }
};

// ---------------------------------------------------------------------------
// Sharing (browser)
// ---------------------------------------------------------------------------

export const copyText = async (text: string): Promise<boolean> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Clipboard blocked (no permission or no user gesture).
  }
  return false;
};

/**
 * Opens the system share sheet, or copies the text when sharing is not
 * available. Only the share sheet is used: no contacts access.
 */
export const shareText = async (text: string): Promise<ReferralShareOutcome> => {
  if (!text) return 'failed';
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (error) {
      if (error && (error as { name?: string }).name === 'AbortError') return 'cancelled';
      // Share sheet refused (for example no user gesture); fall back to copying.
    }
  }
  return (await copyText(text)) ? 'copied' : 'failed';
};

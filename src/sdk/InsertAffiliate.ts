// src/sdk/InsertAffiliate.ts
import { getValue, saveValue } from '../utils/asyncStorage';
import { generateUUID, generateShortDeviceID } from '../utils/helpers';

interface IapticAndroidReceipt {
  orderId: string;
  purchaseToken: string;
  signature: string;
}

interface IapticIOSReceipt {
  transactionReceipt: string;
}

interface ExpectedTransactionPayload {
  UUID: string;
  companyCode: string;
  shortCode: string;
  storedDate: string;
}

export type InsertAffiliateIdentifierChangeCallback = (identifier: string | null) => void;

export class InsertAffiliate {
  private static isInitialized: boolean = false;
  private static companyCode: string | null = null;
  private static verboseLogging: boolean = false;
  private static insertAffiliateIdentifierChangeCallback: InsertAffiliateIdentifierChangeCallback | null = null;
  private static affiliateAttributionActiveTime: number | null = null; // in milliseconds
  private static offerCode: string | null = null;

  private static verboseLog(message: string): void {
    if (this.verboseLogging) {
      console.log(`[Insert Affiliate] [VERBOSE] ${message}`);
    }
  }

  static async initialize(code: string | null, verboseLogging: boolean = false, affiliateAttributionActiveTime?: number): Promise<void> {
    this.verboseLogging = verboseLogging;

    if (verboseLogging) {
      this.verboseLog('Starting SDK initialization...');
      this.verboseLog(`Company code provided: ${code ? 'Yes' : 'No'}`);
      this.verboseLog('Verbose logging enabled');
    }

    if (this.isInitialized) {
      this.verboseLog('SDK already initialized, skipping');
      return;
    }
    this.companyCode = code;
    await saveValue('companyCode', code || '');

    // Set attribution timeout if provided
    if (affiliateAttributionActiveTime !== undefined) {
      this.affiliateAttributionActiveTime = affiliateAttributionActiveTime;
      await saveValue('affiliateAttributionActiveTime', affiliateAttributionActiveTime.toString());
      this.verboseLog(`Attribution timeout set to: ${affiliateAttributionActiveTime}ms`);
    }

    this.isInitialized = true;
    this.verboseLog(`SDK initialized ${code ? `with company code: ${code}` : 'without a company code.'}`);
    this.verboseLog('Company code saved to storage');
    this.verboseLog('SDK marked as initialized');
  }

  static async returnInsertAffiliateIdentifier(ignoreTimeout: boolean = false): Promise<string | null> {
    this.verboseLog('Getting insert affiliate identifier...');
    const userId = await this.getOrCreateUserID();
    const referrerLink = await getValue('referrerLink');
    this.verboseLog(`User ID: ${userId || 'empty'}, Referrer link: ${referrerLink || 'empty'}`);

    if (!referrerLink) {
      this.verboseLog('No referrer link found, returning null');
      return null;
    }

    // Check attribution timeout unless explicitly ignored
    if (!ignoreTimeout) {
      const isValid = await this.isAffiliateAttributionValid();
      if (!isValid) {
        this.verboseLog('Attribution has expired, returning null');
        return null;
      }
    } else {
      this.verboseLog('Ignoring attribution timeout');
    }

    const identifier = `${referrerLink}-${userId}`;
    this.verboseLog(`Returning affiliate identifier: ${identifier}`);
    return identifier;
  }

  static async setInsertAffiliateIdentifier(referringLink: string): Promise<string | null> {
    this.verboseLog(`Setting affiliate identifier. Input referringLink: ${referringLink}`);

    const userId = await this.getOrCreateUserID();
    this.verboseLog(`User ID: ${userId}`);

    // Check if it's already a short code
    const isShortCode = /^[a-zA-Z0-9]{3,25}$/.test(referringLink);
    this.verboseLog(`Is short code: ${isShortCode}`);

    const shortCode = isShortCode
      ? referringLink
      : await this.fetchShortLink(referringLink);

    if (!shortCode) {
      this.verboseLog('No short code found or generated, returning null');
      return null;
    }

    // Check if the same short code is already stored
    const existingShortCode = await getValue('referrerLink');
    if (existingShortCode === shortCode) {
      this.verboseLog(`Short code ${shortCode} is already set, not updating attribution date`);
      const identifier = `${shortCode}-${userId}`;
      this.verboseLog(`Returning existing identifier: ${identifier}`);
      return identifier;
    }

    this.verboseLog(`Saving short code to storage: ${shortCode}`);
    await saveValue('referrerLink', shortCode);

    // Store the attribution date
    const storedDate = new Date().toISOString();
    await saveValue('affiliateStoredDate', storedDate);
    this.verboseLog(`Short code saved successfully with stored date: ${storedDate}`);

    const identifier = `${shortCode}-${userId}`;
    this.verboseLog(`Returning identifier: ${identifier}`);

    // Auto-fetch and store offer code (use just the short code, not the full identifier)
    await this.fetchAndStoreOfferCode(shortCode);

    // Trigger callback if one is registered
    if (this.insertAffiliateIdentifierChangeCallback) {
      this.verboseLog(`Triggering callback with identifier: ${identifier}`);
      this.insertAffiliateIdentifierChangeCallback(identifier);
    }

    return identifier;
  }

  static async setShortCode(shortCode: string): Promise<void> {
    this.verboseLog(`Setting short code. Input: ${shortCode}`);

    const valid = /^[a-zA-Z0-9]{3,25}$/.test(shortCode);
    this.verboseLog(`Short code validation: ${valid ? 'Valid' : 'Invalid'}`);

    if (!valid) {
      this.verboseLog('Invalid short code, aborting');
      return;
    }

    this.verboseLog('Calling setInsertAffiliateIdentifier with short code');
    await this.setInsertAffiliateIdentifier(shortCode);
  }

  static setInsertAffiliateIdentifierChangeCallback(callback: InsertAffiliateIdentifierChangeCallback | null): void {
    this.verboseLog(`Setting affiliate identifier change callback: ${callback ? 'callback provided' : 'callback cleared'}`);
    this.insertAffiliateIdentifierChangeCallback = callback;
  }

  static async isAffiliateAttributionValid(): Promise<boolean> {
    this.verboseLog('Checking if affiliate attribution is valid...');

    const storedDateStr = await getValue('affiliateStoredDate');
    if (!storedDateStr) {
      this.verboseLog('No stored date found, attribution invalid');
      return false;
    }

    // Get timeout value from storage or class property
    let timeoutMs = this.affiliateAttributionActiveTime;
    if (timeoutMs === null) {
      const storedTimeout = await getValue('affiliateAttributionActiveTime');
      timeoutMs = storedTimeout ? parseInt(storedTimeout, 10) : null;
    }

    // If no timeout is set, attribution never expires
    if (timeoutMs === null) {
      this.verboseLog('No attribution timeout configured, attribution is valid');
      return true;
    }

    const storedDate = new Date(storedDateStr);
    const currentDate = new Date();
    const elapsedMs = currentDate.getTime() - storedDate.getTime();

    const isValid = elapsedMs <= timeoutMs;
    this.verboseLog(`Attribution stored: ${storedDateStr}, elapsed: ${elapsedMs}ms, timeout: ${timeoutMs}ms, valid: ${isValid}`);

    return isValid;
  }

  static async getAffiliateStoredDate(): Promise<string | null> {
    this.verboseLog('Getting affiliate stored date...');
    const storedDate = await getValue('affiliateStoredDate');
    this.verboseLog(`Stored date: ${storedDate || 'none'}`);
    return storedDate;
  }

  static async getOfferCode(): Promise<string | null> {
    this.verboseLog('Getting offer code...');

    // Return cached offer code if available
    if (this.offerCode) {
      this.verboseLog(`Returning cached offer code: ${this.offerCode}`);
      return this.offerCode;
    }

    // Try to get from storage
    const storedOfferCode = await getValue('offerCode');
    if (storedOfferCode) {
      this.verboseLog(`Returning stored offer code: ${storedOfferCode}`);
      this.offerCode = storedOfferCode;
      return storedOfferCode;
    }

    this.verboseLog('No offer code found');
    return null;
  }

  private static async fetchAndStoreOfferCode(shortCode: string): Promise<void> {
    this.verboseLog(`Fetching offer code for short code: ${shortCode}`);

    try {
      // Get company code
      const companyCode = this.companyCode || await getValue('companyCode');
      if (!companyCode) {
        this.verboseLog('Cannot fetch offer code: no company code available');
        return;
      }

      // Use the more efficient endpoint with company code and just the short code
      const encoded = encodeURIComponent(shortCode);
      const url = `https://api.insertaffiliate.com/v1/affiliateReturnOfferCode/${companyCode}/${encoded}`;
      this.verboseLog(`Making API call to: ${url}`);

      const response = await fetch(url);
      this.verboseLog(`API response status: ${response.status}`);

      if (!response.ok) {
        this.verboseLog(`Failed to fetch offer code, status: ${response.status}`);
        return;
      }

      const offerCode = (await response.text()).replace(/[^a-zA-Z0-9]/g, '');
      this.verboseLog(`Received offer code: ${offerCode}`);

      // Check for error codes
      const errorCodes = [
        'errorofferCodeNotFound',
        'errorAffiliateoffercodenotfoundinanycompany',
        'errorAffiliateoffercodenotfoundinanycompanyAffiliatelinkwas',
        'Routenotfound'
      ];

      if (errorCodes.includes(offerCode)) {
        this.verboseLog('Offer code not found or invalid');
        return;
      }

      // Store offer code
      this.offerCode = offerCode;
      await saveValue('offerCode', offerCode);
      this.verboseLog(`Offer code stored successfully: ${offerCode}`);
    } catch (error) {
      this.verboseLog(`Error fetching offer code: ${error}`);
    }
  }

  static async trackEvent(eventName: string): Promise<void> {
    this.verboseLog(`Tracking event: ${eventName}`);

    const id = await this.returnInsertAffiliateIdentifier();

    if (!id) {
      this.verboseLog('Cannot track event: no affiliate identifier available');
      return;
    }

    const companyCode = this.companyCode || await getValue('companyCode');
    this.verboseLog(`Company code: ${companyCode || 'empty'}`);

    if (!companyCode) {
      this.verboseLog('Cannot track event: no company code available');
      return;
    }

    const payload = {
      eventName,
      deepLinkParam: id,
      companyId: companyCode,
    };

    this.verboseLog(`Track event payload: ${JSON.stringify(payload)}`);
    this.verboseLog('Making API call to track event...');

    try {
      const response = await fetch('https://api.insertaffiliate.com/v1/trackEvent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      this.verboseLog(`Track event API response status: ${response.status}`);

      if (response.ok) {
        this.verboseLog(`Event tracked successfully: ${eventName}`);
      } else {
        this.verboseLog(`Failed to track event with status code: ${response.status}`);
      }
    } catch (err) {
      this.verboseLog(`Network error tracking event: ${err}`);
    }
  }

  static async returnUserAccountTokenAndStoreExpectedTransaction(): Promise<string | null> {
    this.verboseLog('Getting user account token and storing expected transaction...');

    const shortCode = await this.returnInsertAffiliateIdentifier();
    if (!shortCode) {
      this.verboseLog('No affiliate identifier found, not saving expected transaction');
      return null;
    }

    let token = await getValue('userAccountToken');
    this.verboseLog(`Existing token: ${token || 'none'}`);

    if (!token) {
      this.verboseLog('Generating new user account token...');
      token = generateUUID();
      await saveValue('userAccountToken', token);
      this.verboseLog(`Generated and saved new token: ${token}`);
    }

    this.verboseLog(`User account token: ${token}`);
    await this.storeExpectedStoreTransaction(token);
    return token;
  }

  static async storeExpectedStoreTransaction(userAccountToken: string): Promise<void> {
    this.verboseLog(`Storing expected store transaction with token: ${userAccountToken}`);

    const companyCode = this.companyCode || await getValue('companyCode');
    const shortCode = await this.returnInsertAffiliateIdentifier();

    this.verboseLog(`Company code: ${companyCode || 'empty'}, Short code: ${shortCode || 'empty'}`);

    if (!companyCode || !shortCode) {
      this.verboseLog('Cannot store transaction: missing company code or identifier');
      return;
    }

    const payload: ExpectedTransactionPayload = {
      UUID: userAccountToken,
      companyCode,
      shortCode,
      storedDate: new Date().toISOString(),
    };

    this.verboseLog(`Payload: ${JSON.stringify(payload)}`);
    this.verboseLog('Making API call to store expected transaction...');

    try {
      const res = await fetch('https://api.insertaffiliate.com/v1/api/app-store-webhook/create-expected-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      this.verboseLog(`API response status: ${res.status}`);

      if (res.status === 200) {
        this.verboseLog('Expected transaction stored successfully on server');
      } else {
        this.verboseLog(`Failed to store transaction with status: ${res.status}`);
      }
    } catch (error) {
      this.verboseLog(`Network error storing transaction: ${error}`);
    }
  }

  static async validatePurchaseWithIapticAPI(
    jsonIapPurchase: IapticIOSReceipt | { transactionReceipt: string },
    iapticAppId: string,
    iapticAppName: string,
    iapticPublicKey: string
  ): Promise<boolean> {
    try {
      this.verboseLog('Starting Iaptic purchase validation...');
      const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
      this.verboseLog(`Platform detected: ${isIOS ? 'iOS' : 'Android'}`);

      const baseRequest = {
        id: iapticAppId,
        type: 'application',
      };

      let transaction: any;

      if (isIOS) {
        this.verboseLog('Creating iOS transaction payload');
        transaction = {
          id: iapticAppId,
          type: 'ios-appstore',
          appStoreReceipt: jsonIapPurchase.transactionReceipt,
        };
      } else {
        this.verboseLog('Creating Android transaction payload');
        const receiptJson: IapticAndroidReceipt = JSON.parse(atob(jsonIapPurchase.transactionReceipt));
        transaction = {
          id: receiptJson.orderId,
          type: 'android-playstore',
          purchaseToken: receiptJson.purchaseToken,
          receipt: jsonIapPurchase.transactionReceipt,
          signature: receiptJson.signature,
        };
      }

      const insertAffiliateIdentifier = await this.returnInsertAffiliateIdentifier();
      this.verboseLog(`Affiliate identifier: ${insertAffiliateIdentifier || 'none'}`);

      const payload = {
        ...baseRequest,
        transaction,
        additionalData: insertAffiliateIdentifier
          ? { applicationUsername: insertAffiliateIdentifier }
          : undefined,
      };

      this.verboseLog('Making API call to Iaptic validator...');
      const response = await fetch('https://validator.iaptic.com/v1/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${btoa(`${iapticAppName}:${iapticPublicKey}`)}`
        },
        body: JSON.stringify(payload),
      });

      this.verboseLog(`Iaptic validation response status: ${response.status}`);

      if (response.status === 200) {
        this.verboseLog('Purchase validated successfully');
        return true;
      } else {
        this.verboseLog(`Validation failed with status: ${response.status}`);
        return false;
      }
    } catch (error) {
      this.verboseLog(`Error during purchase validation: ${error}`);
      return false;
    }
  }

  static async fetchAndConditionallyOpenUrl(affiliateLink: string, offerCodeUrlId: string): Promise<void> {
    this.verboseLog('Fetching offer code and opening URL...');
    const encoded = encodeURIComponent(affiliateLink);
    this.verboseLog(`Encoded affiliate link: ${encoded}`);

    try {
      this.verboseLog('Making API call to fetch offer code...');
      const res = await fetch(`https://api.insertaffiliate.com/v1/affiliateReturnOfferCode/${encoded}`);
      this.verboseLog(`API response status: ${res.status}`);

      const offerCode = (await res.text()).replace(/[^a-zA-Z0-9]/g, '');
      this.verboseLog(`Received offer code: ${offerCode}`);

      const errorCodes = [
        'errorofferCodeNotFound',
        'errorAffiliateoffercodenotfoundinanycompany',
        'errorAffiliateoffercodenotfoundinanycompanyAffiliatelinkwas',
        'Routenotfound'
      ];

      if (errorCodes.includes(offerCode)) {
        this.verboseLog('Offer code not found or invalid');
        return;
      }

      const redeemUrl = `https://apps.apple.com/redeem?ctx=offercodes&id=${offerCodeUrlId}&code=${offerCode}`;
      this.verboseLog(`Opening redeem URL: ${redeemUrl}`);
      window.open(redeemUrl, '_blank');
      this.verboseLog('Redeem URL opened successfully');
    } catch (err) {
      this.verboseLog(`Error fetching/opening offer code: ${err}`);
    }
  }

  private static async getOrCreateUserID(): Promise<string> {
    this.verboseLog('Getting or creating user ID...');
    let id = await getValue('userId');
    this.verboseLog(`Existing user ID: ${id || 'none'}`);

    if (!id) {
      this.verboseLog('Generating new user ID...');
      id = generateShortDeviceID();
      await saveValue('userId', id);
      this.verboseLog(`Generated and saved new user ID: ${id}`);
    }

    return id;
  }

  private static async fetchShortLink(link: string): Promise<string | null> {
    try {
      this.verboseLog('Converting deep link to short link...');
      const encoded = encodeURIComponent(link);
      const companyCode = this.companyCode || await getValue('companyCode');
      this.verboseLog(`Company code: ${companyCode || 'empty'}`);

      if (!companyCode) {
        this.verboseLog('No company code available, cannot convert link');
        return null;
      }

      const url = `https://api.insertaffiliate.com/V1/convert-deep-link-to-short-link?companyId=${companyCode}&deepLinkUrl=${encoded}`;
      this.verboseLog(`Making API call to: ${url}`);

      const res = await fetch(url);
      this.verboseLog(`API response status: ${res.status}`);

      const data = await res.json();
      const shortLink = data?.shortLink || null;
      this.verboseLog(`Short link received: ${shortLink || 'none'}`);

      return shortLink;
    } catch (err: any) {
      this.verboseLog(`Error fetching short link: ${err?.message || err}`);
      return null;
    }
  }
}

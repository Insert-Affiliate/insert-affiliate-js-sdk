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

export class InsertAffiliate {
  private static isInitialized: boolean = false;
  private static companyCode: string | null = null;

  static async initialize(code: string | null): Promise<void> {
    if (this.isInitialized) {
      console.warn('[Insert Affiliate] SDK already initialized.');
      return;
    }
    this.companyCode = code;
    await saveValue('companyCode', code || '');
    this.isInitialized = true;
    console.log(`[Insert Affiliate] SDK initialized ${code ? `with company code: ${code}` : 'without a company code.'}`);
  }

  static async returnInsertAffiliateIdentifier(): Promise<string | null> {
    const userId = await this.getOrCreateUserID();
    const referrerLink = await getValue('referrerLink');
    if (!referrerLink) return null;
    return `${referrerLink}-${userId}`;
  }

  static async setInsertAffiliateIdentifier(referringLink: string): Promise<string | null> {
    const userId = await this.getOrCreateUserID();
    const shortCode = /^[a-zA-Z0-9]{3,25}$/.test(referringLink)
      ? referringLink
      : await this.fetchShortLink(referringLink);

    if (!shortCode) return null;

    await saveValue('referrerLink', shortCode);
    return `${shortCode}-${userId}`;
  }

  static async setShortCode(shortCode: string): Promise<void> {
    const valid = /^[a-zA-Z0-9]{3,25}$/.test(shortCode);
    if (!valid) {
      console.warn('[Insert Affiliate] Invalid short code.');
      return;
    }
    await this.setInsertAffiliateIdentifier(shortCode);
  }

  static async trackEvent(eventName: string): Promise<void> {
    const id = await this.returnInsertAffiliateIdentifier();

    if (!id) {
      console.warn('[Insert Affiliate] No affiliate identifier found.');
      return;
    }

    const companyCode = this.companyCode || await getValue('companyCode');

    if (!companyCode) return;

    try {
      await fetch('https://api.insertaffiliate.com/v1/trackEvent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          {
            eventName,
            deepLinkParam: id,
            companyId: companyCode,
          }),
      });
      console.log('[Insert Affiliate] Event tracked:', eventName);
    } catch (err) {
      console.error('[Insert Affiliate] Failed to track event:', err);
    }
  }

  static async returnUserAccountTokenAndStoreExpectedTransaction(): Promise<string | null> {
    const shortCode = await this.returnInsertAffiliateIdentifier();
    if (!shortCode) return null;

    let token = await getValue('userAccountToken');
    if (!token) {
      token = generateUUID();
      await saveValue('userAccountToken', token);
    }

    await this.storeExpectedStoreTransaction(token);
    return token;
  }

  static async storeExpectedStoreTransaction(userAccountToken: string): Promise<void> {
    const companyCode = this.companyCode || await getValue('companyCode');
    const shortCode = await this.returnInsertAffiliateIdentifier();

    if (!companyCode || !shortCode) {
      console.error('[Insert Affiliate] Missing company code or identifier.');
      return;
    }

    const payload: ExpectedTransactionPayload = {
      UUID: userAccountToken,
      companyCode,
      shortCode,
      storedDate: new Date().toISOString(),
    };

    try {
      const res = await fetch('https://api.insertaffiliate.com/v1/api/app-store-webhook/create-expected-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 200) {
        console.log('[Insert Affiliate] Stored expected transaction');
      } else {
        console.warn('[Insert Affiliate] Failed storing transaction:', res.status);
      }
    } catch (error) {
      console.error('[Insert Affiliate] Error storing transaction:', error);
    }
  }

  static async validatePurchaseWithIapticAPI(
    jsonIapPurchase: IapticIOSReceipt | { transactionReceipt: string },
    iapticAppId: string,
    iapticAppName: string,
    iapticPublicKey: string
  ): Promise<boolean> {
    try {
      const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

      const baseRequest = {
        id: iapticAppId,
        type: 'application',
      };

      let transaction: any;

      if (isIOS) {
        transaction = {
          id: iapticAppId,
          type: 'ios-appstore',
          appStoreReceipt: jsonIapPurchase.transactionReceipt,
        };
      } else {
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

      const payload = {
        ...baseRequest,
        transaction,
        additionalData: insertAffiliateIdentifier
          ? { applicationUsername: insertAffiliateIdentifier }
          : undefined,
      };

      const response = await fetch('https://validator.iaptic.com/v1/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${btoa(`${iapticAppName}:${iapticPublicKey}`)}`
        },
        body: JSON.stringify(payload),
      });

      return response.status === 200;
    } catch (error) {
      console.error('[Insert Affiliate] Purchase validation failed:', error);
      return false;
    }
  }

  static async fetchAndConditionallyOpenUrl(affiliateLink: string, offerCodeUrlId: string): Promise<void> {
    const encoded = encodeURIComponent(affiliateLink);

    try {
      const res = await fetch(`https://api.insertaffiliate.com/v1/affiliateReturnOfferCode/${encoded}`);
      const offerCode = (await res.text()).replace(/[^a-zA-Z0-9]/g, '');

      const errorCodes = [
        'errorofferCodeNotFound',
        'errorAffiliateoffercodenotfoundinanycompany',
        'errorAffiliateoffercodenotfoundinanycompanyAffiliatelinkwas',
        'Routenotfound'
      ];

      if (errorCodes.includes(offerCode)) {
        console.warn('[Insert Affiliate] Offer Code Not Found');
        return;
      }

      const redeemUrl = `https://apps.apple.com/redeem?ctx=offercodes&id=${offerCodeUrlId}&code=${offerCode}`;
      window.open(redeemUrl, '_blank');
    } catch (err) {
      console.error('[Insert Affiliate] Error fetching/opening offer code:', err);
    }
  }

  private static async getOrCreateUserID(): Promise<string> {
    let id = await getValue('userId');
    if (!id) {
      id = generateShortDeviceID();
      await saveValue('userId', id);
    }
    return id;
  }

  private static async fetchShortLink(link: string): Promise<string | null> {
    try {
      const encoded = encodeURIComponent(link);
      const companyCode = this.companyCode || await getValue('companyCode');
      if (!companyCode) return null;

      const res = await fetch(`https://api.insertaffiliate.com/V1/convert-deep-link-to-short-link?companyId=${companyCode}&deepLinkUrl=${encoded}`);
      const data = await res.json();
      return data?.shortLink || null;
    } catch (err: any) {
      console.error('[Insert Affiliate] Failed to fetch short link:', err?.message || err);
      return null;
    }
  }
}

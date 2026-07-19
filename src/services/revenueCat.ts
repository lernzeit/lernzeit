import { Capacitor } from '@capacitor/core';

const IOS_API_KEY = 'appl_zkfprSgXsfzzfCAUsdTWTCbhgir';
// Android key not yet configured. When available, set here to enable RevenueCat
// on Android as well. If empty, Android falls back to Stripe via usePremium.
const ANDROID_API_KEY = '';
// RevenueCat Web Billing (Stripe) public API key. Starts with `rcb_`.
// Configure in RevenueCat Dashboard → Project Settings → API Keys → Web Billing.
// When empty, the web paywall uses the legacy Stripe direct checkout fallback.
const WEB_API_KEY = '';
export const PREMIUM_ENTITLEMENT_ID = 'premium';

export type RCPlatform = 'ios' | 'android' | 'web';

export interface NormalizedPackage {
  identifier: string;
  priceString: string;
  title?: string;
  description?: string;
  productIdentifier: string;
  raw: any;
}

export interface NormalizedOfferings {
  monthly: NormalizedPackage | null;
  annual: NormalizedPackage | null;
}

let initialized = false;
let initPromise: Promise<void> | null = null;
let activePlatform: RCPlatform | null = null;
let webPurchasesInstance: any = null;

export function isRevenueCatSupported(): boolean {
  try {
    if (!Capacitor.isNativePlatform()) {
      // Web is supported when a Web Billing key is configured.
      return !!WEB_API_KEY;
    }
    const p = Capacitor.getPlatform();
    if (p === 'ios') return !!IOS_API_KEY;
    if (p === 'android') return !!ANDROID_API_KEY;
    return false;
  } catch {
    return false;
  }
}

function getPlatform(): RCPlatform {
  try {
    if (!Capacitor.isNativePlatform()) return 'web';
    const p = Capacitor.getPlatform();
    if (p === 'ios') return 'ios';
    if (p === 'android') return 'android';
  } catch { /* ignore */ }
  return 'web';
}

function getApiKey(platform: RCPlatform): string {
  if (platform === 'ios') return IOS_API_KEY;
  if (platform === 'android') return ANDROID_API_KEY;
  return WEB_API_KEY;
}

export function isNative(): boolean {
  const p = getPlatform();
  return p === 'ios' || p === 'android';
}

export async function initRevenueCat(appUserId?: string | null): Promise<void> {
  if (!isRevenueCatSupported()) return;
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const platform = getPlatform();
      activePlatform = platform;
      const apiKey = getApiKey(platform);
      if (platform === 'web') {
        const { Purchases, LogLevel } = await import('@revenuecat/purchases-js');
        try { Purchases.setLogLevel(LogLevel.Warn); } catch { /* ignore */ }
        // Web SDK requires a non-null appUserId. Fall back to an anonymous id.
        const uid = appUserId && appUserId.length > 0
          ? appUserId
          : `$RCAnonymousID:${crypto.randomUUID().replace(/-/g, '')}`;
        webPurchasesInstance = Purchases.configure({ apiKey, appUserId: uid });
      } else {
        const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
        await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
        await Purchases.configure({
          apiKey,
          appUserID: appUserId ?? undefined,
        });
      }
      initialized = true;
      console.log('✅ RevenueCat initialized');
    } catch (err) {
      console.error('❌ RevenueCat init failed:', err);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

export async function identifyRevenueCatUser(appUserId: string): Promise<void> {
  if (!isRevenueCatSupported()) return;
  try {
    if (!initialized) await initRevenueCat(appUserId);
    if (activePlatform === 'web') {
      if (webPurchasesInstance?.changeUser) {
        await webPurchasesInstance.changeUser(appUserId);
      }
    } else {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      await Purchases.logIn({ appUserID: appUserId });
    }
  } catch (err) {
    console.warn('RevenueCat logIn failed:', err);
  }
}

export async function logOutRevenueCat(): Promise<void> {
  if (!isRevenueCatSupported() || !initialized) return;
  try {
    if (activePlatform === 'web') {
      // Web SDK has no explicit logOut; switching users happens via changeUser.
      return;
    } else {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      await Purchases.logOut();
    }
  } catch (err) {
    console.warn('RevenueCat logOut failed:', err);
  }
}

function normalizeNativePackage(pkg: any): NormalizedPackage | null {
  if (!pkg) return null;
  return {
    identifier: pkg.identifier,
    priceString: pkg.product?.priceString ?? '',
    title: pkg.product?.title,
    description: pkg.product?.description,
    productIdentifier: pkg.product?.identifier ?? '',
    raw: pkg,
  };
}

function normalizeWebPackage(pkg: any): NormalizedPackage | null {
  if (!pkg) return null;
  const product = pkg.webBillingProduct ?? pkg.product;
  const price =
    product?.currentPrice?.formattedPrice ??
    product?.price?.formattedPrice ??
    '';
  return {
    identifier: pkg.identifier,
    priceString: price,
    title: product?.title ?? product?.displayName,
    description: product?.description ?? undefined,
    productIdentifier: product?.identifier ?? '',
    raw: pkg,
  };
}

export async function getOfferings(): Promise<NormalizedOfferings> {
  if (!isRevenueCatSupported()) return { monthly: null, annual: null };
  if (!initialized) await initRevenueCat();
  if (activePlatform === 'web') {
    const inst = webPurchasesInstance;
    if (!inst) return { monthly: null, annual: null };
    const offerings = await inst.getOfferings();
    const current = offerings?.current;
    return {
      monthly: normalizeWebPackage(current?.monthly),
      annual: normalizeWebPackage(current?.annual),
    };
  }
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  const { current } = await Purchases.getOfferings();
  return {
    monthly: normalizeNativePackage(current?.monthly),
    annual: normalizeNativePackage(current?.annual),
  };
}

export interface PurchaseOutcome {
  active: boolean;
  userCancelled: boolean;
}

export async function purchasePackage(pkg: NormalizedPackage, opts?: { customerEmail?: string }): Promise<PurchaseOutcome> {
  if (!isRevenueCatSupported()) throw new Error('RevenueCat not supported');
  if (!initialized) await initRevenueCat();
  if (activePlatform === 'web') {
    const inst = webPurchasesInstance;
    try {
      const result = await inst.purchase({
        rcPackage: pkg.raw,
        customerEmail: opts?.customerEmail,
      });
      const active = !!result?.customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
      return { active, userCancelled: false };
    } catch (err: any) {
      // Web SDK throws PurchaseFlowError with errorCode UserCancelledError on close.
      const code = err?.errorCode ?? err?.code;
      const cancelled = code === 'USER_CANCELLED_ERROR' || String(err?.message || '').toLowerCase().includes('cancel');
      if (cancelled) return { active: false, userCancelled: true };
      throw err;
    }
  }
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  try {
    const result: any = await Purchases.purchasePackage({ aPackage: pkg.raw });
    const active = !!result?.customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
    return { active, userCancelled: false };
  } catch (err: any) {
    if (err?.userCancelled) return { active: false, userCancelled: true };
    throw err;
  }
}

export async function verifyEntitlementActive(): Promise<boolean> {
  if (!isRevenueCatSupported()) return false;
  if (!initialized) await initRevenueCat();
  try {
    if (activePlatform === 'web') {
      const info = await webPurchasesInstance.getCustomerInfo();
      return !!info?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
    }
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.getCustomerInfo();
    return !!customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
  } catch (err) {
    console.warn('verifyEntitlementActive failed:', err);
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!isRevenueCatSupported()) return false;
  if (!initialized) await initRevenueCat();
  if (activePlatform === 'web') {
    // Web Billing has no separate restore flow – re-check the entitlement.
    return verifyEntitlementActive();
  }
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  const { customerInfo } = await Purchases.restorePurchases();
  return !!customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
}

export function getActivePlatform(): RCPlatform | null {
  return activePlatform;
}
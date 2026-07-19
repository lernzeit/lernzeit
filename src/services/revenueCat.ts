import { Capacitor } from '@capacitor/core';

const IOS_API_KEY = 'appl_zkfprSgXsfzzfCAUsdTWTCbhgir';
// Android key not yet configured. When available, set here to enable RevenueCat
// on Android as well. If empty, Android falls back to Stripe via usePremium.
const ANDROID_API_KEY = '';
export const PREMIUM_ENTITLEMENT_ID = 'premium';

let initialized = false;
let initPromise: Promise<void> | null = null;

export function isRevenueCatSupported(): boolean {
  try {
    if (!Capacitor.isNativePlatform()) return false;
    const p = Capacitor.getPlatform();
    if (p === 'ios') return !!IOS_API_KEY;
    if (p === 'android') return !!ANDROID_API_KEY;
    return false;
  } catch {
    return false;
  }
}

function getApiKey(): string {
  const p = Capacitor.getPlatform();
  if (p === 'ios') return IOS_API_KEY;
  if (p === 'android') return ANDROID_API_KEY;
  return '';
}

export async function initRevenueCat(appUserId?: string | null): Promise<void> {
  if (!isRevenueCatSupported()) return;
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
      await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
      await Purchases.configure({
        apiKey: getApiKey(),
        appUserID: appUserId ?? undefined,
      });
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
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    await Purchases.logIn({ appUserID: appUserId });
  } catch (err) {
    console.warn('RevenueCat logIn failed:', err);
  }
}

export async function logOutRevenueCat(): Promise<void> {
  if (!isRevenueCatSupported() || !initialized) return;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    await Purchases.logOut();
  } catch (err) {
    console.warn('RevenueCat logOut failed:', err);
  }
}
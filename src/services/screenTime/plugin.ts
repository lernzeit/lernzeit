import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import {
  EMPTY_STATUS,
  UNAVAILABLE,
  type ReleaseResult,
  type ScreenTimeAvailability,
  type ScreenTimePlugin,
  type ShieldStatus,
} from './types';

/**
 * Bindung an das native Plugin.
 *
 * registerPlugin braucht kein eigenes JavaScript-Paket — der Name muss nur mit
 * `jsName` in ScreenTimePlugin.swift uebereinstimmen. Der native Teil liegt
 * unter native/screen-time und wird von `npx cap sync ios` eingezogen.
 *
 * Der zweite Parameter ist der Ersatz fuer Web und Android: Dort gibt es keine
 * Sperre, und das soll ehrlich gemeldet werden, statt einen Fehler zu werfen.
 * Ein Absturz waere die schlechteste aller Antworten auf "diese Plattform kann
 * das nicht".
 */
const nichtVerfuegbar: ScreenTimePlugin = {
  isAvailable: async () => UNAVAILABLE,
  requestAuthorization: async () => ({ authorization: 'denied' as const }),
  pickShieldedApps: async () => ({ shieldedCount: 0, cancelled: true }),
  applyShield: async () => EMPTY_STATUS,
  releaseFor: async () => ({ ...EMPTY_STATUS, cancelled: true, grantedMinutes: 0 }),
  restoreShield: async () => EMPTY_STATUS,
  stopManaging: async () => EMPTY_STATUS,
  getStatus: async () => EMPTY_STATUS,
};

const ScreenTime = registerPlugin<ScreenTimePlugin>('ScreenTime', {
  web: () => nichtVerfuegbar,
});

/**
 * Nur iOS. Android hat keine Entsprechung: Family Link bietet Dritten keine
 * Schnittstelle, dort bleibt es beim manuellen Freigeben.
 */
export function screenTimeSupportedPlatform(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  } catch {
    return false;
  }
}

/**
 * Fragt das Geraet, ob die Sperre ueberhaupt moeglich ist. Faengt auch den
 * Fall ab, dass das Plugin fehlt — etwa in einem aelteren Build, der ohne den
 * nativen Teil ausgeliefert wurde.
 */
export async function screenTimeAvailability(): Promise<ScreenTimeAvailability> {
  if (!screenTimeSupportedPlatform()) return UNAVAILABLE;
  try {
    return await ScreenTime.isAvailable();
  } catch {
    return { available: false, reason: 'entitlement-missing' };
  }
}

export async function screenTimeStatus(): Promise<ShieldStatus> {
  if (!screenTimeSupportedPlatform()) return EMPTY_STATUS;
  try {
    return await ScreenTime.getStatus();
  } catch {
    return EMPTY_STATUS;
  }
}

export type { ReleaseResult, ShieldStatus };
export { ScreenTime };

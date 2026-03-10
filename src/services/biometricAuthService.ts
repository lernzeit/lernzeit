/**
 * Biometric Authentication Service
 * Uses capacitor-native-biometric for fingerprint/Face ID login.
 * Stores credentials securely in the device keychain/keystore.
 */
import { Capacitor } from '@capacitor/core';

let NativeBiometric: any = null;

async function getBiometricPlugin() {
  if (!NativeBiometric && Capacitor.isNativePlatform()) {
    try {
      const mod = await import('capacitor-native-biometric');
      NativeBiometric = mod.NativeBiometric;
    } catch (e) {
      console.warn('NativeBiometric plugin not available:', e);
    }
  }
  return NativeBiometric;
}

const SERVER_ID = 'de.lernzeit.app';

export interface BiometricAvailability {
  available: boolean;
  biometryType?: string; // 'fingerprint', 'face', 'iris', 'multiple'
  reason?: string;
}

export interface BiometricCredentials {
  username: string;
  password: string;
}

class BiometricAuthService {
  private static instance: BiometricAuthService;

  static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  /**
   * Check if biometric authentication is available on this device
   */
  async isAvailable(): Promise<BiometricAvailability> {
    if (!Capacitor.isNativePlatform()) {
      return { available: false, reason: 'Nur auf Mobilgeräten verfügbar' };
    }

    try {
      const plugin = await getBiometricPlugin();
      if (!plugin) {
        return { available: false, reason: 'Biometrie-Plugin nicht geladen' };
      }

      const result = await plugin.isAvailable();
      return {
        available: true,
        biometryType: this.getBiometryTypeName(result.biometryType),
      };
    } catch (e: any) {
      console.warn('Biometric check failed:', e);
      return {
        available: false,
        reason: e?.message || 'Biometrie nicht verfügbar',
      };
    }
  }

  /**
   * Store credentials securely behind biometric protection
   */
  async saveCredentials(email: string, password: string): Promise<boolean> {
    try {
      const plugin = await getBiometricPlugin();
      if (!plugin) return false;

      await plugin.setCredentials({
        username: email,
        password: password,
        server: SERVER_ID,
      });

      console.log('✅ Credentials saved with biometric protection');
      return true;
    } catch (e) {
      console.warn('Failed to save biometric credentials:', e);
      return false;
    }
  }

  /**
   * Verify biometric and retrieve stored credentials
   */
  async authenticate(): Promise<BiometricCredentials | null> {
    try {
      const plugin = await getBiometricPlugin();
      if (!plugin) return null;

      // Prompt biometric verification
      await plugin.verifyIdentity({
        reason: 'Anmelden bei LernZeit',
        title: 'Biometrische Anmeldung',
        subtitle: 'Bestätige deine Identität',
        description: 'Verwende deinen Fingerabdruck oder Gesichtserkennung',
        negativeButtonText: 'Abbrechen',
      });

      // If verification succeeded, get credentials
      const credentials = await plugin.getCredentials({ server: SERVER_ID });
      return {
        username: credentials.username,
        password: credentials.password,
      };
    } catch (e: any) {
      // User cancelled or biometric failed
      console.log('Biometric auth cancelled or failed:', e?.message);
      return null;
    }
  }

  /**
   * Check if credentials are stored for biometric login
   */
  async hasStoredCredentials(): Promise<boolean> {
    try {
      const plugin = await getBiometricPlugin();
      if (!plugin) return false;

      const credentials = await plugin.getCredentials({ server: SERVER_ID });
      return !!(credentials?.username && credentials?.password);
    } catch {
      return false;
    }
  }

  /**
   * Remove stored credentials
   */
  async deleteCredentials(): Promise<void> {
    try {
      const plugin = await getBiometricPlugin();
      if (!plugin) return;

      await plugin.deleteCredentials({ server: SERVER_ID });
      console.log('✅ Biometric credentials deleted');
    } catch (e) {
      console.warn('Failed to delete biometric credentials:', e);
    }
  }

  private getBiometryTypeName(type: number): string {
    switch (type) {
      case 1: return 'fingerprint';
      case 2: return 'face';
      case 3: return 'iris';
      case 4: return 'multiple';
      default: return 'unknown';
    }
  }

  /**
   * Get a user-friendly label for the biometry type
   */
  getBiometryLabel(type?: string): string {
    switch (type) {
      case 'fingerprint': return 'Fingerabdruck';
      case 'face': return 'Gesichtserkennung';
      case 'iris': return 'Iris-Scan';
      case 'multiple': return 'Biometrie';
      default: return 'Biometrie';
    }
  }

  /**
   * Get the appropriate icon name for the biometry type
   */
  getBiometryIcon(type?: string): 'fingerprint' | 'scan-face' | 'shield-check' {
    switch (type) {
      case 'fingerprint': return 'fingerprint';
      case 'face': return 'scan-face';
      default: return 'shield-check';
    }
  }
}

export const biometricAuthService = BiometricAuthService.getInstance();

export type Platform = 'android' | 'ios' | 'web';

export interface OpenParentalControlsResult {
  success: boolean;
  opened: boolean;
  platform: Platform;
  appName: string;
  message: string;
  fallbackUrl?: string;
  /** True if the parental control app (e.g. Family Link) is not installed on the device. */
  notInstalled?: boolean;
}
import type { OpenParentalControlsResult } from './types';

export function getWebInstructions(minutes?: number): OpenParentalControlsResult {
  const minutesText = minutes ? ` ${minutes} Minuten` : '';
  return {
    success: true,
    opened: false,
    platform: 'web',
    appName: 'Kindersicherung',
    message: `Um${minutesText} Bildschirmzeit freizugeben:\n• Android: Family Link App → [Kind] → Tageslimit\n• iPhone/iPad: Einstellungen → Bildschirmzeit → [Kind] → App-Limits`,
  };
}
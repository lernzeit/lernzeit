import type { OpenParentalControlsResult } from './types';

export function getWebInstructions(minutes?: number): OpenParentalControlsResult {
  const minutesText = minutes ? ` ${minutes} Minuten` : '';
  return {
    success: true,
    opened: false,
    platform: 'web',
    appName: 'Kindersicherung',
    message: `So gibst du${minutesText} frei:\n• iPhone/iPad: am Gerät des Kindes bei „Mehr Zeit anfragen“ den Bildschirmzeit-Code eingeben\n• Android: Family Link → Kind → Bonuszeit`,
  };
}
/**
 * Shared validation for referral codes.
 * Format: 4–12 alphanumeric characters (A–Z, 0–9). Normalized to uppercase.
 */

const REFERRAL_CODE_REGEX = /^[A-Z0-9]{4,12}$/;

export type ReferralCodeReason =
  | 'empty'
  | 'too_short'
  | 'too_long'
  | 'invalid_chars'
  | 'invalid';

export interface ReferralCodeCheck {
  valid: boolean;
  normalized: string;
  reason?: ReferralCodeReason;
  message: string;
}

export function validateReferralCode(raw: string | null | undefined): ReferralCodeCheck {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return { valid: false, normalized: '', reason: 'empty', message: 'Bitte Empfehlungs-Code eingeben.' };
  }
  const normalized = trimmed.toUpperCase();
  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      reason: 'invalid_chars',
      message: 'Nur Buchstaben (A–Z) und Ziffern (0–9) sind erlaubt.',
    };
  }
  if (normalized.length < 4) {
    return { valid: false, normalized, reason: 'too_short', message: 'Empfehlungs-Code ist zu kurz (mindestens 4 Zeichen).' };
  }
  if (normalized.length > 12) {
    return { valid: false, normalized, reason: 'too_long', message: 'Empfehlungs-Code ist zu lang (maximal 12 Zeichen).' };
  }
  if (!REFERRAL_CODE_REGEX.test(normalized)) {
    return { valid: false, normalized, reason: 'invalid', message: 'Ungültiges Code-Format.' };
  }
  return { valid: true, normalized, message: '' };
}

export const REFERRAL_CODE_HINT = 'Format: 4–12 Zeichen, nur Buchstaben und Ziffern.';
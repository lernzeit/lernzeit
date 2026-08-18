import { requestPushPermissionNow } from '@/hooks/useOneSignal';
import { trackFireAndForget } from '@/lib/analytics';

export const INVITE_BASE_URL = 'https://lernzeit.app';

export function buildInviteLink(code: string): string {
  return `${INVITE_BASE_URL}/start?code=${encodeURIComponent(code)}`;
}

export function buildInviteMessage(code: string): string {
  return `Hier ist dein Zugang zu LernZeit. Öffne den Link auf deinem Handy: ${buildInviteLink(code)}`;
}

export interface ShareResult {
  method: 'share' | 'clipboard' | 'failed';
}

/**
 * Teilt den Einladungslink (Web Share API auf mobil, Kopieren als Fallback)
 * und fragt danach die Push-Erlaubnis ab – zu diesem Zeitpunkt ist der Nutzen
 * für Eltern erkennbar.
 */
export async function shareInviteLink(code: string): Promise<ShareResult> {
  const text = buildInviteMessage(code);
  let method: ShareResult['method'] = 'failed';

  try {
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (typeof nav.share === 'function') {
      await nav.share({ title: 'LernZeit', text });
      method = 'share';
    } else {
      await navigator.clipboard.writeText(text);
      method = 'clipboard';
    }
  } catch {
    try {
      await navigator.clipboard.writeText(text);
      method = 'clipboard';
    } catch {
      method = 'failed';
    }
  }

  if (method !== 'failed') {
    trackFireAndForget('invite_link_shared', { method });
    void requestPushPermissionNow();
  }

  return { method };
}

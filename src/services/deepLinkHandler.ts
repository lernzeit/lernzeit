/**
 * Universal/App Link handler for Capacitor native shell.
 * Captures incoming https://lernzeit.app/?ref=CODE URLs and:
 *  1. Persists ?ref=CODE in localStorage (same key as main.tsx) so AuthForm
 *     and the post-OAuth referral linker pick it up.
 *  2. Navigates the in-app router to the matching path so the user lands
 *     on the correct screen instead of the cold-start home.
 */
export async function initDeepLinkHandler() {
  try {
    const Capacitor = (window as any)?.Capacitor;
    if (!Capacitor?.isNativePlatform?.()) return;

    const { App } = await import('@capacitor/app');

    const handleUrl = (rawUrl: string) => {
      try {
        const url = new URL(rawUrl);
        const ref = url.searchParams.get('ref');
        if (ref && /^[A-Z0-9]{4,12}$/i.test(ref)) {
          localStorage.setItem(
            'lernzeit_referral_code',
            JSON.stringify({ code: ref.toUpperCase(), expires: Date.now() + 30 * 86400000 })
          );
        }
        const target = `${url.pathname || '/'}${url.search || ''}${url.hash || ''}`;
        if (target && target !== window.location.pathname + window.location.search + window.location.hash) {
          window.history.pushState({}, '', target);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      } catch (err) {
        console.warn('[deepLink] Failed to parse URL:', rawUrl, err);
      }
    };

    App.addListener('appUrlOpen', (event: { url: string }) => {
      if (event?.url) handleUrl(event.url);
    });

    // Handle cold start launch URL
    try {
      const launch = await App.getLaunchUrl();
      if (launch?.url) handleUrl(launch.url);
    } catch { /* ignore */ }
  } catch (err) {
    console.warn('[deepLink] init failed:', err);
  }
}
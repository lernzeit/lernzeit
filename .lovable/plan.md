## Ziel

Besucher auf einem Android-Gerät (mobiler Browser) bekommen einen dezenten, professionellen Hinweis, dass es LernZeit auch als native Android-App im Play Store gibt — mit direktem Link zum Store-Listing.

## Warum kein QR-Code

QR-Codes ergeben nur Sinn auf Desktop/Print — der Nutzer schaut das Handy ja bereits an, mit dem er installieren würde. Ein direkter „Im Play Store öffnen"-Button ist ein Tap statt Kamera-App + Scan. Deshalb: Smart App Banner statt QR.

## UX-Muster: Smart App Banner (analog iOS Smart App Banner)

Schmaler, sticky Banner am oberen Rand — nicht als modaler Interstitial, weil:

- Google straft Full-Screen App-Install-Interstitials in Search Rankings ab.
- Nutzer, die die Website bewusst öffnen, sollen nicht blockiert werden.

Muster erfolgreicher Apps (Spotify, Reddit, Medium):

- App-Icon links, kurzer Text mittig, Primär-CTA rechts, Schließen-„×" ganz links.
- Persistente Dismissal (localStorage) für z. B. 30 Tage — nicht bei jedem Reload nerven.
- Nur einmal pro Session animiert einblenden (Slide-in nach ~600 ms), danach ohne Animation.

## Trigger-Bedingungen (alle müssen zutreffen)

1. `navigator.userAgent` enthält `Android` UND nicht `wv` (WebView) — verhindert Banner in der bereits installierten App.
2. Nicht im Capacitor-Kontext (`window.Capacitor?.isNativePlatform()` = false).
3. Kein `display-mode: standalone` (installierte PWA).
4. Kein Dismissal-Flag in `localStorage` (Key `lernzeit_android_banner_dismissed` mit Ablauf 30 Tage).
5. Route ist eine öffentliche Marketing-Route (`/`, `/start`, `/support`, `/impressum`, `/datenschutz`, `/nutzungsbedingungen`) — nicht während einer aktiven Lernsession oder im eingeloggten Dashboard, um Ablenkung zu vermeiden.

## Komponenten & Dateien

- **Neu:** `src/components/AndroidAppBanner.tsx` — die Bannerkomponente selbst. Nutzt Design-Tokens (`bg-card`, `border-border`, `text-primary`), das bestehende Book-Icon-Motiv aus dem Hero und Tailwind-Klassen (`fixed top-0 inset-x-0 z-50`, `pt-safe-top`). Inline SVG des Google-Play-Logos im CTA-Button.
- **Neu:** `src/hooks/useAndroidAppBanner.ts` — kapselt Erkennung, Dismissal und Persistenz.
- **Update:** `src/App.tsx` — Banner global mountet, aber die Komponente entscheidet selbst per Hook, ob sie rendert (kein Layout-Shift, wenn sie schwiegt).
- **Update:** `index.html` — optionales `<meta name="google-play-app" content="app-id=de.lernzeit.app">` als semantisches Signal für Chrome/Google.

## Copy (Deutsch)

- Headline: „LernZeit-App für Android"
- Sub: „Schneller starten. App immer dabei."
- CTA-Button: „Im Play Store öffnen" → `https://play.google.com/store/apps/details?id=de.lernzeit.app&utm_source=web_banner`
- Dismissal: „×" mit `aria-label="Hinweis schließen"`

## Verhalten

- Slide-in-Animation via Tailwind `animate-slide-down` (Keyframe ggf. neu in `tailwind.config.ts` / `index.css`).
- CTA öffnet in neuem Tab (`target="_blank" rel="noopener"`), damit die Website-Session erhalten bleibt.
- `utm_source=web_banner` (statt `emea_Med`), damit du in der Play Console die Herkunft „Web-Banner" sauber tracken kannst.
- Banner respektiert `prefers-reduced-motion` (kein Slide-in bei Reduce-Motion).

## Nicht Teil dieses Plans

- iOS Smart App Banner (App Store) — kann analog nachgezogen werden, wenn iOS-Version live ist.
- Serverseitiges Prerendering-Rendering des Banners (bewusst nur clientseitig, damit Prerender-Snapshots sauber bleiben und der Banner nur für echte Android-Nutzer erscheint).
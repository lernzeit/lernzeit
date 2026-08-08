# LernZeit

Spielerische Lern-App: Kinder verdienen Bildschirmzeit, indem sie Aufgaben lösen.
Eltern verwalten Zeitkonten, Freigaben und Lernziele.

Verfügbar als Web-App, Android- und iOS-App aus derselben Codebasis.

## Tech-Stack

| Bereich | Technologie |
|---|---|
| Frontend | React, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui |
| Native | Capacitor (Android + iOS) |
| Backend | Supabase (Postgres, Auth, Edge Functions) |
| Zahlungen | Stripe (Web), RevenueCat (Native) |
| Push | OneSignal, Firebase |
| KI | Google Gemini (direkt), OpenRouter |

## Lokale Entwicklung

Voraussetzung: Node.js und npm.

```sh
npm install --legacy-peer-deps
npm run dev
```

Der Dev-Server läuft auf `http://localhost:8080`.

Umgebungsvariablen liegen in `.env` (alle `VITE_`-Variablen landen im
Client-Bundle und sind damit öffentlich).

## Skripte

| Befehl | Zweck |
|---|---|
| `npm run dev` | Dev-Server mit Hot Reload |
| `npm run build` | Produktions-Build nach `dist/` |
| `npm run lint` | ESLint |
| `npm run preview` | Produktions-Build lokal ausliefern |
| `npm run test:e2e` | Playwright-E2E-Tests (Dev-Server muss laufen) |

`npm run build` führt anschließend automatisch `scripts/verify-prerender.mjs` aus.
Das Skript prüft, dass die Marketing-Routen (`/start`, `/impressum`,
`/datenschutz`, `/nutzungsbedingungen`, `/konto-loeschen`) als statisches HTML
vorgerendert wurden — wichtig für Crawler ohne JavaScript.

## Native Builds

Die Apps laden ausschließlich das gebündelte `dist/`. Jede Code-Änderung braucht
daher einen Build **und** einen Sync, bevor sie nativ sichtbar wird:

```sh
npm run build
npx cap sync android    # bzw. ios
```

Danach in Android Studio bzw. Xcode bauen.

Ohne Plattform-Argument synchronisiert `npx cap sync` beide Plattformen — das
schlägt fehl, wenn eine davon lokal nicht eingerichtet ist. Die Plattform also
besser explizit angeben.

**Versionsnummern:**

- Android: `versionCode` und `versionName` in `android/app/build.gradle`
- iOS: `IOS_MARKETING_VERSION` in `codemagic.yaml` — **nicht** in
  `project.pbxproj`, siehe unten

## CI/CD

`codemagic.yaml` definiert die Release-Workflows. Beide werden manuell gestartet;
der Branch wird dabei in der Codemagic-Oberfläche ausgewählt.

Wichtig zu wissen: Die Workflows löschen `ios/` bzw. `android/` und lassen sie von
`npx cap add` neu erzeugen. **Alles, was in diesen Ordnern eingecheckt ist, wird
bei jedem CI-Lauf verworfen.** Native Konfiguration, die den Build überleben soll,
muss deshalb im Workflow selbst gesetzt werden — dort per PlistBuddy für die
`Info.plist` und per `agvtool`/`sed` für die Xcode-Build-Settings.

Der iOS-Workflow lädt nach TestFlight hoch. Die Einreichung zur App-Store-Prüfung
erfolgt anschließend manuell in App Store Connect.

## Verzeichnisse

```
src/                    React-Anwendung
  components/           UI-Komponenten
  hooks/                React Hooks
  integrations/supabase/ Supabase-Client (einzige Instanz)
  pages/                Routen
supabase/
  functions/            Edge Functions (Deno)
  migrations/           Datenbank-Migrationen
android/  ios/          Capacitor-Plattformen (von CI neu erzeugt)
e2e/                    Playwright-Tests
```

`src/lib/supabase.ts` ist ein reiner Re-Export von
`src/integrations/supabase/client.ts`. Es gibt nur eine Client-Instanz — auf
nativen Plattformen mit Capacitor Preferences als Storage, im Browser mit
`localStorage`.

# iOS-Ready-Plan für LernZeit

Ziel: App auf den App Store bringen – ohne Mac, mit Cloud-Build (Codemagic). Sortiert nach „was geht jetzt schon ohne Apple Developer Account" → „was braucht den Account" → „Submission".

---

## Phase 1 – Code & Konfiguration vorbereiten (ohne Apple-Account möglich)

Diese Schritte kann ich vollständig in Lovable umsetzen, bevor du irgendetwas bei Apple bezahlst.

### 1.1 Capacitor-Versionen angleichen
- `@capacitor/ios` ist auf **v7.4.2**, alle anderen Capacitor-Pakete (`core`, `android`, `cli`) auf **v8**. Das führt beim `npx cap sync ios` mit hoher Wahrscheinlichkeit zu Build-Fehlern.
- Aktion: `@capacitor/ios` auf `^8.2.0` heben.

### 1.2 capacitor.config.ts iOS-Block härten
Aktuell minimal. Ergänzen:
- `ios.scheme: 'LernZeit'`
- `ios.limitsNavigationsToAppBoundDomains: true` (App Store-empfohlen)
- `ios.preferredContentMode: 'mobile'`
- SplashScreen: `iosSpinnerStyle: 'small'` ergänzen für iOS-konforme Darstellung.
- Sicherstellen, dass kein Dev-`server.url` aktiv ist (✅ bereits auskommentiert).

### 1.3 OneSignal-iOS-Vorbereitung im Code
Der Hook `useOneSignal` lädt das Cordova-Plugin generisch. Ergänzen:
- iOS-spezifische APN-Permission-Anfrage (`OneSignal.Notifications.requestPermission(true)` ist vorhanden, aber iOS verlangt zusätzlich, dass der Aufruf erst nach erfolgtem Login geschieht – aktuell so umgesetzt ✅).
- Doku-Notiz im Code, dass für iOS später ein **APNs Auth Key (.p8)** in OneSignal hochgeladen werden muss (Aufgabe für Phase 2).

### 1.4 Codemagic-YAML für iOS finalisieren
`codemagic.yaml` enthält bereits einen `ios-release`-Workflow. Anpassungen:
- `APP_STORE_APP_ID: "YOUR_APP_STORE_APP_ID"` → als TODO-Kommentar markieren (kommt aus Phase 2).
- `xcode-project use-profiles` Schritt vor dem Build ergänzen (sonst schlägt Code Signing in der Cloud fehl).
- `cocoapods: default` ist gesetzt ✅.
- Artifact-Pfade prüfen.

### 1.5 Dokumentation: `IOS_RELEASE_CHECKLIST.md`
Neue, schlanke Schritt-für-Schritt-Checkliste (ergänzend zu `IOS_CLOUD_BUILD_GUIDE.md`), nur für unsere konkrete Konfiguration:
- Bundle-ID: `de.lernzeit.app`
- App-Name: LernZeit
- Mindest-iOS: 14.0 (Capacitor 8 Default)
- Welche Secrets in Codemagic eingetragen werden müssen
- Reihenfolge der Apple-Schritte aus Phase 2

### 1.6 Lokale Vorbereitung des `ios/`-Folders dokumentieren
Da Lovable kein iOS-Folder erzeugen kann (kein Xcode), beschreibt die Checkliste:
- Repo nach GitHub exportieren
- Auf einem beliebigen Rechner (auch Linux/Windows): `npm ci && npm run build && npx cap add ios && npx cap sync ios`
- `ios/`-Ordner committen
- Ab dann übernimmt Codemagic alles weitere – kein Mac nötig.

---

## Phase 2 – Apple-Setup (sobald du den Developer-Account hast)

Diese Schritte musst du selbst bei Apple/Codemagic erledigen. Ich liefere die Anleitung in der Checkliste.

### 2.1 Apple Developer Program
- 99 USD/Jahr unter https://developer.apple.com/programs/
- Verifizierung dauert 24–48 h (bei juristischen Personen länger; D-U-N-S-Nummer nötig).

### 2.2 App Store Connect
- App anlegen mit Bundle-ID `de.lernzeit.app`
- SKU: `lernzeit-ios-001`
- Numerische **App ID** notieren → in `codemagic.yaml` als `APP_STORE_APP_ID` eintragen
- Kategorie: Bildung, Altersfreigabe: 4+
- Datenschutz-Manifest („App Privacy") basierend auf Supabase, OneSignal, Stripe ausfüllen.

### 2.3 Code Signing über Codemagic
- In Codemagic → App Settings → **App Store Connect Integration** anlegen (statt manuell mit .p12).
- Codemagic erzeugt Certificate + Provisioning Profile automatisch über die ASC-API.
- Nötig: API Key (.p8), Issuer ID, Key ID.

### 2.4 OneSignal iOS-Push aktivieren
- In Apple Developer Portal: **APNs Auth Key (.p8)** erzeugen
- In OneSignal Dashboard hochladen (App-ID `84cb5453-…` ist bereits konfiguriert)
- Push Notifications & Background Modes Capability für die App-ID aktivieren.

### 2.5 Store-Assets erstellen
Aus `APP_STORE_ASSETS_GUIDE.md` minimal nötig:
- App-Icon 1024×1024 (vorhanden ✅)
- Screenshots: mindestens 6.7" iPhone (1290×2796) und 6.5" iPhone, je 3 Stück
- Beschreibung DE, Keywords, Support-URL (`https://lernzeit.app`), Datenschutz-URL (`/datenschutz` Seite existiert ✅)

---

## Phase 3 – Build & Submission (nach Phase 2)

### 3.1 Erster TestFlight-Build über Codemagic
- iOS-Workflow in Codemagic starten
- Build wird automatisch zu TestFlight hochgeladen (`submit_to_testflight: true` ist gesetzt ✅)
- Internes Testing aktivieren, App auf eigenem iPhone via TestFlight installieren.

### 3.2 Review-Vorbereitung
- Demo-Account für Apple Reviewer anlegen (z. B. Eltern + Kind), Zugangsdaten in App-Review-Notes hinterlegen
- Hinweis: GDPR-K / Art. 8 DSGVO – „Parental Consent Flow" ist bereits implementiert ✅, in Review-Notes erklären.
- Export Compliance: keine eigene Verschlüsselung → „No" wählen.

### 3.3 Submission
- Nach erfolgreichem TestFlight: in App Store Connect „Zur Prüfung einreichen"
- Review-Dauer aktuell ca. 24–72 h.

---

## Was ich jetzt sofort umsetzen würde (Phase 1)

Vorschlag – mit deinem OK starte ich der Reihe nach:

1. `@capacitor/ios` auf v8 anheben
2. `capacitor.config.ts` iOS-Block ergänzen
3. `codemagic.yaml` iOS-Workflow härten (use-profiles Step)
4. `IOS_RELEASE_CHECKLIST.md` erzeugen mit allen Phase-2/3-Schritten in der richtigen Reihenfolge

Punkte 1.3 (OneSignal-Hook) lasse ich unverändert, da bereits korrekt – nur Doku-Kommentar.

Nichts davon kostet Geld oder erfordert den Apple-Account. Sobald Phase 1 fertig ist, kannst du in Ruhe den Developer-Account beantragen und parallel die Screenshots erstellen.
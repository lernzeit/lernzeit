# iOS Release Checkliste – LernZeit

Schlanke Schritt-für-Schritt-Anleitung für unsere konkrete Konfiguration. Ergänzt `IOS_CLOUD_BUILD_GUIDE.md`.

**Konfiguration:**
- Bundle-ID: `de.lernzeit.app`
- App-Name: LernZeit
- Mindest-iOS: 14.0 (Capacitor 8 Default)
- Cloud-Build: Codemagic (`codemagic.yaml` → Workflow `ios-release`)
- Push: OneSignal App-ID `84cb5453-b878-47ca-aa31-1ec1405bdd5d`

---

## ✅ Phase 1 – In Lovable bereits erledigt

- [x] `@capacitor/ios` auf v8 aktualisiert (passend zu @capacitor/core v8)
- [x] `capacitor.config.ts` iOS-Block gehärtet (scheme, App-Bound Domains, contentMode, iOS-Spinner)
- [x] `codemagic.yaml` iOS-Workflow um `xcode-project use-profiles` ergänzt
- [x] Diese Checkliste erstellt

---

## 📦 Phase 1.5 – Lokale ios/-Folder-Erstellung (einmalig, ohne Mac möglich)

Lovable kann den `ios/`-Ordner nicht selbst erzeugen. Auf einem beliebigen Rechner (Linux, Windows, Mac):

```bash
git pull
npm ci
npm run build
npx cap add ios
npx cap sync ios
git add ios/
git commit -m "chore: add iOS platform"
git push
```

Ab jetzt baut Codemagic alles in der Cloud – kein Mac mehr nötig.

---

## 💳 Phase 2 – Apple-Setup (sobald Developer-Account aktiv)

### 2.1 Apple Developer Program
- [ ] $99/Jahr unter https://developer.apple.com/programs/ buchen
- [ ] Verifizierung abwarten (24–48 h Privatperson; bei Firma D-U-N-S-Nummer nötig, kann 1–2 Wochen dauern)

### 2.2 App Store Connect – App anlegen
- [ ] Neue App anlegen
  - Plattform: iOS
  - Name: **LernZeit**
  - Primäre Sprache: Deutsch
  - Bundle-ID: `de.lernzeit.app` (App ID vorher unter „Identifiers" anlegen)
  - SKU: `lernzeit-ios-001`
- [ ] **Numerische App ID** notieren → in `codemagic.yaml` bei `APP_STORE_APP_ID` eintragen
- [ ] Kategorie: **Bildung**
- [ ] Altersfreigabe: **4+**

### 2.3 App Privacy Manifest ausfüllen
Datenerfassung deklarieren für:
- **Supabase** (E-Mail, User-ID, Lerndaten)
- **OneSignal** (Push-Token, Geräte-ID)
- **Stripe** (Zahlungsdaten – nur bei aktivem Abo)
- Datenschutz-URL: https://lernzeit.app/datenschutz
- Support-URL: https://lernzeit.app

### 2.4 Code Signing über Codemagic (empfohlen: automatisch via ASC-API)
- [ ] In App Store Connect → Users and Access → Integrations: API-Key (.p8) erzeugen
  - Issuer ID notieren
  - Key ID notieren
  - .p8-Datei herunterladen (nur einmal verfügbar!)
- [ ] In Codemagic → Teams → Integrations → **App Store Connect** verbinden (Name: `lernzeit_asc`)
- [ ] In Codemagic → App Settings → Code Signing Identities: „Fetch from App Store Connect" – Codemagic erzeugt Distribution Certificate + Provisioning Profile automatisch

### 2.5 OneSignal iOS-Push aktivieren
- [ ] In Apple Developer Portal → Keys → **APNs Auth Key (.p8)** erzeugen
  - Team ID + Key ID notieren
- [ ] Im App Identifier `de.lernzeit.app`: Capability **Push Notifications** aktivieren
- [ ] In OneSignal Dashboard → Settings → Apple iOS (APNs):
  - .p8-Key hochladen
  - Team ID + Key ID + Bundle-ID `de.lernzeit.app` eintragen

### 2.6 Background Modes Capability (für Push)
Wird beim ersten Build manuell in Xcode-Project nötig oder via `ios/App/App/App.entitlements`:
```xml
<key>aps-environment</key>
<string>production</string>
```
(Codemagic ergänzt das beim Signing automatisch, wenn Push in der App ID aktiv ist.)

### 2.7 Store-Assets
- [ ] App-Icon 1024×1024 (vorhanden ✅, in `ios/App/App/Assets.xcassets/AppIcon.appiconset/` einfügen)
- [ ] Screenshots:
  - **6.7"** iPhone (1290×2796) – mindestens 3, empfohlen 6
  - **6.5"** iPhone (1242×2688) – mindestens 3
  - Optional: 5.5", iPad
- [ ] App-Beschreibung DE (max. 4000 Zeichen)
- [ ] Untertitel: „Verdiene Bildschirmzeit"
- [ ] Keywords (max. 100 Zeichen, kommasepariert): `lernen,kinder,schule,bildschirmzeit,mathematik,deutsch,grundschule`
- [ ] Promo-Text (optional)

---

## 🚀 Phase 3 – Build & Submission

### 3.1 Erster TestFlight-Build
- [ ] In Codemagic Workflow `ios-release` starten
- [ ] Build wird automatisch nach TestFlight hochgeladen (ca. 30–45 Min)
- [ ] In App Store Connect → TestFlight: Build verarbeitet abwarten (15–30 Min)
- [ ] Internes Testing aktivieren → eigene Apple-ID hinzufügen
- [ ] TestFlight-App auf iPhone installieren und testen

### 3.2 Review-Vorbereitung
- [ ] **Demo-Eltern-Account** + **Demo-Kind-Account** anlegen
  - Zugangsdaten in App Store Connect → App Review Information eintragen
- [ ] Review-Notes ergänzen:
  - „Parental Consent Flow nach Art. 8 DSGVO ist implementiert"
  - „Family Link ist optional – iOS-Bildschirmzeit-Integration via Settings-Deeplink"
- [ ] **Export Compliance**: „No" (keine eigene Verschlüsselung)
- [ ] **Content Rights**: alle Inhalte selbst erstellt / lizenziert

### 3.3 Submission
- [ ] In App Store Connect → Version 1.0 → Build auswählen
- [ ] „Zur Prüfung einreichen"
- [ ] Review-Dauer aktuell ca. 24–72 h
- [ ] Bei Ablehnung: Resolution Center → Rückfragen klären, neuen Build hochladen

---

## 🔧 Codemagic Secrets – Übersicht

In Codemagic → Environment Variables / Secrets benötigt:

| Name | Quelle | Wann nötig |
|------|--------|-----------|
| App Store Connect Integration `lernzeit_asc` | Codemagic Team-Settings | Phase 2.4 |
| `APP_STORE_APP_ID` | App Store Connect (numerische ID) | Phase 2.2 |
| Distribution Certificate | Auto via ASC-API | Phase 2.4 |
| Provisioning Profile | Auto via ASC-API | Phase 2.4 |

---

## 💡 Tipps

- **Erst TestFlight, dann Store**: Spart Reject-Schleifen.
- **Family Link iOS-Äquivalent**: Auf iOS verweisen wir bereits auf System-Bildschirmzeit (`App-prefs:SCREEN_TIME`) – in Review-Notes erwähnen.
- **OneSignal vor erstem Push testen**: APNs-Sandbox vs. Production unterscheidet sich – TestFlight-Builds nutzen Production-APNs.

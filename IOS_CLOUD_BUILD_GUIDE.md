# iOS Cloud Build Guide für LernZeit

Da du keinen Mac mit Xcode hast, zeigt diese Anleitung, wie du iOS-Builds über Cloud-Dienste erstellen kannst.

---

## Übersicht der Optionen

| Dienst | Kosten | Schwierigkeit | Empfohlen |
|--------|--------|---------------|-----------|
| Codemagic | Gratis-Tier verfügbar | Einfach | ⭐⭐⭐ |
| GitHub Actions | 2000 Min/Monat gratis | Mittel | ⭐⭐ |
| Bitrise | Gratis-Tier verfügbar | Mittel | ⭐⭐ |
| MacStadium | Ab $99/Monat | Komplex | ⭐ |

---

## Option 1: Codemagic (Empfohlen)

Codemagic ist speziell für mobile App-Builds optimiert und bietet einen großzügigen Gratis-Tier.

### Schritt 1: Account erstellen

1. Gehe zu [codemagic.io](https://codemagic.io)
2. "Sign up" mit GitHub-Account
3. Autorisiere den Zugriff auf deine Repositories

### Schritt 2: App hinzufügen

1. "Add application" klicken
2. GitHub-Repository auswählen
3. "Capacitor/Ionic" als Projekttyp wählen

### Schritt 3: iOS-Signierung einrichten

Für iOS-Builds brauchst du:
- Apple Developer Account ($99/Jahr)
- Signing Certificate
- Provisioning Profile

**Certificates erstellen:**

1. Gehe zu [Apple Developer Portal](https://developer.apple.com/account)
2. Certificates, Identifiers & Profiles → Certificates
3. "+" klicken → "iOS Distribution" wählen
4. CSR (Certificate Signing Request) erstellen:
   - In Codemagic: Team Settings → Code Signing → "Generate CSR"
   - CSR bei Apple hochladen
   - Certificate herunterladen

**App ID erstellen:**

1. Identifiers → "+" klicken
2. "App IDs" → Continue
3. Bundle ID: `de.lernzeit.app`
4. App Name: LernZeit

**Provisioning Profile erstellen:**

1. Profiles → "+" klicken
2. "App Store" Distribution wählen
3. App ID auswählen
4. Certificate auswählen
5. Profil herunterladen

### Schritt 4: Credentials in Codemagic hochladen

1. Codemagic → App Settings → Code Signing
2. iOS code signing:
   - Distribution certificate (.p12) hochladen
   - Provisioning Profile hochladen
   - Apple Developer Portal Credentials eingeben

### Schritt 5: codemagic.yaml erstellen

Erstelle diese Datei im Projekt-Root:

```yaml
workflows:
  ios-release:
    name: iOS Release
    max_build_duration: 60
    instance_type: mac_mini_m1
    
    environment:
      ios_signing:
        distribution_type: app_store
        bundle_identifier: de.lernzeit.app
      vars:
        XCODE_PROJECT: "ios/App/App.xcodeproj"
        XCODE_SCHEME: "App"
      node: 18
    
    scripts:
      - name: Install dependencies
        script: |
          npm install
      
      - name: Build web app
        script: |
          npm run build
      
      - name: Add iOS platform
        script: |
          npx cap add ios || true
          npx cap sync ios
      
      - name: Install CocoaPods
        script: |
          cd ios/App && pod install
      
      - name: Build iOS
        script: |
          xcode-project build-ipa \
            --workspace "ios/App/App.xcworkspace" \
            --scheme "App" \
            --archive-flags="-destination 'generic/platform=iOS'"
    
    artifacts:
      - build/ios/ipa/*.ipa
      - /tmp/xcodebuild_logs/*.log
    
    publishing:
      app_store_connect:
        api_key: $APP_STORE_CONNECT_API_KEY
        submit_to_testflight: true
        submit_to_app_store: false
```

### Schritt 6: Build starten

1. Push die `codemagic.yaml` zu GitHub
2. In Codemagic: "Start new build"
3. "ios-release" Workflow auswählen
4. Build starten

### Schritt 7: IPA zu App Store Connect hochladen

Nach erfolgreichem Build:
1. IPA-Datei von Codemagic herunterladen
2. Mit [Transporter](https://apps.apple.com/app/transporter/id1450874784) hochladen
   - Oder: Codemagic kann direkt zu TestFlight publishen

---

## Option 2: GitHub Actions

GitHub bietet macOS-Runner für iOS-Builds.

### Schritt 1: Secrets einrichten

In GitHub → Repository → Settings → Secrets:

```
IOS_P12_BASE64          # Base64-encoded .p12 Certificate
IOS_P12_PASSWORD        # Certificate Passwort
IOS_PROVISION_PROFILE   # Base64-encoded Provisioning Profile
APPSTORE_API_KEY        # App Store Connect API Key (JSON)
```

### Schritt 2: Workflow erstellen

Erstelle `.github/workflows/ios-build.yml`:

```yaml
name: iOS Build

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-ios:
    runs-on: macos-14
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build web app
        run: npm run build
      
      - name: Add iOS platform
        run: |
          npx cap add ios || true
          npx cap sync ios
      
      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true
      
      - name: Install CocoaPods
        run: |
          cd ios/App
          pod install
      
      - name: Import Code Signing
        env:
          IOS_P12_BASE64: ${{ secrets.IOS_P12_BASE64 }}
          IOS_P12_PASSWORD: ${{ secrets.IOS_P12_PASSWORD }}
          IOS_PROVISION_PROFILE: ${{ secrets.IOS_PROVISION_PROFILE }}
        run: |
          # Create keychain
          security create-keychain -p "" build.keychain
          security default-keychain -s build.keychain
          security unlock-keychain -p "" build.keychain
          security set-keychain-settings -t 3600 -u build.keychain
          
          # Import certificate
          echo "$IOS_P12_BASE64" | base64 --decode > certificate.p12
          security import certificate.p12 -k build.keychain -P "$IOS_P12_PASSWORD" -T /usr/bin/codesign
          security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "" build.keychain
          
          # Install provisioning profile
          mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
          echo "$IOS_PROVISION_PROFILE" | base64 --decode > ~/Library/MobileDevice/Provisioning\ Profiles/profile.mobileprovision
      
      - name: Build iOS App
        run: |
          cd ios/App
          xcodebuild -workspace App.xcworkspace \
            -scheme App \
            -configuration Release \
            -archivePath build/App.xcarchive \
            archive
          
          xcodebuild -exportArchive \
            -archivePath build/App.xcarchive \
            -exportPath build/ipa \
            -exportOptionsPlist ExportOptions.plist
      
      - name: Upload IPA
        uses: actions/upload-artifact@v4
        with:
          name: ios-ipa
          path: ios/App/build/ipa/*.ipa
```

### Schritt 3: ExportOptions.plist erstellen

Erstelle `ios/App/ExportOptions.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>DEIN_TEAM_ID</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>
```

---

## Certificates und Profiles ohne Mac erstellen

### Mit Codemagic:
1. Team Settings → Code Signing → iOS
2. "Generate new certificate" (erstellt CSR automatisch)
3. Folge den Anweisungen

### Mit OpenSSL (Windows/Linux):

```bash
# Private Key erstellen
openssl genrsa -out ios_distribution.key 2048

# CSR erstellen
openssl req -new -key ios_distribution.key -out ios_distribution.csr \
  -subj "/emailAddress=deine@email.de/CN=Dein Name/C=DE"

# CSR bei Apple hochladen, Certificate (.cer) herunterladen

# .cer zu .pem konvertieren
openssl x509 -inform DER -in ios_distribution.cer -out ios_distribution.pem

# .p12 erstellen
openssl pkcs12 -export -out ios_distribution.p12 \
  -inkey ios_distribution.key -in ios_distribution.pem
```

---

## App Store Connect Einrichtung

### Schritt 1: App erstellen

1. Gehe zu [App Store Connect](https://appstoreconnect.apple.com)
2. "Meine Apps" → "+" → "Neue App"
3. Plattformen: iOS
4. Name: LernZeit
5. Primäre Sprache: Deutsch
6. Bundle-ID: de.lernzeit.app
7. SKU: lernzeit-ios-001

### Schritt 2: App-Informationen ausfüllen

**Allgemein:**
- Untertitel: "Verdiene Bildschirmzeit"
- Kategorie: Bildung

**Preisinformationen:**
- Preis: Gratis

**App-Datenschutz:**
- Datenschutzrichtlinien-URL angeben
- Datenerfassung deklarieren

### Schritt 3: Version vorbereiten

- Screenshots hochladen (alle erforderlichen Größen)
- Beschreibung eingeben
- Keywords hinzufügen
- Support-URL angeben
- Kontaktinformationen

### Schritt 4: Build hochladen und einreichen

1. IPA über Transporter oder CI/CD hochladen
2. Build in App Store Connect auswählen
3. Export-Compliance beantworten
4. "Zur Überprüfung einreichen"

---

## Checkliste für iOS Release

- [ ] Apple Developer Account aktiv ($99/Jahr)
- [ ] App ID erstellt (de.lernzeit.app)
- [ ] Distribution Certificate erstellt
- [ ] Provisioning Profile erstellt
- [ ] Cloud-Build-Service eingerichtet
- [ ] App in App Store Connect erstellt
- [ ] Screenshots für alle erforderlichen Größen
- [ ] Beschreibungstexte geschrieben
- [ ] Datenschutz-URL funktioniert
- [ ] Altersfreigabe ausgefüllt
- [ ] Erste Build hochgeladen und getestet

---

## Zeitschätzung

| Schritt | Dauer |
|---------|-------|
| Apple Developer Account | 1-2 Tage (Verifizierung) |
| Certificates erstellen | 30 Min |
| Cloud-Build einrichten | 1-2 Stunden |
| Erster erfolgreicher Build | 1-2 Stunden |
| App Store Connect Setup | 1-2 Stunden |
| Review-Prozess | 1-7 Tage |

**Gesamt: ca. 1-2 Wochen** bis zur Veröffentlichung

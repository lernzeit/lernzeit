# Android Build Guide für LernZeit

Diese Anleitung erklärt Schritt für Schritt, wie du die LernZeit-App für den Google Play Store baust.

---

## Voraussetzungen

- [ ] Node.js installiert (v18+)
- [ ] Android Studio installiert
- [ ] Java JDK 17 installiert
- [ ] Git installiert
- [ ] Google Play Developer Account ($25 einmalig)

---

## Schritt 1: Projekt von GitHub klonen

```bash
# Repository klonen
git clone https://github.com/DEIN-USERNAME/DEIN-REPO-NAME.git
cd DEIN-REPO-NAME

# Dependencies installieren
npm install
```

---

## Schritt 2: Android-Plattform hinzufügen

```bash
# Android-Plattform zu Capacitor hinzufügen
npx cap add android
```

Dies erstellt den `android/` Ordner mit dem nativen Projekt.

---

## Schritt 3: Web-App für Production bauen

```bash
# Production Build erstellen
npm run build
```

Dies erstellt den `dist/` Ordner mit der optimierten Web-App.

---

## Schritt 4: Sync zu Android

```bash
# Änderungen zu Android synchronisieren
npx cap sync android
```

Dieser Befehl:
- Kopiert den `dist/` Ordner in das Android-Projekt
- Aktualisiert Capacitor-Plugins
- Aktualisiert Gradle-Dependencies

---

## Schritt 5: In Android Studio öffnen

```bash
# Android Studio mit dem Projekt öffnen
npx cap open android
```

Oder manuell: Android Studio → Open → `android/` Ordner auswählen

---

## Schritt 6: App-ID und Version prüfen

Überprüfe in `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        applicationId "de.lernzeit.app"
        versionCode 1
        versionName "1.0.0"
        // ...
    }
}
```

**Wichtig:** 
- `versionCode` muss bei jedem Update erhöht werden (1, 2, 3, ...)
- `versionName` ist die angezeigte Version (1.0.0, 1.0.1, 1.1.0, ...)

---

## Schritt 7: Keystore erstellen (einmalig)

Ein Keystore ist erforderlich, um die App zu signieren. **BEWAHRE DIESEN SICHER AUF!**

### Option A: Über Android Studio
1. Build → Generate Signed Bundle / APK
2. "Create new..." klicken
3. Keystore-Informationen ausfüllen:
   - **Key store path:** z.B. `~/lernzeit-keystore.jks`
   - **Password:** Sicheres Passwort wählen
   - **Alias:** `lernzeit-release`
   - **Validity:** 25 Jahre empfohlen
   - **Certificate:** Deine Informationen eingeben

### Option B: Über Kommandozeile
```bash
keytool -genkey -v -keystore lernzeit-keystore.jks -keyalg RSA -keysize 2048 -validity 9125 -alias lernzeit-release
```

⚠️ **WICHTIG:** 
- Speichere den Keystore an einem sicheren Ort
- Notiere dir Passwort und Alias
- Wenn du den Keystore verlierst, kannst du keine Updates mehr veröffentlichen!

---

## Schritt 8: Release Build erstellen

### Option A: Android App Bundle (AAB) - Empfohlen für Play Store

1. In Android Studio: Build → Generate Signed Bundle / APK
2. "Android App Bundle" auswählen
3. Keystore auswählen und Passwörter eingeben
4. "release" Build-Variante auswählen
5. Finish klicken

Die AAB-Datei findest du unter:
`android/app/build/outputs/bundle/release/app-release.aab`

### Option B: APK (für direkten Download/TestingE)

1. In Android Studio: Build → Generate Signed Bundle / APK
2. "APK" auswählen
3. Keystore auswählen
4. "release" Build-Variante auswählen
5. Finish klicken

Die APK findest du unter:
`android/app/build/outputs/apk/release/app-release.apk`

---

## Schritt 9: App Icons hinzufügen

Die Icons müssen in folgende Ordner kopiert werden:

```
android/app/src/main/res/
├── mipmap-mdpi/
│   └── ic_launcher.png (48x48)
├── mipmap-hdpi/
│   └── ic_launcher.png (72x72)
├── mipmap-xhdpi/
│   └── ic_launcher.png (96x96)
├── mipmap-xxhdpi/
│   └── ic_launcher.png (144x144)
├── mipmap-xxxhdpi/
│   └── ic_launcher.png (192x192)
```

**Tipp:** Nutze https://icon.kitchen/ um alle Größen automatisch zu generieren.

---

## Schritt 10: In Google Play Console hochladen

1. Gehe zu [Google Play Console](https://play.google.com/console)
2. "App erstellen" klicken
3. App-Details ausfüllen:
   - App-Name: LernZeit
   - Standardsprache: Deutsch
   - App oder Spiel: App
   - Kostenlos oder kostenpflichtig: Kostenlos

4. **Store-Eintrag ausfüllen:**
   - Kurzbeschreibung (max. 80 Zeichen)
   - Vollständige Beschreibung
   - Screenshots hochladen
   - Feature Graphic hochladen
   - App-Icon hochladen

5. **Inhaltsbewertung:**
   - Fragebogen ausfüllen
   - Für Kinder-Apps: "Designed for Families" beantragen

6. **Datenschutzrichtlinie:**
   - URL zu deiner Datenschutzseite angeben
   - z.B. `https://lernzeit.lovable.app/datenschutz`

7. **AAB hochladen:**
   - Release → Production → "Neue Release erstellen"
   - AAB-Datei hochladen
   - Release-Notizen hinzufügen
   - "Überprüfung starten" klicken

---

## Schritt 11: Review-Prozess

- Google prüft die App (normalerweise 1-3 Tage)
- Bei Problemen erhältst du eine E-Mail mit Details
- Nach Genehmigung ist die App im Store verfügbar

---

## Häufige Probleme und Lösungen

### Problem: "App not installed"
- Stelle sicher, dass die APK signiert ist
- Prüfe, ob "Unbekannte Quellen" aktiviert ist (nur für direkten APK-Test)

### Problem: Build-Fehler in Android Studio
```bash
# Gradle Cache leeren
cd android
./gradlew clean
cd ..
npx cap sync android
```

### Problem: "Duplicate class" Fehler
```bash
# Dependencies aktualisieren
npx cap update android
```

### Problem: Icons werden nicht angezeigt
- Prüfe, ob alle Icon-Dateien korrekt benannt sind
- Führe "Sync Project with Gradle Files" in Android Studio aus

---

## Nützliche Befehle

```bash
# Projekt neu synchronisieren
npx cap sync android

# Android Studio öffnen
npx cap open android

# Live-Reload für Entwicklung aktivieren
# (Nur für Entwicklung, nicht für Store-Build!)
npx cap run android --livereload --external
```

---

## Checkliste vor dem Upload

- [ ] App-ID ist `de.lernzeit.app`
- [ ] versionCode und versionName sind korrekt
- [ ] Alle App-Icons in richtigen Größen
- [ ] AAB ist signiert
- [ ] Screenshots erstellt
- [ ] Feature Graphic (1024x500) erstellt
- [ ] Datenschutz-URL funktioniert
- [ ] Beschreibungstexte geschrieben
- [ ] Inhaltsbewertung ausgefüllt
- [ ] App getestet auf echtem Gerät

---

## Nächste Updates veröffentlichen

Bei jedem Update:

1. `versionCode` in `build.gradle` erhöhen
2. `versionName` anpassen (z.B. 1.0.1)
3. `npm run build`
4. `npx cap sync android`
5. Neues AAB generieren
6. In Play Console hochladen

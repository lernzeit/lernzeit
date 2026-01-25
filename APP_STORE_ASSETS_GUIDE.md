# App Store Assets Guide für LernZeit

## Übersicht
Diese Anleitung erklärt, welche Assets für Apple App Store und Google Play Store benötigt werden.

---

## 1. App-Icons

### 1.1 iOS App Icons (alle erforderlich)

Erstelle ein quadratisches Icon (1024x1024px) und skaliere es auf folgende Größen:

| Größe | Verwendung | Dateiname |
|-------|------------|-----------|
| 20x20 | iPad Notifications | Icon-20.png |
| 29x29 | Settings | Icon-29.png |
| 40x40 | Spotlight | Icon-40.png |
| 58x58 | Settings @2x | Icon-29@2x.png |
| 60x60 | iPhone App @2x | Icon-60.png |
| 76x76 | iPad App | Icon-76.png |
| 80x80 | Spotlight @2x | Icon-40@2x.png |
| 87x87 | Settings @3x | Icon-29@3x.png |
| 120x120 | iPhone App @2x, Spotlight @3x | Icon-60@2x.png |
| 152x152 | iPad App @2x | Icon-76@2x.png |
| 167x167 | iPad Pro App @2x | Icon-83.5@2x.png |
| 180x180 | iPhone App @3x | Icon-60@3x.png |
| 1024x1024 | App Store | Icon-1024.png |

**Wichtig für iOS:**
- Keine Transparenz erlaubt
- Keine abgerundeten Ecken (iOS macht das automatisch)
- Keine Alpha-Kanäle

### 1.2 Android App Icons

| Größe | Dichte | Ordner |
|-------|--------|--------|
| 48x48 | mdpi | res/mipmap-mdpi/ |
| 72x72 | hdpi | res/mipmap-hdpi/ |
| 96x96 | xhdpi | res/mipmap-xhdpi/ |
| 144x144 | xxhdpi | res/mipmap-xxhdpi/ |
| 192x192 | xxxhdpi | res/mipmap-xxxhdpi/ |
| 512x512 | Play Store | (Upload direkt) |

**Android Adaptive Icons:**
- Foreground Layer: 108x108dp (432x432px bei xxxhdpi)
- Background Layer: 108x108dp
- Safe Zone: 66dp Durchmesser in der Mitte

---

## 2. Splash Screens

### 2.1 iOS Launch Screens
Moderne iOS Apps nutzen einen Storyboard-basierten Launch Screen. Die Konfiguration erfolgt in:
`ios/App/App/Base.lproj/LaunchScreen.storyboard`

### 2.2 Android Splash Screens
Capacitor konfiguriert dies automatisch über `capacitor.config.ts`:
```typescript
SplashScreen: {
  launchShowDuration: 2000,
  backgroundColor: '#3b82f6',
  showSpinner: true,
  spinnerColor: '#ffffff'
}
```

---

## 3. Store Screenshots

### 3.1 Apple App Store Screenshots

**Erforderliche Größen:**
| Gerät | Auflösung | Erforderlich |
|-------|-----------|--------------|
| iPhone 6.7" (15 Pro Max) | 1290 x 2796 | ✅ Ja |
| iPhone 6.5" (14 Plus) | 1284 x 2778 | ✅ Ja |
| iPhone 5.5" (8 Plus) | 1242 x 2208 | Optional |
| iPad Pro 12.9" | 2048 x 2732 | Falls iPad unterstützt |

**Anforderungen:**
- Mindestens 3 Screenshots pro Gerätegröße
- Maximum 10 Screenshots
- PNG oder JPEG
- Keine Alpha-Transparenz

**Empfohlene Screenshots für LernZeit:**
1. Startbildschirm mit Logo und Tagline
2. Fächerauswahl-Bildschirm
3. Aktive Lernaufgabe (Mathe)
4. Erfolgsbildschirm mit verdienter Zeit
5. Eltern-Dashboard (falls relevant)
6. Achievements-Übersicht

### 3.2 Google Play Store Screenshots

**Anforderungen:**
- Minimum: 2 Screenshots
- Maximum: 8 Screenshots
- Größe: 320px - 3840px pro Seite
- Seitenverhältnis: 16:9 oder 9:16
- PNG oder JPEG (max 8MB)

**Feature Graphic (Pflicht):**
- Größe: 1024 x 500 px
- Wird oben im Store-Eintrag angezeigt

**Promo Video (optional):**
- YouTube-Link
- 30 Sekunden - 2 Minuten empfohlen

---

## 4. Store-Beschreibungstexte

### 4.1 App-Titel
- **iOS:** Max. 30 Zeichen
- **Android:** Max. 30 Zeichen
- **Empfehlung:** "LernZeit"

### 4.2 Untertitel (nur iOS)
- Max. 30 Zeichen
- **Empfehlung:** "Verdiene Bildschirmzeit"

### 4.3 Kurzbeschreibung (nur Android)
- Max. 80 Zeichen
- **Empfehlung:** "Löse Lernaufgaben und verdiene Handyzeit! Für Klasse 1-10."

### 4.4 Vollständige Beschreibung

```
LernZeit - Die clevere Lern-App für motiviertes Lernen!

🎯 DAS KONZEPT
Kinder lösen Lernaufgaben und verdienen damit Bildschirmzeit. Ein einfaches aber effektives System, das Lernen belohnt und Kinder motiviert.

📚 FÄCHER
• Mathematik (Klasse 1-10)
• Deutsch
• Englisch
• Naturwissenschaften (Physik, Chemie, Biologie)
• Geschichte & Geographie

⭐ FUNKTIONEN
• Tausende altersgerechte Aufgaben
• Anpassbare Belohnungseinstellungen
• Fortschrittsverfolgung für Eltern
• Achievements und Motivationselemente
• Sichere Eltern-Kind-Verknüpfung
• Offline-Modus verfügbar

👨‍👩‍👧‍👦 FÜR ELTERN
• Volle Kontrolle über Bildschirmzeit-Einstellungen
• Einblick in Lernfortschritte
• Anpassbare Zeit pro richtig gelöster Aufgabe
• Einfache Verknüpfung über Einladungscode

🔒 SICHERHEIT
• DSGVO-konform
• Keine Werbung
• Kindgerechte Inhalte
• Datenschutz hat höchste Priorität

Laden Sie LernZeit herunter und machen Sie Lernen zur Belohnung!
```

### 4.5 Keywords (nur iOS)
- Max. 100 Zeichen, kommagetrennt
- **Empfehlung:** `Lernen,Bildschirmzeit,Mathe,Schule,Kinder,Hausaufgaben,Belohnung,Eltern,Kontrolle`

---

## 5. Kategorien und Altersfreigabe

### 5.1 App Store Kategorie
- **Primär:** Bildung
- **Sekundär:** Familie

### 5.2 Play Store Kategorie
- **Kategorie:** Bildung
- **Tags:** Lernen, Kinder, Schule, Mathematik

### 5.3 Altersfreigabe
- **iOS:** 4+ (keine anstößigen Inhalte)
- **Android:** USK 0 / PEGI 3 (für alle Altersgruppen)

**"Designed for Families" (Google Play):**
Die App sollte am "Designed for Families"-Programm teilnehmen, da sie für Kinder gedacht ist.

---

## 6. Tools zur Asset-Erstellung

### Icon-Generatoren (Online)
1. **App Icon Generator** - https://appicon.co/
2. **MakeAppIcon** - https://makeappicon.com/
3. **Icon Kitchen** - https://icon.kitchen/

### Screenshot-Tools
1. **Rotato** - 3D Device Mockups
2. **Previewed** - App Store Screenshots
3. **AppLaunchpad** - Screenshot Generator
4. **Figma/Canva** - Manuelle Erstellung

### Empfohlener Workflow
1. Erstelle ein 1024x1024px Master-Icon in Figma/Canva
2. Nutze einen Icon-Generator für alle Größen
3. Erstelle Screenshots auf einem echten Gerät oder Emulator
4. Füge Text-Overlays mit einem Design-Tool hinzu
5. Exportiere in den richtigen Größen

---

## 7. Checkliste vor dem Upload

### Icons
- [ ] iOS: Alle 13 Icon-Größen erstellt
- [ ] Android: Alle 6 Icon-Größen erstellt
- [ ] Keine Transparenz in iOS-Icons
- [ ] Adaptive Icons für Android vorbereitet

### Screenshots
- [ ] Mindestens 3 Screenshots pro erforderlicher Größe
- [ ] Feature Graphic für Play Store (1024x500)
- [ ] Texte in Screenshots sind lesbar
- [ ] Screenshots zeigen Kernfunktionen

### Texte
- [ ] App-Titel (max. 30 Zeichen)
- [ ] Kurzbeschreibung (max. 80 Zeichen)
- [ ] Vollständige Beschreibung
- [ ] Keywords vorbereitet

### Rechtliches
- [ ] Datenschutz-URL öffentlich erreichbar
- [ ] Impressum vollständig ausgefüllt
- [ ] Nutzungsbedingungen fertig

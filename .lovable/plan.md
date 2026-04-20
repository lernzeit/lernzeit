

## Family Link auf Android direkt öffnen

### Problem
- `AppLauncher.canOpenUrl({ url: 'https://...' })` interpretiert den String auf Android als **Package-Name** und schlägt deshalb immer fehl ("Package name '…' not found").
- Selbst wenn Family Link installiert ist, wird die App nie als „verfügbar" erkannt — wir landen direkt im Web-Fallback.
- Capacitor AppLauncher unterstützt auf Android explizit Package-Namen sowohl bei `canOpenUrl` als auch bei `openUrl` — genau das nutzen wir noch nicht.

### Lösung
Zweistufige Strategie in `src/services/parentalControls/android.ts`:

1. **Prüfung & Direktstart per Package-Name**
   - `canOpenUrl({ url: 'com.google.android.apps.kids.familylink' })`
   - Wenn `value === true` → `openUrl({ url: 'com.google.android.apps.kids.familylink' })` öffnet Family Link direkt (Launch-Intent).
2. **Fallback bei nicht installierter App**
   - Versuche `market://details?id=com.google.android.apps.kids.familylink` (Play Store App).
   - Danach Web-Play-Store `https://play.google.com/store/apps/details?id=...`.
   - Letzter Fallback: `https://families.google.com/familylink/` über `@capacitor/browser`.

### AndroidManifest – Package Visibility (Android 11+)
Damit `canOpenUrl` mit dem Package-Namen ab Android 11 überhaupt zuverlässig antwortet, muss `android/app/src/main/AndroidManifest.xml` im `<queries>`-Block ergänzt werden:

```xml
<queries>
  <package android:name="com.google.android.apps.kids.familylink" />
  <intent>
    <action android:name="android.intent.action.VIEW" />
    <data android:scheme="market" />
  </intent>
  <intent>
    <action android:name="android.intent.action.VIEW" />
    <data android:scheme="https" android:host="play.google.com" />
  </intent>
</queries>
```

### Diagnose-Logging anpassen
- `probeUrl` zusätzlich für den Package-Namen aufrufen und Ergebnis loggen.
- URL-basierte Probes (https://families.google.com/...) entfernen, da sie auf Android nur Rauschen erzeugen.

### Geänderte / berührte Dateien
- `src/services/parentalControls/android.ts` — neue Logik (Package-Name first, dann market/web Fallback).
- `android/app/src/main/AndroidManifest.xml` — `<queries>` ergänzen.

### Nach dem Merge auf dem Gerät
1. `git pull`
2. `npm run build`
3. `npx cap sync android`
4. Neuen Build auf Gerät installieren und Family-Link-Button testen.

### Erwartete Logcat-Ausgabe
```text
[ParentalControls] 🔎 canOpenUrl(FamilyLink package) → true
[ParentalControls] ✅ Opened Family Link via package name
```


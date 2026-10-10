# Release 2.0 – Prüfung vom 05.10.2026

## Vor dem Build

| Plattform | Schritt |
|---|---|
| iOS | `codemagic.yaml`: `IOS_MARKETING_VERSION: "2.0"` (gesetzt). Workflow `ios-release` von Hand starten. |
| Android | In Android Studio `android/app/build.gradle`: `versionCode 18`, `versionName "2.0"` (steht auf 17 / "1.3.0"). Danach `git pull`, `npm install`, `npm run build`, `npx cap sync android`. |
| Beide | Keine `.npmrc` mit `legacy-peer-deps` (05.10.2026 wieder entfernt): Damit fehlte bei frischem `npm install` in Codemagic `ajv` 8, der Build brach ab. Lokal nachgestellt: frisches `npm install` → Capacitor-Update → `npm run build` läuft, ebenso `npm ci`. |

## Auf dem Gerät prüfen (je iPhone und Android)

Kind
- [ ] Start: Uhr, „Lernen starten“, Lernpläne, Tagesaufgabe, „Deine Erfolge“ (Pflanze, Erfolge). Keine Hefte mehr auf dem Start.
- [ ] Pflanze antippen → Stufen-Dialog. Erfolge antippen → Erfolge-Liste.
- [ ] „Lernen starten“ → Fächer-Seite mit Heften, „Gestalten“ öffnet Farben/Sticker.
- [ ] Lernplan antippen → Fragen nur zum Planthema; Plan startet am ersten Öffnen (Tag 1).
- [ ] Runde mit Ziffernfeld, Auswahl, Sortieren, Zuordnen; Tastatur verdeckt „Prüfen“ nicht.
- [ ] „Lösung zeigen“ → „Kein Problem.“ und die Lösung.
- [ ] Bildschirmzeit anfragen → Hinweis „Anfrage gesendet“.

Eltern
- [ ] Push zur Anfrage kommt an; „Genehmigen“ → rote Zahl an „Heute“/„Kinder“ verschwindet sofort.
- [ ] Kinder → Kind → Lernplan: Knopf **Kamera** öffnet direkt die Kamera (Android: vorher gab es dort nur die Galerie), **Galerie** öffnet die Fotos. Hochkant-Foto erscheint richtig herum. Plan erstellen.
- [ ] Abo-Reiter: in der App kein „Abo kündigen“, keine Links zu Widerruf/Kündigen (nur Web). „Abo verwalten“ öffnet die Store-Abos.
- [ ] Konto: Push-Zeiten, Lern-Erinnerung, Abmelden.

## Was der Betreiber noch tun muss

1. **Repo ist öffentlich** (GitHub meldet `visibility: public`). Auf privat stellen: GitHub → Settings → General → Danger Zone → Change visibility.
2. **Passwörter der Review-Konten ändern** (Eltern- und Kind-Konto für Apple/Google). Sie standen bis heute im öffentlichen Repo (`e2e/`). Neue Werte in App Store Connect und Play Console bei den Review-Informationen eintragen, für e2e als `E2E_*`-Variablen.
3. Supabase-Dashboard: doppelten Cron-Auftrag `push-hourly-dispatch` (Nutzer `supabase_read_only_user`) löschen – er wird stündlich mit 401 abgewiesen, schadet nicht. Unter Auth: „Leaked password protection“ einschalten, OTP-Ablauf unter 1 Stunde, Postgres-Update einspielen.
4. Tabelle `zz_claude_testfotos` löschen (Testrest).

## Android: Offene Hinweise aus der Play Console (10.10.2026)

- **DEX-Codeoptimierung 0 % – Frist Februar 2027 (mindestens 25 %).** Ursache: pauschale
  `-keep … { *; }` für `com.google.android.gms`, `com.google.firebase`, `com.onesignal` in
  `android/app/proguard-rules.pro`. Diese Bibliotheken bringen eigene Consumer-Regeln mit; die
  Capacitor-Regeln bleiben. Nach 2.0.1: Regeln eingrenzen, Testbuild (Push, Google-/Apple-Anmeldung,
  Kauf, Biometrie), dann hochladen.
- Symboldatei fehlt (Warnung bei versionCode 18): in `android/app/build.gradle` unter
  `buildTypes.release` `ndk { debugSymbolLevel 'SYMBOL_TABLE' }` ergänzen (nächster Build).
- Randlose Anzeige (Android 15): nur Empfehlungen, kommen aus Capacitor/Plugins. Auf einem
  Android-15-Gerät prüfen, ob oben/unten Inhalt verdeckt ist.

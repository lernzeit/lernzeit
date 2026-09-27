# LernZeit — Hinweise für Claude

## Wie gebaut und ausgeliefert wird

| Plattform | Weg |
|---|---|
| Web | Push auf `main` → Lovable übernimmt → Veröffentlichen per Lovable (`deploy_project`) |
| iOS | Codemagic, Workflow `ios-release`, **von Hand gestartet** → TestFlight |
| Android | **Android Studio beim Betreiber**, aus dem Ordner `android/` dieses Repos |
| Edge Functions | Lovable spielt sie **selbst** neu ein, sobald es einen Commit übernimmt, der `supabase/functions/` ändert — dann alle Funktionen aus `main` (beobachtet am 27.09.2026, 10:01 und 18:41 UTC). Sofort per Supabase-MCP (`deploy_edge_function`, mit allen importierten Dateien aus `_shared/`) nur, wenn es nicht warten kann |

Folgen daraus:

- Vor jedem Android-Studio-Build: `git pull`, `npm install`, `npm run build`,
  `npx cap sync android`. Der Web-Teil der App
  (`android/app/src/main/assets/public`) steht nicht im Repo — ohne Build und
  Sync läuft die Android-App mit altem Code, auch wenn `main` neu ist.
- Für Android gilt, was in `android/` im Repo steht — auch
  `android/app/src/main/AndroidManifest.xml` (App-Links für lernzeit.app,
  Schema `de.lernzeit.app`). Der Codemagic-Workflow `android-release` wird
  nicht benutzt; er würde `android/` löschen und neu erzeugen.
- iOS dagegen entsteht bei jedem Build neu (`npx cap add ios`). Änderungen an
  `Info.plist`, Entitlements oder Projektdatei gehören deshalb in die Patch-
  Schritte von `codemagic.yaml`, nicht in den Ordner `ios/`.
- Web-Änderungen erreichen die Apps erst mit einem neuen App-Build — die Apps
  enthalten den Web-Teil fest eingebaut.
- Eine Edge Function, die nur per MCP eingespielt wurde und nicht in `main`
  steht, überschreibt Lovable beim nächsten Commit auf `supabase/functions/`.
  Was live laufen soll, gehört deshalb immer auch nach `main`.

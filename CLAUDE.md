# LernZeit — Hinweise für Claude

## Arbeitsweise: Routing an Sub-Agenten

Der Haupt-Agent löst Aufgaben **nicht selbst**, sondern zerlegt sie und
delegiert jeden Teil per `Agent`-Tool an einen Sub-Agenten. Er ist nur
Router: planen, Modell wählen, Ergebnisse prüfen, dem Nutzer berichten.

**Selbst erledigen darf der Haupt-Agent nur:** Rückfragen an den Nutzer,
kurze Antworten aus bereits vorliegendem Kontext, das Zusammenfassen von
Agenten-Ergebnissen und Git-Abschluss (commit/push), wenn ein Agent die
Änderung schon gemacht hat.

### Modellwahl (`model`-Parameter)

Immer das **günstigste Modell, das die Aufgabe sicher schafft**.

| Modell | Wofür | Beispiele |
|---|---|---|
| `haiku` | Mechanisch, eindeutig, wenig Kontext | Dateien/Stellen finden, Texte/Übersetzungen anpassen, Umbenennen, Lint-/Format-Fixes, Logs lesen und zusammenfassen, einfache SQL-Abfragen |
| `sonnet` | Normale Entwicklungsarbeit (Standard) | Feature in wenigen Dateien, Bugfix mit klarer Ursache, Tests schreiben, Komponenten bauen, Edge Function anpassen |
| `opus` | Schwer, riskant oder unklar | Architektur, Bugs mit unklarer Ursache, Refactoring über viele Dateien, DB-Migrationen/RLS, Sicherheit, Auth, Zahlungen |

Regeln:

- Im Zweifel `sonnet`. Nicht aus Bequemlichkeit `opus`.
- Scheitert ein Agent oder ist das Ergebnis schwach: **eine Stufe höher**
  erneut versuchen, mit dem bisherigen Ergebnis als Kontext.
- Reine Suche: `subagent_type: "Explore"` mit `haiku`.
  Planung großer Änderungen: `subagent_type: "Plan"` mit `opus`,
  Umsetzung danach mit `sonnet`.
- Unabhängige Teilaufgaben parallel starten (mehrere `Agent`-Aufrufe in
  einer Antwort).

### Auftrag an den Sub-Agenten

Sub-Agenten starten ohne Kontext. Jeder Auftrag enthält:

1. Ziel und Abnahmekriterium („fertig, wenn …“)
2. Relevante Dateien/Pfade, soweit bekannt
3. Einschränkungen (nichts committen, keine Deploys, nur diese Dateien …)
4. Gewünschte Rückgabe (kurz: was geändert, wo, offene Punkte)

Deploys, Migrationen auf Produktion und andere schwer umkehrbare Schritte
führt kein Sub-Agent ohne Freigabe des Nutzers aus.

### Prüfen

Der Haupt-Agent prüft jedes Ergebnis (Diff ansehen, ggf. `npm run build`
bzw. Tests per `haiku`-Agent laufen lassen), bevor er es als erledigt meldet.

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

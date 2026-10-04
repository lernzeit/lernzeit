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
| Edge Functions | GitHub-Workflow `deploy-supabase.yml` spielt bei jedem Push auf `main`, der `supabase/functions/` ändert, alle Funktionen ein (seit 03.10.2026 mit gültigem `SUPABASE_ACCESS_TOKEN`; erster Lauf erfolgreich). Danach den Lauf prüfen (`actions_list` → Ergebnis `success`). Änderungen nur an `supabase/config.toml` lösen ihn nicht aus – dann von Hand starten (`workflow_dispatch`). Lovable spielt daneben manchmal selbst ein |

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
- Jede Edge Function braucht einen Eintrag `[functions.<name>]` mit `verify_jwt` in
  `supabase/config.toml`. Fehlt er, spielt die CLI sie mit `verify_jwt = true` ein (bis
  03.10.2026 fehlten 9, u. a. `send-push`). Gelöschte Funktionen entfernt der Workflow nicht
  aus Supabase (z. B. `auth-email-hook` läuft dort noch, ungenutzt).

## Lovable ablösen (Stand 03.10.2026)

Geprüft im Code, in Supabase und per Rückfrage an Lovable: Datenbank (eigene
Supabase-Organisation „LernZeit“), Auth, Login-Mails (IONOS-SMTP), KI (Gemini/
OpenRouter, 0 Aufrufe ans Lovable-Gateway in 30 Tagen), Cron und Push hängen nicht an
Lovable. An Lovable hängen nur noch:
- Hosting von lernzeit.app und www (A-Records auf 185.158.133.1, TXT `_lovable`),
  einschließlich `public/.well-known/` (App-Links für iOS und Android) und SPA-Fallback.
- Bei IONOS ein verknüpfter „Third Party Service“: A-Einträge `@` und `www` der Website
  plus alte OneSignal-DKIM-Einträge unter `mail`. Ändern deaktiviert die ganze Gruppe samt
  Website – beim Hosting-Umzug erst den Service lösen, dann neu eintragen.
  E-Mail-Versand (OneSignal) deshalb über `post.lernzeit.app`, nicht `mail`.
  Die alten OneSignal-Einträge unter `mail` (SPF, os1/os2, `_osauth`, `email.mail`) beim
  Umzug mit aufräumen. Erledigt am 03.10.2026: NS-Delegation von `mail` an Lovable,
  Resend- und SES-Einträge gelöscht; DMARC berichtet an `info@lernzeit.app`.
- OneSignal-Standardabsender ist noch `mail@lernzeit.app` (nicht eingerichtet): jede
  Versand-Funktion gibt `email_from_address: hallo@post.lernzeit.app` selbst an.
Die Fassungen von `analyze-feedback`, `ai-question-generator` und `generate-learning-plan`
ohne Lovable-Schlüssel sind seit 03.10.2026 eingespielt; `LOVABLE_API_KEY` kann aus den
Supabase-Secrets gelöscht werden.

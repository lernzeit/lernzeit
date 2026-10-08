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

## E-Mails an Eltern und Support (Stand 04.10.2026)

- Service-Mails (`service-mails`, Cron `service-mails-taeglich` 07:13 UTC): Hilfe beim
  Einrichten, Erinnerung nach einer Woche, Testphase endet (mit/ohne Kind). Nur Service,
  keine Feedback-Bitten per Mail (BGH VI ZR 225/17) — Gründe fragt die App ab.
  Auswahl `service_mail_auswahl()`, Protokoll `service_mail_versand`.
- Support-Postfach info@lernzeit.app: Funktion `support-postfach` (IMAP/SMTP bei IONOS,
  Secret `IONOS_POSTFACH_PASSWORT`), Regeln in `docs/support/leitfaden.md`, Protokoll
  `support_postfach_protokoll`. Aus der Claude-Umgebung selbst geht kein IMAP (nur HTTPS).

## Messung der Website (Stand 04.10.2026)

- Events gehen nur in `analytics_events` (keine Cookies, kein Drittanbieter). Gemessen wird
  nur auf `lernzeit.app`/`www` und in den Apps, nie mit `navigator.webdriver` (Vorrendern,
  Playwright, Lovable-Vorschau). Wer lokal mit Playwright testet, muss `navigator.webdriver`
  per `addInitScript` auf `false` setzen und den Host prüfen.
- Daten vor dem 04.10.2026 enthalten Builds, Vorschau-Aufrufe und Meta-Prüf-Crawler; die
  Besucherzahl ist dort um ein Vielfaches zu hoch (Lovable zählte 223 statt ~1.000 in 4 Wochen).
- Abschnitte der Startseite tragen `data-abschnitt` (hero, so_funktionierts, ansichten, preise,
  faq, fusszeile); Store-Links werden zentral im `AnalyticsTracker` gezählt.
- Bilder der Startseite sind echte App-Bildschirme: `npm run werbung:landing` (Demo, Video) und
  `npm run werbung:app-bilder` (eingeloggt, Beispieldaten aus `scripts/lib/supabase-attrappe.mjs`;
  jeder Supabase-Aufruf wird lokal beantwortet, kein Zugriff auf die Datenbank).
- Bericht: `admin_registrierungs_trichter` / Karte im Marketing-Panel.
- Ratgeber-Artikel (`src/content/ratgeber/`) erscheinen erst mit `veroeffentlicht: true`
  und `geprueftAm` an jeder Quelle; Prüfliste `docs/ratgeber/quellenpruefung.md`.

## App-Gestaltung „Heft“ (Stand 04.10.2026)

- Gleiche Bildwelt wie die Website: Plus Jakarta Sans, Tokens `tinte`, `primary` (Blau),
  `gruen-hell`/`gruen-text`, `rotstift`, `karo` (tailwind), `.heft-karo`, `font-hand`.
  Keine Verläufe, Emoji nur bei Avatar und Stickern.
- Kind: Zeit-Uhr, Lernpflanze statt Lernfeuer (Stufen in `child/LernPflanze.tsx`, auch in
  den Push-Texten von `send-push`), Fächer als Hefte mit eigener Farbe und Stickern
  (Tabellen `kind_hefte`, `kind_sticker`). Sticker bei 5/5: Kind wählt selbst aus 56 (`sticker_darf_waehlen()`, `sticker_waehlen()`, Katalog = `STICKER` in `lib/hefte.ts`, nur Emoji bis Version 5), `sticker_vergeben()` (zufällig, nur die ersten 24) für alte App-Versionen. Konfetti bei 5/5 genau einmal (`triggerAllesRichtig`).
  Kind-Start (seit 05.10.2026): Uhr mit „Lernen starten“, Lernpläne, Tagesaufgabe,
  „Deine Erfolge“ (Pflanze + `child/ErfolgeKachel.tsx`). Hefte nur auf der Fächer-Seite,
  dort auch „Gestalten“.
- Spiel: Kästchen-Fortschritt, eigenes Ziffernfeld für Zahlenaufgaben, Haken/Rotstift.
- Eltern: Navigation unten (Heute, Kinder, Abo, Konto), Regeln speichern sofort mit
  leisem Hinweis „Wird gespeichert …“ (kein Speichern-Knopf, keine Toasts).
- Website-Bilder nach App-Änderungen neu aufnehmen: `npm run build`, dann
  `npm run werbung:app-bilder` und `npm run werbung:landing` (FFMPEG/CHROMIUM setzen).

## Rechtstexte (Stand 04.10.2026)

- Impressum, Datenschutz, Nutzungsbedingungen, `/widerruf` (Belehrung, Muster-Formular,
  „Vertrag widerrufen“ nach § 356a BGB) und `/kuendigen` („Verträge hier kündigen“ nach
  § 312k BGB) im Rahmen `RechtsSeite`. Beide Formulare → Funktion `vertragserklaerung` →
  Tabelle `vertragserklaerungen` + Eingangsbestätigung per IONOS-SMTP; ausgeführt wird von
  Hand in Stripe (`docs/support/leitfaden.md`). Offene Punkte für Betreiber und Kanzlei:
  `docs/rechtstexte-pruefung.md`. Texte tragen einen festen Stand – bei Änderungen anpassen.

## Lernplan aus Fotos (Stand 04.10.2026)

- Premium: Eltern laden bis zu 10 Fotos (Heft/Buch/Arbeitsblatt) im Lernplan-Formular hoch
  (`parent/FotoAuswahl.tsx`, verkleinert auf 1600 px, ohne Bildangaben). `generate-learning-plan`
  liest den Stoff mit `_shared/lernstoff-fotos.ts` aus (use_case `lernstoff_fotos`, Gemini 3.8 Flash,
  ~0,5 Cent je Foto) und speichert nur den Text in `learning_plans.lernstoff`; die Fotos nie.
- `ai-question-generator` holt den Stoff über `learningPlanId` (nur Kind/Elternteil des Plans);
  solche Fragen gehen nicht in `ai_question_cache`.
- Prüfen mit den künstlichen Seiten in `docs/testdaten/` (Prüfzugang nur mit Service-Rolle).
- Länge: so viele Tage wie bis zum Test, höchstens 5 (ohne Datum 5). Fach ist freiwillig
  („Automatisch erkennen“): gewählt → Fotos → Stichworte → Flash Lite (`lernplan_fach`) →
  sonst fragt die App. Regeln mit Tests in `_shared/lernplan-regeln.ts`.
- Tag 1 ist der Tag, an dem das Kind den Plan zum ersten Mal öffnet (`learning_plans.gestartet_am`,
  RPC `lernplan_starten`), nicht der Erstellungstag. Ist der Test näher als das Planende, springt
  der Plan vor, sodass der letzte Tag vor dem Test liegt (`src/lib/lernplan.ts`,
  `npm run test:lernplan`). Kind-Start und Fächer-Seite zeigen alle laufenden Pläne.

## Fragen-Erzeugung (Stand 05.10.2026)

- `ai-question-generator` nutzt ein Werkzeug-Schema mit getypten Feldern (`options` string[],
  `correct_index`, `pairs` {left,right}[], `correct_answer` string); `uebertrageGetypteFelder()`
  bringt sie ins alte Format. Ohne Typen lieferte Gemini Listen als `"["` (bis 88 % verworfen).
- Formatfehler stehen mit Rohantwort im Funktionsprotokoll (`🧾 Roh …`). Kontrolle:
  `query_logs` nach `Unrenderable` bzw. `Cache fallback: serving` zählen.
- Lernplan-Fragen: nur Inhalte des Plans (Thema, Tages-Schwerpunkte, Foto-Stoff), bis zu drei
  Versuche, nie eine Ersatzfrage aus dem Cache.

## Sicherheit (Stand 05.10.2026)

- SECURITY-DEFINER-Funktionen sind über `/rest/v1/rpc` für jeden aufrufbar, der EXECUTE hat
  (Standard: auch `anon`). Neue Funktionen entweder `auth.uid()` prüfen oder
  `revoke execute … from public, anon, authenticated` (siehe `20261005210000_rpc_absichern.sql`).
  Danach `get_advisors` (security) ansehen.
- Eltern-Kind-Verknüpfung nur über `claim_invitation_code` oder Service-Rolle; die Policies auf
  `parent_child_relationships` erlauben keine INSERTs.
- `DROP` über das Supabase-MCP hängt (Timeout); Policies mit `ALTER POLICY` ändern, Cron-Jobs nur im Dashboard.
- Keine Zugangsdaten ins Repo (am 05.10.2026 noch öffentlich); e2e liest `E2E_*` aus der Umgebung.

## Anmeldung mit Google (Stand 06.10.2026)

- Über Supabase zeigte Google „Weiter zu fsmgynpdfxkaiiuguqyr.supabase.co“; aus den Apps kam seit
  29.09. keine Google-Anmeldung durch. Neu: direkt bei Google, Supabase bekommt nur das ID-Token
  (`services/googleAnmeldung.ts`). Website: Weiterleitung + `public/google-rueckkehr.html`; Apps:
  `@capgo/capacitor-social-login` (nur Google, `facebook: false` in `capacitor.config.ts` und
  codemagic – kein Facebook-SDK in der Kinder-App, Build bricht sonst ab).
- Schalter in `config/google.ts` (Web, iOS-Client-ID, Android); aus = bisheriger Weg. Einrichtung
  in Google Cloud/Supabase: `docs/google-anmeldung.md`. Kein eigenes Budget für eine Supabase-Domain.
- Im Facebook-/Instagram-Browser sperrt Google jede Anmeldung; dort steht ein Hinweis statt des Knopfs.

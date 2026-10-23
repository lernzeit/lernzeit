# LernZeit — Hinweise für Claude

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
- Abschnitte der Startseite tragen `data-abschnitt` (hero, so_funktionierts, klecksi, ansichten, preise,
  faq, fusszeile; `klecksi` fehlt noch im Trichter-Bericht); Store-Links werden zentral im
  `AnalyticsTracker` gezählt. CTA-Positionen u. a. hero, klecksi, leiste (feste Leiste auf dem Handy), footer.
- Klecksi auf der Startseite (11.10.2026): Hero, Abschnitt `landing/KlecksiReise.tsx` (Reise malt sich
  beim Scrollen aus, Papierflieger faltet sich, gleiche Bausteine wie die App), Seitenende,
  Tintenstrich unter der Leiste, `landing/CtaLeiste.tsx`.
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
- Kind: Zeit-Uhr, Lerntage in Folge als Klecksi (seit 13.10.2026, vorher Lernpflanze; Stufen in
  `lib/klecksiLernstand.ts`, Kachel `child/LerntageKachel.tsx`; Push-Texte je App-Stand, siehe
  „Klecksi und die Heftrand-Reise“), Fächer als Hefte mit eigener Farbe und Stickern
  (Tabellen `kind_hefte`, `kind_sticker`). Sticker bei 5/5: Kind wählt selbst aus 56 (`sticker_darf_waehlen()`, `sticker_waehlen()`, Katalog = `STICKER` in `lib/hefte.ts`, nur Emoji bis Version 5), `sticker_vergeben()` (zufällig, nur die ersten 24) für alte App-Versionen. Konfetti bei 5/5 genau einmal (`triggerAllesRichtig`).
  Kind-Start (seit 05.10.2026): Uhr mit „Lernen starten“, Lernpläne, Tagesaufgabe,
  „Deine Erfolge“ (Lerntage-Kachel + `child/ErfolgeKachel.tsx`). Hefte nur auf der Fächer-Seite,
  dort auch „Gestalten“.
- Spiel: Kästchen-Fortschritt, eigenes Ziffernfeld für Zahlenaufgaben, Haken/Rotstift.
- Eltern: Navigation unten (Heute, Kinder, Abo, Konto), Regeln speichern sofort mit
  leisem Hinweis „Wird gespeichert …“ (kein Speichern-Knopf, keine Toasts).
- Website-Bilder nach App-Änderungen neu aufnehmen: `npm run build`, dann
  `npm run werbung:app-bilder` (auch Video `kind-start`) und `npm run werbung:landing`
  (FFMPEG/CHROMIUM setzen; ffmpeg mit x264/VP9/WebP z. B. aus dem PyPI-Paket `imageio-ffmpeg`,
  Chromium unter `/opt/pw-browsers/chromium`).

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
- Im Facebook-/Instagram-Browser sperrt Google jede Anmeldung, Apple verlangt Passwort und Zwei-Faktor-Code.
  Registrieren dort (23.10.2026, `InDerAppRegistrieren` in `AuthForm`): ganz oben „In der App registrieren“ (iPhone
  App Store, Android Google Play mit `utm_source=meta_iab`, Stelle `anmeldung_iab`), darunter E-Mail, Apple zuletzt;
  kein Google-Knopf. Beim Anmelden weiter der Hinweis statt Google.

## LernZeit-Handysperre (Stand 22.10.2026)

- Für alle ab App-Fassung `HANDYSPERRE_FUER_ALLE_AB` = 20261022 (`lib/appStand.ts`, `APP_STAND` gleich): Kind-Seite
  immer an. Ältere Fassungen nur für Kinder in `handysperre_freigaben` (heben sie bei anderen auf). Eltern-Seite
  (`hooks/useHandysperre.ts`): Kind in der Tabelle ODER `profiles.app_stand` ≥ 20261022; sonst bei iPhone-Kindern
  „Erst LernZeit aktualisieren“. Auf Klaras Handy erfolgreich getestet (21.10.2026).
- Erklärungen verweisen auf die LernZeit-Sperre; Apples Bildschirmzeit nur noch zurückhaltend als letzter
  aufklappbarer Schritt (`lib/geraeteAnleitung.ts`), kein Absprung in Apples Einstellungen mehr (Kind-Karte,
  Genehmigen). Genehmigen bei laufender Sperre (`useHandysperreLaeuft`): „LernZeit gibt die Zeit … frei“.
  Android unverändert Family Link.
- Änderungen an der Sperre auf dem Kinder-Handy erlaubt ein Elternteil auf dem eigenen Handy
  (`geraet_freigaben`, Push `geraet_freigabe_neu`, Karte auf „Heute“); Notweg ist der Elterncode.
- Freie Zeit zählt nur nach Nutzung (Swift: `ScreenTimeShared.swift`, seit 17.10.2026 Tagesbudget,
  siehe unten; `freigeben`/`starteNutzung` nur noch für alte Wege). Ruhezeit:
  `child_settings.ruhezeit_von/_bis` (Minuten), Kinder-Handy übernimmt sie (`useRuhezeitAbgleich`).
- Hinweise zu Sperre und Freigabe (13.10.2026): Ein Elternteil richtet sie auf dem Gerät des Kindes
  ein. Die Meldungen nennen die Lösung statt des Fehlers und hängen vom Endgerät ab (iPhone/iPad,
  Android, Browser, Computer): `lib/geraeteAnleitung.ts` (Tests in `npm run test:reise`), genutzt
  in `ScreenTimeWidget` (Kinder-Gerät), `ScreenTimeSetup` (Handy sperren, Apple-Gründe) und bei der
  Genehmigung auf dem Eltern-Gerät (`parentalControlsService`, Absprung-Meldungen). Seit 14.10.2026:
  vorne nur Knöpfe und ein Satz, die Schritte zum Aufklappen („So geht's“, `components/SoGehtEs.tsx`).
- Tagesbudget wie Apple (17.10.2026): offen bis die Minuten des Tages GENUTZT sind (Freiminuten
  Werktag/`freiminuten_wochenende` + heute genehmigt + `handyzeit_extra`), kein „Freiminuten starten“,
  nie nach Uhr. Swift `lernzeit.tag` (täglich, `includesPastActivity`), App übergibt bei jedem Öffnen
  absolute Werte (`setTagesbudget`, `gleicheTagesbudgetAb` in `services/screenTime/release.ts`), meldet
  `handyzeit_stand`. „Was zählt als Handyzeit?“ ist Pflicht bei der Einrichtung. Eltern: Kinder → Regeln →
  Handysperre (`parent/HandysperreHeute.tsx`: Stand, +15/+30, „Heute ohne Limit“, Elterncode).
- Elterncode statt Passwort: 6 Ziffern, Schritt 30 Min., HOTP/SHA-256 in SQL
  (`notfallcode_berechnen`) und TS (`lib/notfallcode.ts`, Test mit festen SQL-Werten in `npm run test:reise`),
  Prüfung ohne Internet, Nutzung → `notfall_entsperrungen` + Push `notfall_genutzt`.
- Eltern sehen Freiminuten und den Bereich „Handysperre“ erst, wenn das Kinder-Handy die Sperre meldet
  (`child_settings.screen_time_managed`, gesetzt bei jedem Abgleich); vorher nur bei einem iPhone-Kind
  (`get_children_platforms`: `last_platform`/Push-Token/Auswahl der Eltern) eine Zeile „Auf dem iPhone von …
  einrichten“, bei Android oder unbekanntem Gerät nichts. Kein Hinweis mehr auf „Heute“.
- „Eltern fragen“ auf dem Sperrbildschirm (App öffnen kann Apple dort nicht): Ab dem Build nach dem 20.10.2026
  schickt die ShieldAction-Erweiterung die Bitte selbst an die Funktion `eltern-fragen` (Schlüssel je Kind
  `sperre_anfrage_schluessel`, legt LernZeit beim Start in der App Group ab) und antwortet mit `.defer`; der
  Sperrbildschirm zeigt dann „Anfrage ist raus“ bzw. „Gemerkt“ (ohne Netz). Zusätzlich merkt sie den Druck,
  LernZeit reicht ihn beim Start nach `shield_attempts` nach (eindeutiger Index, keine Dublette). Der Trigger
  `shield_attempts_eltern_fragen` schickt Push `eltern_fragen` (je Kind höchstens alle 10 Min., nur Drücke < 12 h).
  Keine Kachel „Gesperrte Apps wurden angetippt“ mehr auf „Heute“ (21.10.2026, kein Mehrwert).
  Ob Apple der Erweiterung Netzzugriff erlaubt, zeigt erst das Gerät.
- Eltern-Übersicht beim Kind (21.10.2026, `parent/HandyzeitUebersicht.tsx`): „Handyzeit heute“ (nur mit
  `screen_time_managed`: genutzt/Budget, Freiminuten, freigegeben, Extra, Elterncode, „Eltern fragen“) und „Letzte 7
  Tage“ (genutzt bzw. verdient, freigegeben). Verlauf in `handyzeit_tage` (31 Plätze je Kind, `platz` = Tag mod 31,
  überschreibt statt zu löschen), gefüllt von `handyzeit_stand_melden`. Welche Apps: gibt Apple nicht heraus, Hinweis
  auf Bildschirmzeit am Eltern-iPhone. Keine Plakette („zu/offen“) mehr in „Handy sperren“. Ohne erklärende
  Sätze (Wunsch des Betreibers): kein „Stand … Uhr“, keine Legende, kein Apps-Hinweis, kein „Eltern fragen“-Zähler.
- Premium-Vorschau (`PremiumFeature`): verschwommen und gekappt; die Lernanalyse zeigt ohne Premium nur
  Beispielwerte (`BEISPIEL_*` in `ChildLearningAnalysis.tsx`), nie die echten Ergebnisse.
- Freiminuten (22.10.2026): eigene Gruppe in den Regeln, gelten für alle (Standard 30); nur die Höhe ändern ist Premium.
- Hooks, deren Funktionen in Effekt-Abhängigkeiten stehen, müssen stabile Funktionen liefern
  (`useEarnedMinutesTracker` = feste Funktionen): Am 21.10.2026 schickte Klaras Handy ~1.900 Abfragen je Minute.
- Offene Punkte der eigenen Sperre: `docs/handysperre-pruefung.md`.

## Klecksi und die Heftrand-Reise (Stand 11.10.2026)

- Maskottchen Klecksi (`components/klecksi/`, Umrisse in `formen.ts`): Arme nur für Gesten
  (grüßen einmal am Tag, jubeln, Mut machen). Eigene Sprüche: feste Sätze in `lib/klecksi.ts`.
  Er erklärt Fehler (`ai-explain`) und ist der KI-Tutor (`ai-tutor`, `persona: 'klecksi'`); KI-Texte
  tragen immer den Hinweis „KI“ bzw. „KI-Tutor“ (Transparenzpflicht).
- Klecksi an/aus: `profiles.klecksi` ('an'/'aus', null = automatisch: bis Klasse 6 an, ab 7 aus),
  Schalter in den Kinder-Einstellungen, `hooks/useKlecksi.ts`, Regel `lib/klecksiModus.ts`. Ohne
  Klecksi: kein Gruß, „Deine Lernreise“ mit Tropfen, sachliche Sätze (`rundenSatz(o, false)`).
- Eine Reise für alle Fächer auf dem Kind-Start (`child/HeftrandReise.tsx`): 12 Felder je Seite in
  Heftfarbe, Lernplan/Schwerpunkt doppelt, bunte Seite (3 Fächer) +20 Tinte, Faltung fürs Regal.
- Vergabe nur serverseitig: `runde_belohnen(p_sitzung)` nach `saveSession` (Tinte, Felder, Seite,
  Eltern-Bonus `child_settings.reise_bonus_minuten` – seit 21.10.2026 überall 0 und ohne Einstellung
  in der App: keine Extra-Minuten für fertige Seiten). Figuren: `mit_tinte_freischalten`, Trigger `avatar_pruefen`; Preise in
  `avatar_preis()` (neueste Fassung `20261022150000_figuren_preise.sql`) und `lib/federmaeppchen.ts` gleich halten
  (`npm run test:reise` prüft das). Seit 22.10.2026 81 Figuren (`data/avatars.ts`, neu: Fantasie, Sport & Spiel),
  Preise 150–1500 (vorher 40–150; Klara sammelte ~60 Tinte am Tag), Federmäppchen nach Preis sortiert.
- Lerntage als Klecksi (13.10.2026, ersetzt die Lernpflanze): Größe und Glanz nach 3/7/14/30 Tagen
  (`KLECKS_STUFEN`), Rechnung unverändert aus `useStreak`. 1 Tag Pause = blass, 2 = trocknet (Kette
  noch zu retten, Rettungsrunde ohne Minuten), ab 3 = trocken und klein (Kette 0). Er leidet nie:
  trocken heißt matt, Risse, Augen zu, kleines Lächeln. Trocknet/trocken ist er oben passiv (steht
  still, grüßt nicht). Eine Runde, und er ist wieder farbig (Stufe 0, wächst neu). `Klecksi`-Prop
  `stand`, Kachel mit Tropfen-Variante für Kinder ohne Klecksi. Regeln mit Tests in
  `npm run test:reise`. Push-Texte (`send-push`) richten sich nach `profiles.app_stand` (meldet die
  App, `lib/appStand.ts`): vor 20261013 Lernpflanze, danach Klecksi, ohne Klecksi sachlich (Tropfen).
  Meilensteine (3/7/14/30 … Tage) löst seit 17.10.2026 der Server aus: Trigger `game_session_streak_pruefen`
  (erste Runde des Tages) → send-push `streak_pruefen`, gemerkt in `streak_meilensteine`. Vorher rief die App
  send-push selbst auf und wurde abgewiesen (nur Service-Rolle).
- Ausmalen am Rundenende (21.10.2026): Ausschnitt der Seite (`ReiseAusmalen` in `child/HeftrandReise.tsx`,
  `ReisePfad` mit `neuAb`), Klecksi steht neben jedem neuen Feld und malt es aus (SVG-Maske,
  SMIL per `beginElement`), startet erst sichtbar, bei „Bewegung reduzieren“ sofort fertig. Ersetzt die Kästchen.
  Den Pinsel hält er in der Hand: `Klecksi`-Prop `pinsel` (Arm in Körperfarbe ohne Rand, schwingt per CSS
  `klecksi-malen`). Website-Bild `rundenende` zeigt ihn beim zweiten Feld (Attrappe trägt die Felder ein).
- Berichtigung: Runde aus `review_queue` (`useBerichtigung`, LearningGame `mode='berichtigung'`),
  richtig = `is_retired`. Supabase-Anfragen ohne `await`/`.then()` werden nie abgeschickt.
- DELETE über das Supabase-MCP wartet auf Bestätigung und läuft in eine Zeitüberschreitung.
- Faltfiguren (8, `FALTUNGEN` = `v_faltungen` in `runde_belohnen`) mit Anleitung zum Nachfalten:
  Falt-Simulator `lib/falten.ts`, Dialog `child/FaltAnleitung.tsx` (Regal und Rundenende).

## Weihnachtszeit und Adventskalender (Stand 11.10.2026)

- Jährlich 1.–26.12. (Berliner Zeit; ab 27.12. alles aus, Besitz bleibt, `lib/weihnachten.ts` = SQL `ist_weihnachtszeit`): Klecksi mit
  Mütze, Schnee auf der Begrüßung, Weihnachtssätze, 12 Weihnachts-Sticker (`sticker_waehlen` nur dann)
  und 5 Figuren (`mit_tinte_freischalten` nur dann; Besitz bleibt).
- Adventskalender: Türchen bis heute, nachholen bis 26.12.; 5 Aufgaben aus zufälligen Fächern
  (`faecher` im Vorlader), ab 4 richtigen `advent_runde` → `advent_tueren` (Sticker, Tür 6/24 Figur).
  Keine `game_sessions`-Zeile, also keine Zeit, Tinte, Reise, Erfolge, kein Streak, keine Berichtigung.
- Testen: Playwright-Uhr auf Dezember (`clock.setFixedTime`, Sitzung `expires_at` passend);
  SQL über `advent_runde_werten(kind, tag, richtig, gesamt, p_heute)` (nur Service-Rolle).

## Verdiente Zeit je Runde (Stand 20.10.2026)

- Richtige Aufgaben × Sekunden je Fach (`child_settings.*_seconds_per_task`); die Lösezeit wird nicht mehr
  abgezogen (vorher nur in der Anzeige am Rundenende, gutgeschrieben wurde immer die volle Zeit).
- Gegen Nachschlagen: Wer LernZeit während einer offenen Aufgabe ≥ 5 s verlässt (`visibilitychange`),
  bekommt für diese Aufgabe keine Zeit, auch wenn sie richtig ist; kein Sticker/kein „alles richtig“-Bonus
  in der Runde (`lib/appVerlassen.ts`, `LearningGame`, `GameCompletionScreen`, Test in `npm run test:reise`).

## Vorlesen mit KI-Stimme (Stand 20.10.2026)

- Bis Klasse 4: Knopf „Vorlesen“ an der Aufgabe (mit Antworten) und an der Erklärung (`LearningGame`,
  `hooks/useVorlesen.ts`, `services/vorlesen.ts`). Ab Klasse 5 und im KI-Tutor weiter die Gerätestimme.
- Funktion `vorlesen`: Gemini TTS (`gemini-3.8-flash-tts`, Stimme „Sulafat“, Env `VORLESEN_MODELLE`/`VORLESEN_STIMME`)
  → MP3 (lamejs) → privater Bucket `vorlesen` (`JJJJ-MM/<sha256>.mp3`, aktueller und voriger Monat, ältere
  räumt die Funktion selbst auf). Text ≤ 400 Zeichen, die App teilt an Satzgrenzen (`lib/vorlesenText.ts`:
  „7 · 8“ → „7 mal 8“, Lücken). Tagesgrenze 300 neue Stücke je Nutzer (`vorlesen_tag`), Kosten in
  `ai_model_metrics` (use_case `vorlesen`, ~0,2 Cent je 9 s). Probe: Service-Rolle mit `{probe:true}`.
- Ton als `data:`-Adresse (blob: spielt WKWebView nicht sicher ab); CSP in `index.html` braucht `media-src data: blob:`.
  Ohne Server/Anmeldung (z. B. Demo) liest die Gerätestimme.

## Mathe-Grundlagen ohne KI (Stand 11.10.2026)

- `ai-question-generator` liefert bei Mathe ohne Thema einen Anteil kurzer Aufgaben aus
  `_shared/grundlagen-mathe.ts` (Klasse ≤4: 50 %, ≤6: 35 %, 7: 25 %): Runden, Vorgänger, Stellenwerte,
  Einmaleins, negative Zahlen, Brüche … Auswahlfragen tragen den Index der richtigen Option (wie der
  Cache); ein Text wie „3“ würde in älteren Apps als Option Nr. 3 gelesen.

## Meldungen und App Review (Stand 17.10.2026)

- „Melden“ unter jeder KI-Tutor-Antwort und an fremden Ideen/Kommentaren im Forum (Apple 1.2):
  RPC `inhalt_melden()` → Tabelle `inhalt_meldungen` (nur Service-Rolle). Gemeldete Forum-Beiträge
  sind für den Meldenden ausgeblendet. Bearbeitung binnen 24 h: `docs/support/leitfaden.md`.
- Review-Konten: Eltern `apple.review.parent@lernzeit.app`, Kinder `applereviewkind`/`applereviewkind2`
  (beide in `handysperre_freigaben`, Apple 2.5.19). Prüfung der Richtlinien:
  `docs/apple-richtlinien-pruefung-2026-10-17.md`.

## Hinweis auf die App im Browser (Stand 13.10.2026)

- Im Browser (nie in den Apps, nicht im installierten PWA) steht „LernZeit ist für die App
  optimiert“: bei der Anmeldung als Karte mit Klecksi (`AuthForm`, Links zählt der
  `AnalyticsTracker` mit `data-stelle="anmeldung"`), im Spiel als schmale Leiste unter dem Kopf
  (schließbar bis der Tab zu ist) und am Rundenende als Karte. Nicht in der Demo auf der Website.
- Im Spiel sind es Knöpfe statt Links, damit keine Klicks von Kindern gemessen werden
  (`components/AppEmpfehlung.tsx`, `lib/appEmpfehlung.ts`, Test in `npm run test:reise`).
- Ohne Klecksi (ältere Kinder) steht ein Handy-Symbol statt der Figur. Sobald der Hinweis in der
  Seite steht, bleibt das Banner oben (`useAndroidAppBanner`) weg: es stand doppelt da und deckte
  im Spiel den Kopf mit dem Beenden-Knopf ab.

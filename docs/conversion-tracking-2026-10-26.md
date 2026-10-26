# Conversion-Tracking: Entscheidung und Betrieb (26.10.2026)

Stand 26.10.2026. **Entscheidung des Betreibers: Variante B (Browser-Tags nur nach Einwilligung). Er trägt die Verantwortung.**
Gebaut, getestet (`npm run test:werbemessung`), im Code auf `main`. **Der Notaus steht auf „aus“** (`ad_settings.tags_enabled = false`):
Solange er aus ist, lädt nichts, fragt nichts und meldet nichts. Einschalten: siehe unten.

## Angelegte Werte

| | |
|---|---|
| Google Ads | Conversion „Registrierung“ (primär, Zählung „Eine“, Platzhalterwert 1 EUR, Erweiterte Conversions aus). Tag `AW-18531716505`, Conversion `AW-18531716505/xplPCJeu1aodEJmbzoRF` |
| Meta | Datensatz „LernZeit Website“, Pixel `1463780805688443`, Standardereignis `CompleteRegistration`. Noch dem Werbekonto 2032123044153840 zuzuweisen (im Meta-Business-Manager) |

## Warum Variante B

| | A: serverseitig (Kanzlei-Entwurf) | B: Browser-Tags nach Einwilligung (gewählt) |
|---|---|---|
| Einsatzbereit | nein: Google-Zugang (Entwicklertoken, OAuth/Dienstkonto) fehlt, Conversion-Aktion müsste vom Typ „Import“ sein (die angelegte ist ein Website-Tag) | ja, mit den vorhandenen IDs |
| Meta | bleibt aus | möglich (CompleteRegistration) |
| Signal für die Gebotsoptimierung | verzögert (tägliche Sammelmeldung), Klick-Kennung muss bis zur Registrierung erhalten bleiben (geht beim Seitenwechsel verloren, offene Rückfrage 3.1 an die Kanzlei) | sofort, die Kennung liest das Google-Tag auf der Zielseite selbst |
| Datenschutz | sparsamer (keine Skripte im Browser) | Skripte von Google/Meta nach Einwilligung; Datenschutzerklärung und Kanzlei-Prüfung nötig |

A war nicht lieferbar und liefert später und lückenhafter. B ist sofort wirksam und mit einer sauberen Einwilligung zulässig.
Die Kanzlei hatte A empfohlen und Meta ausgeschlossen; B weicht davon ab. Das Risiko liegt beim Betreiber (Entscheidung vom 26.10.2026).

## Was gebaut ist

- **Einwilligung** (`src/components/WerbeEinwilligung.tsx`, `src/lib/werbeEinwilligung.ts`): kleiner Hinweis „Wirken unsere Anzeigen?“ (drei Zeilen) mit drei gleich großen Knöpfen („Ablehnen“, „Auswahl“, „Zustimmen“);
  unter „Auswahl“ stehen Google und Meta getrennt (nicht vorausgewählt). Widerruf jederzeit über „Werbe-Einstellungen“ im Seitenfuß (löscht die Cookies der Anbieter und die Konto-Zuordnung, lädt neu).
  Ohne Entscheidung gilt „nein“. Die Entscheidung liegt in `localStorage` (`lernzeit_werbe_einwilligung`, Version 1; bei Änderung der Zwecke
  `EINWILLIGUNG_VERSION` erhöhen, dann wird neu gefragt).
- **Wo und wann** (`src/lib/werbemessung.ts`): nur im Browser auf lernzeit.app, nur auf Seiten für Erwachsene (Startseite, Zielseiten, Ratgeber, Preise,
  FAQ, Hilfe), nie in den Apps, nie mit Einladungscode in der Adresse, nie für angemeldete Konten (kein Hinweis), nie automatisiert. Kinder: Es gibt
  weder Hinweis noch Tag auf `/`, in der App-Ansicht und auf Einladungslinks.
- **Google**: `gtag.js` mit Consent Mode v2 (Vorgabe „verweigert“, nach Zustimmung `ad_storage` und `ad_user_data` erteilt, `ad_personalization`
  verweigert, Google Signals aus). Das Tag lädt schon auf der Zielseite, damit es die Klick-Kennung (gclid) aus der Adresse lesen kann.
- **Meta**: Pixel erst im Moment der Registrierung geladen, `autoConfig` aus, kein PageView, genau ein Ereignis `CompleteRegistration` ohne Daten.
- **Ereignis**: `sign_up_completed` mit Rolle `parent` (E-Mail-Registrierung und, neu, Google/Apple-Anmeldung nach der Rollenwahl in
  `GoogleRoleSelection`). Kinder (`role: 'child'`) und Konten mit Kinderprofil werden nie gemeldet (`analytics.ts`, bestehende Sperre).
  Gesendet werden nur eine Zufallskennung gegen Doppelzählung und Google bzw. Meta selbst bekannte Browserdaten. Keine E-Mail, kein Name, keine Nutzer-ID, kein Betrag.
- **UTMs beim Elternkonto**: Mit Google-Zustimmung schreibt `resolveAdClick` jetzt auch ohne Klick-Kennung eine Zeile in `ad_attribution`
  (utm_source, utm_campaign u. a., Löschfrist 13 Monate). Ein eigenes Feld in `profiles` gibt es bewusst nicht: Es würde die Zuordnung
  Konto ↔ Kampagne auch ohne Einwilligung festhalten. Ohne Einwilligung bleibt die anonyme Auswertung in `analytics_events` (Kampagne je Besuch).
- **Datenschutzerklärung** (`src/pages/Datenschutz.tsx`, Stand 26.10.2026): neuer Abschnitt 5.4 „Werbemessung“, Dienstleisterliste, Kinder-Abschnitt.
  **Von der Kanzlei nicht geprüft** (Punkt in `docs/rechtstexte-pruefung.md`). Prüfen lassen: gemeinsame Verantwortlichkeit mit Meta (Art. 26),
  Wortlaut der Einwilligung, Cookie-Laufzeiten.
- **CSP** in `index.html` um die Hosts von Google und Meta erweitert (gilt auch in den Apps; dort wird nie geladen).

## Einschalten und Ausschalten

1. Datenschutzerklärung lesen (Abschnitt 5.4), Meta-Pixel im Business-Manager dem Werbekonto zuweisen, in Google Ads prüfen, dass die Conversion
   „Registrierung“ auf „Aktiv“ steht (Tag-Status wird erst nach der ersten Messung grün).
2. Web veröffentlichen (`deploy_project`), dann im Supabase-SQL-Editor:
   ```sql
   update public.ad_settings set tags_enabled = true, note = 'Werbemessung an, 26.10.2026, Variante B', updated_at = now();
   ```
3. Testen: lernzeit.app in einem frischen Browserfenster öffnen: Der Hinweis erscheint. Mit „Zustimmen“ ein Test-Elternkonto anlegen
   und in Google Ads (Conversions, „Registrierung“) bzw. im Meta-Events-Manager (Testereignisse) prüfen, ob das Ereignis ankommt.
   Testkonten nicht als echte Registrierung zählen lassen (die Zählung in Google Ads kann bis zu 24 Stunden dauern).
4. Aus: Reihenfolge wie in `docs/werbung-notaus.md` (erst die Kampagne pausieren, dann `tags_enabled = false`). Wirkt sofort ohne Build.

## Grenzen (ehrlich)

- Wer ablehnt oder keinen Hinweis sieht (Apps, Kinder, Einladungslinks, Werbeblocker), wird nicht gemeldet. Google und Meta sehen weniger Conversions
  als es Registrierungen gibt; die eigene Zählung (`analytics_events`, `ads_funnel_summary`) bleibt vollständig.
- Die Registrierung wird beim Anlegen des Kontos gemeldet, nicht nach der E-Mail-Bestätigung.
- Das Google-Tag misst beim Laden auf der Zielseite die Klick-Kennung; wer erst später zustimmt (andere Seite), kann nicht mehr zugeordnet werden.
- Der Test (`npm run test:werbemessung`) prüft Einwilligung, Ladeverhalten und die Ereignisse mit abgefangenen Anfragen; ob Google und Meta die
  Ereignisse annehmen, zeigt erst ein echter Durchlauf nach dem Einschalten.
- Serverseitiger Weg (A) bleibt als Ergänzung möglich: `ad_attribution` ist dafür vorbereitet (`reported_at`).

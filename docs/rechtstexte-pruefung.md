# Rechtstexte – Prüfung vom 04.10.2026

Auftrag des Betreibers: prüfen, ob die rechtlichen Rahmenbedingungen erfüllt
sind, und Fehlendes ergänzen (z. B. Widerrufsbelehrung). Alles hier ist
**technisch-redaktionell erstellt und juristisch ungeprüft** – zur Durchsicht
durch die Kanzlei. Gesetzeswortlaut (§ 312k, § 356a BGB, Anlagen 1 und 2
EGBGB, Fassung ab 19.06.2026) am 04.10.2026 von gesetze-im-internet.de bzw.
buzer.de übernommen.

## Umgesetzt

| Thema | Vorher | Jetzt |
|---|---|---|
| Widerrufsbelehrung | fehlte | `/widerruf`: Muster Anlage 1 (Hinweise [1] a, [2], [3] Widerrufsfunktion, [6] Dienstleistung), Muster-Widerrufsformular Anlage 2 |
| Widerrufsbutton § 356a BGB (seit 19.06.2026 Pflicht) | fehlte | „Vertrag widerrufen“ im Seitenfuß, im Abo-Bereich und auf `/widerruf`; Formular mit Name, Vertrag, E-Mail; Knopf „Widerruf bestätigen“; Eingangsbestätigung per E-Mail mit Inhalt, Datum, Uhrzeit |
| Kündigungsbutton § 312k BGB | fehlte (Kündigung nur im Stripe-Portal nach Anmeldung) | „Verträge hier kündigen“ im Seitenfuß und im Abo-Bereich → `/kuendigen` ohne Anmeldung: Art (ordentlich/außerordentlich + Grund), Name, E-Mail, Vertrag, Zeitpunkt; Knopf „Jetzt kündigen“; sofortige Bestätigung per E-Mail und auf der Seite (druck-/speicherbar) |
| AGB: Abo | keine Regeln zu Preis, Laufzeit, Verlängerung, Kündigung, Widerruf, Vertragsschluss | Abschnitte 2, 4–7 |
| AGB: Haftung | „nur Vorsatz und grobe Fahrlässigkeit“ (§ 309 Nr. 7 BGB) | übliche Staffelung (Leben/Körper/Gesundheit, Kardinalpflichten) |
| AGB: Änderungen | „Weiternutzung gilt als Zustimmung“ | nur mit Zustimmung |
| AGB: Rechtswahl | ohne Verbrauchervorbehalt | mit Vorbehalt (Art. 6 Abs. 2 Rom I) |
| AGB, Datenschutz: Stand | jeweils das heutige Datum | fester Stand |
| AGB 3.1 | „Registrierung erfordert E-Mail“ (Kinder können ohne) | richtiggestellt |
| Impressum | § 5 TMG, § 55 RStV, Link zur OS-Plattform (abgeschaltet 20.07.2025) | § 5 DDG, § 18 MStV, OS-Link entfernt, Vertretungsberechtigter, Kontaktformular |
| Datenschutz | Verantwortlicher nur per Verweis; keine Rechtsgrundlagen je Zweck; Website-Hosting, RevenueCat, eigene Messung, Speicherdauer, Art. 21, Aufsichtsbehörde fehlten | ergänzt |
| Gestaltung | alte Karten-Optik | Heft-CI wie Ratgeber/FAQ, Weg zurück |

Technik: Tabelle `vertragserklaerungen` (nur Service-Rolle), Funktion
`vertragserklaerung` (IONOS-SMTP, höchstens 3 je Adresse und 100 insgesamt
pro Tag, Honigtopf-Feld). Ausführung in Stripe von Hand, siehe
`docs/support/leitfaden.md`.

## Vom Betreiber zu bestätigen

1. **Vertretungsberechtigter im Impressum:** „Geschäftsführer Thomas
   Brösicke“ – vom Betreiber bestätigt (04.10.2026).
2. **USt-IdNr. und Telefonnummer:** gibt es beide nicht (Betreiber,
   04.10.2026). Impressum und Widerrufsbelehrung bleiben ohne.
3. **Telefonnummer / zweiter Kontaktweg:** siehe 2; als zweiter schneller Weg
   neben der E-Mail böte sich ein echtes Kontaktformular an (heute öffnet es
   nur das E-Mail-Programm).
4. **Jahresabo nach dem ersten Jahr:** Stripe verlängert ein Jahresabo um ein
   weiteres Jahr. Gegenüber Verbrauchern ist eine stillschweigende
   Verlängerung nur auf unbestimmte Zeit mit monatlicher Kündigungsmöglichkeit
   zulässig (§ 309 Nr. 9 BGB). Die AGB sagen deshalb: ab dem zweiten Jahr
   jederzeit mit einem Monat Frist kündbar, anteilige Erstattung.
   **Entscheidung des Betreibers (04.10.2026): weiter jährlich verlängern,
   ab dem zweiten Jahr monatlich kündbar.** Umgesetzt: „Abo kündigen“ im
   Abo-Bereich (Funktion `abo-kuendigen`, Rechnung `_shared/abo-kuendigung.ts`
   mit Tests) setzt das Enddatum und erstattet den Rest automatisch; das
   Stripe-Portal bietet keine Kündigung mehr an (eigene Portal-Konfiguration).
   Kündigungen über `/kuendigen` (ohne Anmeldung) und per E-Mail weiter von
   Hand nach denselben Regeln. Für die Kanzlei: Ist Vorauszahlung für ein Jahr
   bei monatlicher Kündbarkeit mit anteiliger Erstattung so in Ordnung?
5. **Erstattung bei Widerruf:** Die Belehrung enthält den gesetzlichen
   Wertersatz-Absatz für Dienstleistungen. Er greift nur, wenn der Kunde
   ausdrücklich verlangt hat, dass Premium vor Ablauf der Frist beginnt – das
   fragt der Stripe-Checkout heute nicht ab. Praktisch heißt das: bei Widerruf
   den vollen Betrag erstatten.

## Für die Kanzlei (bewusst nicht entschieden)

0. **Ort von Kündigungs- und Widerrufsbutton:** Auf Wunsch des Betreibers
   (04.10.2026) nicht mehr im Seitenfuß, sondern oben auf der Support-Seite
   (Fuß → „Support“ → Knopf) und im Abo-Bereich. § 312k verlangt „ständig
   verfügbar sowie unmittelbar und leicht zugänglich“, § 356a „hervorgehoben
   platziert“. Reicht das? Wenn nicht: ein schlichter Textlink im Fuß.

1. **Bestellknopf (§ 312j Abs. 3 BGB):** Stripe Checkout beschriftet ihn im
   Abo-Modus mit „Abonnieren“. Reicht das, oder braucht es „zahlungspflichtig
   abonnieren“? (Stripe erlaubt im Abo-Modus keine eigene Beschriftung.)
2. **Zufallskennung und UTM-Angaben im localStorage** (`lernzeit_anonymous_id`,
   `lernzeit_attribution`) ohne Einwilligung – weiterhin offene Frage 3.2 aus
   `docs/anwalt-nachlieferung.md`. Die Datenschutzerklärung beschreibt sie
   jetzt sachlich (Abschnitt 5.2), stützt sich auf Art. 6 Abs. 1 lit. f DSGVO
   und trifft keine Aussage zu § 25 TDDDG.
3. **Speicherdauer `analytics_events`:** in der Software nicht begrenzt und
   deshalb in der Datenschutzerklärung nicht beziffert.
4. **Aufbewahrung `vertragserklaerungen`:** In der Datenschutzerklärung steht
   „bis zum Ende der Verjährungsfrist“; eine automatische Löschung gibt es
   noch nicht.
5. **Lovable als Hosting-Dienstleister:** Firmierung und Sitz für die
   Datenschutzerklärung; Auftragsverarbeitungsvertrag vorhanden?
6. **Kündigung von Store-Abos:** Die AGB verweisen dafür auf die Stores. Genügt
   das, wenn ein Kunde die Kündigung über `/kuendigen` an uns richtet?
7. **Muster-Widerrufsbelehrung in der „Sie“-Form**, der Rest der Website duzt.
   Das Muster wurde unverändert übernommen, um die Gesetzlichkeitsfiktion nicht
   zu gefährden.

Der Entwurf zur Werbemessung (`docs/datenschutz-entwurf.md`, § 8a) ist
**nicht** eingearbeitet; er wartet weiter auf die Kanzlei.

## Checkliste „Vibe Coding“ (Screenshot vom 04.10.2026)

| # | Punkt | Stand |
|---|---|---|
| 1 | Impressum | erledigt (§ 5 DDG), Geschäftsführer bitte bestätigen |
| 2 | Datenschutzerklärung | erledigt, Kanzlei-Fragen oben |
| 3 | Cookie-Banner | keine Cookies, kein Drittanbieter-Tool → kein Banner nötig; offen nur die Zufallskennung im localStorage (Kanzlei-Frage 2). Kommt Werbemessung, braucht es eine CMP (Entwurf liegt vor) |
| 4 | Zustimmung → Statistik-Tool | kein fremdes Statistik-Tool; eigene Messung in `analytics_events`, siehe 3 |
| 5 | Schriften vom eigenen Server | ja: Plus Jakarta Sans und Playpen Sans aus `public/fonts`, keine Google-Fonts-Aufrufe |
| 6 | AVV | vom Betreiber zu prüfen, ob abgeschlossen: Supabase, Stripe, OneSignal, IONOS, Google (Gemini API), OpenRouter, RevenueCat, Lovable |
| 7 | AGB | erledigt |
| 8 | Widerrufsbelehrung | erledigt, mit Widerrufsfunktion (§ 356a BGB) |
| 9 | Kontaktformular mit DS-Erklärung | Hinweis mit Link ergänzt. Das Formular öffnet nur das E-Mail-Programm; ein zweiter schneller Kontaktweg neben der E-Mail (z. B. Telefon) fehlt weiter |
| 10 | Barrierefreiheit | axe-Prüfung (WCAG 2.1 AA) über 12 Seiten bei 390 und 1280 px: nur Kontrast auf der 404-Seite (behoben) und die absichtlich blassen, nicht aktiven Randnotizen der Startseite am Desktop. BFSG: Kleinstunternehmen mit Dienstleistungen sind ausgenommen (< 10 Beschäftigte und ≤ 2 Mio. € Umsatz) – bitte bestätigen |
| 11 | robots.txt | vorhanden, verweist auf die Sitemap |
| 12 | sitemap.xml | bereinigt: `/`, `/reset-password`, `/email-bestaetigung` raus, `/widerruf`, `/kuendigen`, `/support` rein, `lastmod` gesetzt; Ratgeber kommt beim Build dazu |
| 13 | 404 | eigene Seite im Heft-Stil, `noindex`. Lovable liefert für unbekannte Pfade technisch Status 200 (SPA-Fallback) – das lässt sich erst beim Hosting-Umzug ändern |
| 14 | Canonical URLs | auf allen Website-Seiten (`Seo`), beim Build geprüft |
| 15 | Meta-Title | auf allen Seiten eindeutig |
| 16 | Meta-Description | auf allen Seiten vorhanden |
| 17 | Vorschau (OG-Bild) | neu im Heft-Stil mit echtem App-Bildschirm (`public/og-image.png`, 1200×630). Facebook/WhatsApp zeigen das alte Bild, bis ihr Zwischenspeicher abläuft |
| 18 | Favicon | vorhanden (ico, png, Apple-Touch, PWA) |
| 19 | Alt-Texte | alle `<img>` haben `alt` |
| 20 | Mobile | alle geprüften Seiten ohne waagerechtes Scrollen bei 390 px |

## Lernplan aus Fotos (04.10.2026)

Eltern laden Fotos von Heft, Buch oder Arbeitsblatt hoch; Gemini liest den
Stoff aus. Die Fotos werden auf dem Gerät verkleinert (ohne Bildangaben) und
nicht gespeichert, nur der ausgelesene Text (`learning_plans.lernstoff`).
Daraus erzeugte Fragen gehen nicht in den gemeinsamen Fragen-Cache.
Datenschutzerklärung 2.2 und 6 ergänzt. Für die Kanzlei: Reicht der Hinweis
im Formular, Seiten mit Namen/Noten möglichst nicht zu fotografieren, oder
braucht es eine ausdrückliche Bestätigung? Urheberrecht an Buchseiten:
Auswertung nur für den privaten Lernplan, keine Speicherung der Seite.

## Anbieter im Google Play Store (10.10.2026)

Das Play-Entwicklerkonto (Konto-ID 7984747740140544163) läuft auf die **sgk UG
(haftungsbeschränkt), Drachengasse 2, 99084 Erfurt**. Impressum, AGB und Widerruf nennen die
**LernZeit UG (haftungsbeschränkt), Drachengasse 10**, HRB 524759. Im Store steht damit ein anderer
Anbieter als auf der Website. Den Namen nicht im bestehenden Konto ändern (erneute
Identitätsprüfung, Konto hat eine Entfernungswarnung zum 01.11.2026), sondern nach Klärung der
Warnung: eigenes Entwicklerkonto der LernZeit UG (D-U-N-S) und App-Übertragung. Für Kanzlei und
Steuerberater: Wer ist bis dahin Vertragspartner bei Käufen über Google Play, und wem stehen die
Erlöse zu? Apple (App Store Connect) auf dieselbe Frage prüfen.

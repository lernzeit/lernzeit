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

1. **Vertretungsberechtigter im Impressum:** eingetragen ist „Geschäftsführer
   Thomas Brösicke“ – bitte mit dem Handelsregister abgleichen.
2. **USt-IdNr.:** Falls vorhanden, gehört sie ins Impressum.
3. **Telefonnummer:** Das Muster der Widerrufsbelehrung sieht eine
   Telefonnummer vor (Hinweis [2]); es gibt keine. Falls eine Nummer
   existiert, ergänzen.
4. **Jahresabo nach dem ersten Jahr:** Stripe verlängert ein Jahresabo um ein
   weiteres Jahr. Gegenüber Verbrauchern ist eine stillschweigende
   Verlängerung nur auf unbestimmte Zeit mit monatlicher Kündigungsmöglichkeit
   zulässig (§ 309 Nr. 9 BGB). Die AGB sagen deshalb: ab dem zweiten Jahr
   jederzeit mit einem Monat Frist kündbar, anteilige Erstattung. Das muss bei
   Kündigungen von Hand so umgesetzt werden (oder Stripe-Einstellung ändern).
5. **Erstattung bei Widerruf:** Die Belehrung enthält den gesetzlichen
   Wertersatz-Absatz für Dienstleistungen. Er greift nur, wenn der Kunde
   ausdrücklich verlangt hat, dass Premium vor Ablauf der Frist beginnt – das
   fragt der Stripe-Checkout heute nicht ab. Praktisch heißt das: bei Widerruf
   den vollen Betrag erstatten.

## Für die Kanzlei (bewusst nicht entschieden)

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

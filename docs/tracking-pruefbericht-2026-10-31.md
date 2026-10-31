# Tracking-Prüfbericht (31.10.2026)

Grundlage: Auftrag vom 31.10.2026 (Aufgaben 1–4). Geprüft im Code, im Build (Playwright, `npm run test:werbemessung`,
34 Prüfungen bestanden) und in der Datenbank. **Nicht erreichbar aus der Prüfumgebung:** lernzeit.app, connect.facebook.net,
facebook.com, googletagmanager.com (Proxy-Sperre). Was nur dort sichtbar ist, steht unten als „offen“.

## Befunde und Ursachen

| # | Befund | Beleg | Ursache | Behoben |
|---|---|---|---|---|
| 1 | Conversion feuerte bei der Kontoanlage, nicht bei bestätigter E-Mail | Code: `track('sign_up_completed')` → `meldeRegistrierung()` | So gebaut (26.10.2026) | Ja: Meldung erst mit bestätigter E-Mail, einmal je Konto (Server) |
| 2 | Meta Events Manager: 0 Events | Code: `ladeWerbeTags()` lud Meta nie auf Seitenaufrufen („Meta bekommt keinen Seitenaufruf“), das Pixel kam erst bei der Registrierung | Kein PageView, kein `_fbp`, kein `_fbc` aus dem Anzeigenklick; einziges Ereignis wäre CompleteRegistration gewesen | Ja: PageView auf Seiten für Erwachsene (mit Meta-Zustimmung) |
| 3 | `ad_attribution.fbp` leer | Code: `resolveAdClick()` schrieb `fbp`/`fbc` nie (Kommentar „bleiben leer“, Stand 21.09.2026) | Spalten absichtlich nicht befüllt | Ja: `fbp`/`fbc` aus den Pixel-Cookies, nur mit Meta-Zustimmung |
| 4 | `fbclid`/`gclid` gingen verloren | Code: `Index.tsx` leitete `/` mit `navigate('/start')` ohne Adresszeile weiter | Meta-Anzeigen führen auf `/` | Ja: Weiterleitung behält `?…` und `#…` (Test 8) |
| 5 | 74 Besucher aus `appstores_okt26` am 30.10., 0 CTA-Klicks | `analytics_events` 30.10.: 67 Besucher mit `page_view` auf `/start`, 49 mit `abschnitt_gesehen: hero`, 5 scrollten weiter; Kennzeichen `utm_source=an` bei 37 von 43 Besuchern mit `page_leave`, fast alle Android, Verweildauer meist 1–10 s | **Die Ereignisse werden erfasst** (gleiche Seite, gleicher Tag: `abschnitt_gesehen`; am 31.10. kam `landing_cta_click: hero` aus `appstores_okt26` an). Die Besucher klicken nicht: `an` = Meta Audience Network (Anzeigen in fremden Apps), typisch versehentliche Klicks | Seite unverändert (CTA war schon da); Empfehlung unten |

Zu 2: Ob am 30.10. beim Messtest (`utm_campaign=messtest`, zwei Eltern-Registrierungen 20:09 und 20:11) ein
CompleteRegistration bei Meta ankam, lässt sich hier nicht belegen – die Datenbank speichert die Einwilligung nicht,
und Meta ist aus der Prüfumgebung nicht erreichbar.

## Aufgabe 1: Conversion nur bei bestätigter Registrierung

- Server: Tabelle `werbe_conversions` (je Konto eine Zeile, `transaction_id`), RPC `werbe_conversion_beanspruchen()`
  (Migration `20261031120000_werbe_conversion_bestaetigt.sql`, eingespielt). Liefert die `transaction_id` nur, wenn:
  Elternkonto, E-Mail bestätigt (seit höchstens 30 Tagen), Konto ab 31.10.2026 angelegt, kein Testkonto
  (`lz_testkonten()`, enthält `admin_testkonten`), Notaus offen, noch nicht gemeldet. Sonst `null`.
- Browser (`meldeBestaetigteRegistrierung` in `lib/werbemessung.ts`): nur auf lernzeit.app, nur mit Einwilligung, nur mit
  bestätigter Sitzung; danach Google `conversion` mit `send_to AW-18531716505/xplPCJeu1aodEJmbzoRF` und
  `transaction_id`, Meta `CompleteRegistration` mit `eventID` = dieselbe Kennung. Ausgelöst nach jeder Anmeldung
  (der Bestätigungslink meldet an), nach einer Zustimmung und nach `sign_up_completed` (Google/Apple).
- Die Kontoanlage selbst meldet nichts mehr.

## Je Plattform

### Google Ads
| Getestet | Ergebnis |
|---|---|
| Tag lädt nur nach Google-Zustimmung, Consent Mode v2 (Vorgabe verweigert, `ad_storage` erteilt, Personalisierung verweigert) | bestanden (lokal) |
| Kontoanlage meldet keine Conversion | bestanden (lokal) |
| Bestätigtes Konto: genau eine Conversion mit richtigem Ziel und `transaction_id` vom Server | bestanden (lokal, `dataLayer`) |
| Neuladen / erneute Anmeldung: keine zweite Conversion | bestanden (lokal; Server-Seite siehe „offen“) |
| `gclid` überlebt `/` → `/start` | bestanden (lokal) |

**Offen:** Empfang bei Google (nur im Browser auf lernzeit.app prüfbar: Google Tag Assistant bzw. Google Ads → Ziele →
Conversion „Diagnose“). CSP um `www.googleadservices.com` und `www.google.de` ergänzt; ob Google weitere Hosts nutzt,
zeigt erst der Tag Assistant.

### Meta
| Getestet | Ergebnis |
|---|---|
| Pixel lädt nur mit Meta-Zustimmung, `fbq('init', '1463780805688443')` vor dem Laden von `fbevents.js` | bestanden (lokal) |
| PageView je Seite (auch beim Seitenwechsel ohne Neuladen), `_fbp` gesetzt | bestanden (lokal, mit Nachbildung von `fbevents.js`, die wie Meta an `facebook.com/tr` sendet) |
| Kontoanlage: kein CompleteRegistration | bestanden (lokal) |
| Bestätigtes Konto: genau ein CompleteRegistration, `eventID` = `transaction_id` | bestanden (lokal) |
| `fbclid` überlebt `/` → `/start` (daraus setzt Meta `_fbc`) | bestanden (lokal) |

**Offen – Nachweis im Events Manager (braucht den Browser des Betreibers):**
1. Events Manager → Datensatz 1463780805688443 → „Test-Ereignisse“ → Website-URL `https://lernzeit.app/start` → „Website öffnen“.
2. Auf der Seite „Zustimmen“ (bzw. „Auswahl“ → Meta). Erwartet: **PageView** erscheint binnen Sekunden in „Test-Ereignisse“.
3. CompleteRegistration-Gegenprobe mit Testkonto: Konto anlegen, **vor dem Klick auf den Bestätigungslink** in
   `admin_testkonten` eintragen, dann bestätigen. Erwartet: **kein** CompleteRegistration, keine Google-Conversion,
   keine Zeile in `werbe_conversions`. Ein positives CompleteRegistration entsteht nur mit einem echten Konto; dafür
   die erste echte Registrierung nach dem Einspielen abwarten (Zeile in `werbe_conversions`, Ereignis im Events Manager).
4. Seit der neuen Einwilligungsfassung (Version 2) fragt die Seite alle erneut, auch wer vorher zugestimmt hatte.

### Eigene Datenbank
| Getestet | Ergebnis |
|---|---|
| Erfassung der Ereignisse auf `/start` aus Meta-Anzeigen | belegt (`page_view`, `abschnitt_gesehen`, `page_leave` am 30.10.; `landing_cta_click` am 31.10.) |
| CTA „Kostenlos registrieren“ auf dem Handy (390×844) ohne Scrollen sichtbar, nicht vom Hinweis verdeckt | bestanden (lokal) |
| Klick → `landing_cta_click` (position `hero`, Kampagne erhalten) → `sign_up_started` | bestanden (lokal) |
| `ad_attribution`: bisher 2 Zeilen, beide Testkonten (Messtest 30.10.) | belegt |
| `fbp`/`fbc` in `ad_attribution` mit Meta-Zustimmung | gebaut; lokal nicht in der Zeile geprüft (die Zeile entsteht erst mit angemeldetem Elternkonto) |

**Geprüft (31.10.2026, Transaktion mit Rücksetzung, danach 0 Zeilen in `werbe_conversions`, keine Prüfkonten übrig):**
`werbe_conversion_beanspruchen()` liefert für ein neues Elternkonto vor der Bestätigung `null`, nach der Bestätigung beim
ersten Aufruf eine `transaction_id`, beim zweiten `null`; für ein bestätigtes Kinderkonto, ein Elternkonto von vor dem
31.10.2026 und ein Konto in `admin_testkonten` jeweils `null`.

## Empfehlungen für Meta (nicht selbst geändert)

- Platzierung **Audience Network** ausschließen: 37 von 43 auswertbaren Besuchern am 30.10. kamen von dort, fast alle
  verließen die Seite nach 1–10 Sekunden.
- Ziel-URL statt `/` z. B. `https://lernzeit.app/bildschirmzeit-kind?utm_source=meta&utm_medium=paid_social&utm_campaign=appstores_okt26&utm_content={{ad.id}}`
  (Seite für Eltern mit CTA im Kopf, vorgerendert; `/` funktioniert inzwischen aber auch, die Weiterleitung behält alle Parameter).
- Optimierungsziel erst auf „Registrierung abgeschlossen“ (CompleteRegistration) stellen, wenn im Events Manager echte
  Ereignisse ankommen.

## Geänderte Texte

- Einwilligungshinweis: nennt jetzt Seitenaufrufe (nur Meta) und die Registrierung; Fassung 2 (alle werden neu gefragt).
- Datenschutzerklärung 5.4 (Stand 31.10.2026): Meldung erst nach Bestätigung, einmal je Konto; PageView an Meta;
  `_fbp`/`_fbc` in der Zuordnung. Nicht von der Kanzlei geprüft (wie 5.4 insgesamt).

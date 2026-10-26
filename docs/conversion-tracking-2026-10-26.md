# Conversion-Tracking: Auftrag vom 26.10.2026 und warum er noch nicht umgesetzt ist

Stand 26.10.2026. **Es ist nichts gebaut und nichts geladen.** Der Auftrag (Google-Tag und Meta-Pixel im Browser,
Einwilligung im Cookie-Banner, UTMs im Profil) widerspricht dem, was die Kanzlei am 20./21.09.2026 abgestimmt hat und was die
Datenschutzerklärung zusagt. Das ist eine Entscheidung des Betreibers, nicht eine Frage der Technik.

## Angelegte Werte (vom Betreiber, 26.10.2026)

| | |
|---|---|
| Google Ads | Conversion „Registrierung“, Kategorie Registrierung, primäre Aktion, Zählung „Eine“, Platzhalterwert 1 EUR, Erweiterte Conversions aus. Ereignis: `gtag('event','conversion',{'send_to':'AW-18531716505/xplPCJeu1aodEJmbzoRF'})`, Google-Tag `AW-18531716505` |
| Meta | Datensatz „LernZeit Website“, Pixel-ID 1463780805688443 (Business-Portfolio LernZeit UG), Standardereignis `CompleteRegistration`, Conversions-API-Verknüpfung abgewählt, dem Werbekonto 2032123044153840 noch nicht zugewiesen |

## Was dagegen steht (alles im Repo belegt)

1. **Keine Skripte von Google oder Meta auf der Website.** `docs/datenschutz-entwurf.md`, § 8a: „Wir binden für diese
   Messung keine Skripte von Google oder Meta in unsere Website ein. Es werden weder ein Werbe-Pixel noch Google Analytics
   noch ein vergleichbarer Dienst geladen — auf keiner Seite unseres Angebots.“ Ein Google-Tag oder ein Meta-Pixel bricht diese
   Zusage. Die Datenschutzerklärung müsste vorher geändert und juristisch geprüft werden (`docs/positionierung.md`, W1).
2. **Der von der Kanzlei abgestimmte Weg ist serverseitig** (`docs/anwalt-nachlieferung.md`, Abschnitt 2): Nach der Einwilligung
   bei der Eltern-Registrierung wird die Klick-Kennung (`gclid`, `gbraid`, `wbraid`) in `ad_attribution` gespeichert und
   täglich aus einer Edge Function an Google gemeldet. Ohne E-Mail, ohne Nutzer-ID, ohne Betrag, ohne User-Agent und URL.
   Dieser Weg ist **nicht gebaut** (keine Verbindung zu Google, `reported_at` bleibt leer). Es fehlen laut Nachlieferung:
   Google-Konto mit Auftragsverarbeitung, die Einwilligung (CMP) und die Freigabe des Payloads durch die Kanzlei.
3. **Meta ist abgeschaltet.** `src/lib/analytics.ts` („Warum `fbclid` fehlt“): Die Kanzlei hat am 21.09.2026 einen technischen
   Konflikt festgestellt, weil Metas Schnittstelle Ereignis-URL und User-Agent verlangt, beides nicht von der abgestimmten
   Konfiguration gedeckt. Ein Meta-Pixel im Browser überträgt URL und User-Agent immer.
4. **Es gibt keine Einwilligungsabfrage.** `setWerbeEinwilligung()` steht dauerhaft auf `false` (`analytics.ts`); die CMP
   gibt es nicht (`docs/positionierung.md`, W2, „Blocker“). Ohne sie darf nichts gespeichert oder übermittelt werden.
5. **Werbemessung nur im Erwachsenenbereich.** Kanzlei-Vorgabe vom 20.09.2026: Messung erst bei der Eltern-Registrierung, nie
   auf öffentlichen Seiten oder in Kinderbereichen (`supabase/migrations/20260920100000_ad_attribution_nur_eltern.sql`).
   Ein Tag, der auf `/start` oder `/` lädt, widerspricht dem.
6. **„UTMs im Profil speichern“ umgeht die Einwilligungsschranke.** `ad_attribution` speichert `utm_source` und `utm_campaign`
   (und die übrigen UTM-Felder) schon, aber nur für Elternkonten, nur nach Einwilligung und mit Löschfrist (13 Monate).
   Eine Kopie in `profiles` würde die Zuordnung Konto ↔ Kampagne auch ohne Einwilligung festhalten.
7. **Der Notaus.** `ad_settings.tags_enabled` steht auf `false` und schaltet Tags ohne neues Build ab
   (`docs/werbung-notaus.md`). Er gilt für beide Wege.

## Zwei Wege, eine Entscheidung

| | A: wie abgestimmt (serverseitig) | B: wie im Auftrag (Browser-Tags) |
|---|---|---|
| Google | Offline-Upload der Klick-Kennung aus einer Edge Function nach Einwilligung | `gtag` mit `AW-18531716505`, nur nach Einwilligung |
| Meta | bleibt aus | Pixel `1463780805688443`, `CompleteRegistration`, nur nach Einwilligung |
| Datenschutzerklärung | passt zu § 8a-Entwurf | § 8a und § 8 müssen neu gefasst werden („keine Skripte“ entfällt) |
| Einwilligung | Zustimmung bei der Eltern-Registrierung nötig | Banner mit Consent Mode v2 nötig |
| Kanzlei | Payload-Freigabe offen | neue Prüfung nötig, Meta-Konflikt vom 21.09. offen |
| Google-Konto | Conversion-Aktion vom Typ „Import“ nötig (nach unserem Kenntnisstand lässt sich eine Website-Tag-Aktion nicht per Upload beliefern, im Konto prüfen) | die angelegte Aktion passt |
| Aufwand | Edge Function, Einwilligung, Auftrag | Banner, zwei Tags, Consent Mode |

## Was ohne Entscheidung schon geht

- Nichts am Tracking. Die Zielseiten sind seit dem 26.10.2026 vorgerendert; UTMs aus den Anzeigen speichert die Website
  weiter für den eigenen Trichter (`analytics_events`, ohne Personenbezug), `?utm_*` geht beim Klick auf „Kostenlos registrieren“
  nicht verloren, weil sie schon beim Ankommen im Browser liegen.
- Eltern-Registrierungen lassen sich schon heute Kampagnen zuordnen, ohne Profilfeld: `ads_funnel_summary` und
  `analytics_events` (utm_campaign je Besuch, Verknüpfung nur über die anonyme Kennung).

## Was ich nach der Entscheidung baue

**Weg A:** Zustimmungsfeld (nicht vorausgewählt) bei der Eltern-Registrierung → `setWerbeEinwilligung(true)`; `ad_attribution` mit
`utm_source`, `utm_campaign` und Klick-Kennung (die Kennung muss dafür bis zur Registrierung in der Adresse mitwandern,
offene Rückfrage 3.1 an die Kanzlei); Edge Function `ad-conversions` (täglich, `reported_at`); `tags_enabled` als Schalter.
**Weg B:** Einwilligungsbanner mit Consent Mode v2; `gtag.js` und Pixel erst nach Zustimmung laden; Ereignis nur nach
`sign_up_completed` mit Rolle `parent` (Kinder- und Testkonten ausgenommen), ohne E-Mail oder Namen; `tags_enabled` als Schalter;
Datenschutzerklärung nach `docs/datenschutz-entwurf.md` anpassen.

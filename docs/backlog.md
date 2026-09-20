# Backlog

Was bewusst zurückgestellt ist — mit dem Grund, damit in vier Wochen niemand
rätselt, ob es vergessen wurde oder gewollt war.

**Stand:** 20.09.2026

---

## Produkt

### Modus „ausgewählte Apps"

Das Kind sucht beim Einlösen aus, für welche App die verdiente Zeit gelten
soll, statt „alles oder nichts". Beide Modi waren von Anfang an gewünscht;
gebaut ist bisher nur `all`.

Der Vertrag sieht den Modus schon vor (`UnlockMode = 'all' | 'selected'` in
`src/services/screenTime/types.ts`), die Umsetzung fehlt.

*Zurückgestellt am 20.09.2026:* erst soll das Bestehende getestet werden.
Braucht keine neuen Apple-Identifier.

### ~~„Eltern fragen" sichtbar machen~~ — erledigt am 20.09.2026

Der Weg ist geschlossen: Das Kindgerät holt die Drücke beim App-Start ab
(`useSyncShieldAttempts`), schreibt sie nach `shield_attempts`, und das
Eltern-Dashboard zeigt sie über den Anträgen an.

---

## Werbung — wartet auf Dritte

| | Wartet auf |
|---|---|
| Datenschutzerklärung überarbeiten | Antwort der Kanzlei auf Fassung 3 |
| Einwilligungsbanner (Usercentrics) | Anforderungen der Kanzlei, dann Anmeldung |
| Versand der Conversions | Banner und Einwilligung |
| Google-Ads-Konto, Anzeigentexte freigeben | dich |
| Meta | erst nachdem Google Zahlen geliefert hat |

---

## Kleinigkeiten

- **Cron-Auftrag 13** (toter Doppelauftrag): nur über den Supabase-Support zu
  entfernen. Text liegt in `docs/supabase-support-cron13.md`. Kostet bis
  dahin eine Fehlerzeile je Stunde und sonst nichts.
- **Store-Stände und Stripe-Beträge** gegenlesen — zwei Kontrollen, an die
  die Arbeitsumgebung nicht herankommt (Faktenprüfung, Zeilen 5 bis 7).
- **Klassenwechsel 2026** wurde bewusst nicht nachgeholt; Eltern korrigieren
  selbst. Der reguläre Lauf am 01.08.2027 ist davon unberührt.

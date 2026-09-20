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

### „Eltern fragen" sichtbar machen

Der Knopf auf dem Sperrbildschirm merkt sich den Druck, und
`pendingShieldRequests()` holt ihn ab — **aber nichts in der Oberfläche ruft
das auf.** Die Daten werden gesammelt und niemandem gezeigt.

Fehlt: Abholen beim App-Start und eine Anzeige im Eltern-Dashboard („Klara
hat heute dreimal um Zeit gebeten").

*Nicht zurückgestellt, sondern noch nicht fertig.* Der halbe Weg ist
ausgeliefert, weil der Rest ohne einen weiteren Build nichts gebracht hätte.

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

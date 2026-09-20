# Notaus und Ausgabenrahmen

**Ehrlich zum Umfang, gleich im ersten Absatz:** Ein Notaus im Code kann kein
Geld anhalten. Ausgegeben wird bei Google, und nur das Google-Ads-Konto kann
Kampagnen stoppen. Der Notaus hat deshalb zwei Hälften, und die wichtigere
liegt nicht in diesem Repository.

---

## 1. Die Hälfte, die im Google-Ads-Konto liegt

Diese Einstellungen sind die eigentliche Ausgabenbremse. Sie werden **einmal
beim Einrichten** gesetzt, nicht im Notfall.

| Einstellung | Wert | Warum |
|---|---|---|
| Tagesbudget der Kampagne | **8,00 €** | Google darf an einzelnen Tagen bis zum Doppelten ausliefern, gleicht das aber über den Monat aus. 8 € × 30,4 Tage ≈ 243 € — knapp unter dem vereinbarten Deckel von 250 €. |
| Kontobudget (optional) | 250 € je Monat | Harte Obergrenze auf Kontoebene. Wenn Google sie im Konto anbietet, setzen — sie ist verbindlicher als das Tagesbudget. |
| Zahlungsart | manuelle Zahlung, wenn verfügbar | Es kann nur ausgegeben werden, was vorher eingezahlt wurde. Die wirksamste Bremse überhaupt. |
| Abrechnungsbenachrichtigung | bei 50 %, 80 %, 100 % | Damit die Zahl auffällt, bevor sie erreicht ist. |

**Im Notfall:** Kampagne im Google-Ads-Konto pausieren. Das ist der einzige
Weg, der die Ausgabe sofort stoppt. Dauert etwa dreißig Sekunden.

---

## 2. Die Hälfte, die in der Datenbank liegt

Die Tabelle `public.ad_settings` hat genau eine Zeile:

| Spalte | Bedeutung |
|---|---|
| `tags_enabled` | Ob lernzeit.app Werbe-Tags laden darf. Steht heute auf `false`. |
| `monthly_cap_eur` | Der vereinbarte Deckel, 250 €. Dokumentiert den Beschluss; er erzwingt ihn nicht. |
| `note` | Warum der Schalter gerade so steht. |

**Was das Abschalten bewirkt:** Keine Conversion wird mehr gemeldet, keine
neue Klick-Zeile mehr angelegt. Es wirkt sofort und ohne neues Build — der
Wert wird beim Laden der Seite gelesen.

**Was es nicht bewirkt:** Google liefert weiter aus und rechnet weiter ab. Wer
nur hier abschaltet, zahlt weiter und misst nichts mehr — die schlechteste
aller Kombinationen.

**Deshalb gilt die Reihenfolge:**

```
1. Kampagne im Google-Ads-Konto pausieren   <- stoppt das Geld
2. tags_enabled auf false setzen            <- stoppt die Datenerhebung
```

Umgekehrt nie.

### Abschalten

Im Supabase-Dashboard unter *SQL Editor*:

```sql
update public.ad_settings
   set tags_enabled = false,
       note = 'Warum abgeschaltet, mit Datum',
       updated_at = now();
```

### Wieder einschalten

```sql
update public.ad_settings
   set tags_enabled = true,
       note = 'Warum wieder an, mit Datum',
       updated_at = now();
```

---

## 3. Wann abgeschaltet wird

Aus `docs/positionierung.md`, Abschnitt 13.4 — hier als Handlungsanweisung:

| Beobachtung | Was zu tun ist |
|---|---|
| Ausgabe erreicht 250 € im Kalendermonat | Beide Hälften abschalten. |
| Kosten je Anmeldung über 25 € nach 100 Klicks | Anhalten und prüfen. Kein Automatismus, aber auch kein Weiterlaufenlassen. |
| 150 Klicks ohne eine einzige Anmeldung | Anhalten. Etwas ist grundlegend falsch, weitere Klicks kosten nur Geld. |
| Eine Anzeige verspricht etwas, das das Produkt nicht hält | Sofort abschalten, unabhängig von den Zahlen. |

---

## 4. Wo die Zahlen stehen

| Frage | Wo |
|---|---|
| Was wurde ausgegeben? | Nur im Google-Ads-Konto. Die Datenbank weiß es nicht. |
| Wie viele Klicks kamen an? | Nur im Google-Ads-Konto. Klicks ohne Anmeldung werden seit dem 20.09.2026 nicht mehr gespeichert. |
| Was ist aus ihnen geworden? | `select * from public.ads_funnel_summary;` |

`ads_funnel_summary` ist der Trichter aus Abschnitt 13 der Positionierung:
Anmeldung → Kind verknüpft → erste Lernsitzung → zahlendes Abo, je Kampagne.
Er zählt an den eigenen Daten, nicht an Googles Schätzung — Google kennt die
Verknüpfung mit dem Kind nicht und die erste Lernsitzung schon gar nicht.

# Meta-Kampagne einrichten — Phase 2 aus `verkaufstest.md`

Stand 25.09.2026. Alles, was von dieser Seite aus vorbereitet werden kann, ist
fertig. Was fehlt, sind die Schritte im Werbekonto — und die kann nur der
Betreiber gehen. Dauer: etwa 30 Minuten, danach bis zu 24 Stunden Prüfung
durch Meta.

---

## 0. Was schon steht

| | Wo |
|---|---|
| Vier freigegebene Motive mit Material | `werbung/material/` (M1 Video, M2/M3/M5 Karten) |
| Zielseite | `https://lernzeit.app/start` |
| Zählbericht, zählt jetzt auch Käufe richtig | `npm run trichter`, Funktion `funnel_report` |
| Schwellen für Ja/Nein, vorher festgelegt | `verkaufstest.md`, Phase 2 |

M4 fehlt noch als Material (Bildschirmaufnahme aus dem Elternbereich). Die
Kampagne startet mit vier Anzeigen; M4 kann später dazu.

---

## 1. Voraussetzungen im Konto

1. **Facebook-Seite „LernZeit"** — ohne Seite keine Anzeige. Profilbild: das
   App-Symbol. Instagram-Konto verbinden, wenn es eins gibt; sonst läuft die
   Anzeige auf Instagram unter dem Namen der Seite.
2. **Werbekonto** im Business-Manager, Land Deutschland, Währung Euro,
   Zeitzone Europe/Berlin.
3. **Zahlungsart** hinterlegen. Wenn angeboten: Guthaben vorab einzahlen
   (250 €) statt Kreditkarte mit Nachbelastung — dann kann nicht mehr
   ausgegeben werden als eingezahlt.

**Kein Pixel, keine Conversions-API.** Die Kanzlei hat die Meta-Messung
gesperrt. Anzeigen schalten ist davon nicht betroffen. Gezählt wird in der
eigenen Datenbank.

---

## 2. Kampagne

| Feld | Wert | Warum |
|---|---|---|
| Kampagnenziel | **Traffic** | Ohne Pixel kann Meta nicht auf Registrierungen optimieren. Traffic optimiert auf Link-Klicks. |
| Sonderkategorie | keine | |
| Budget | **Laufzeitbudget 250 €** | Harte Obergrenze. Ein Tagesbudget darf Meta an einzelnen Tagen überschreiten. |
| Laufzeit | **14 Tage**, festes Enddatum | Das Enddatum gehört zum Laufzeitbudget; ohne es ist der Test kein Test. |
| A/B-Test | aus | Vier Anzeigen in einer Anzeigengruppe genügen; Meta verteilt selbst. |

## 3. Anzeigengruppe

| Feld | Wert |
|---|---|
| Conversion-Ort | Website |
| Optimierung | Link-Klicks |
| Standort | Deutschland |
| Alter | 28–55 |
| Geschlecht | alle |
| Detailliertes Targeting | **keins** (Entscheidung aus `verkaufstest.md`: keine Interessenverfeinerung) |
| Platzierungen | Advantage+ (automatisch) |

Beworben werden Eltern, nie Kinder. Keine Zielgruppe aus eigenen Daten
hochladen — auch nicht „nur E-Mail-Adressen".

## 4. Die vier Anzeigen

Für alle gilt: **Website-URL** `https://lernzeit.app/start`,
**Call-to-Action** „Mehr dazu", **Beschreibung** leer.

Die Überschrift der Motive steht **auf dem Bild**. Das Überschriftenfeld von
Meta zeigt auf dem Handy nur rund 40 Zeichen; dort steht deshalb ein kurzer
Satz aus dem jeweiligen Motiv.

| Anzeige | Material | Primärer Text (wortgleich aus `motive.json`) | Überschriftenfeld |
|---|---|---|---|
| M1 | `M1-demo-feed-4x5.mp4` + `M1-demo-9x16.mp4` | Bei LernZeit verdient Ihr Kind sich die Zeit selbst: 30 Sekunden Handyzeit je richtig gelöster Aufgabe. 4 Wochen kostenlos. | 4 Wochen kostenlos. |
| M2 | `M2-feed-4x5.png` + `M2-story-9x16.png` | Meine Tochter rechnet jetzt zehn Aufgaben, wenn sie länger aufs Handy will. Die Zeit schreibt die App gut, nicht ich. 2,99 € im Monat. | 2,99 € im Monat. |
| M3 | `M3-feed-4x5.png` + `M3-story-9x16.png` | Richtige Antwort, Zeit aufs Konto. Klasse 1 bis 10, alle Fächer der jeweiligen Klassenstufe. 4 Wochen kostenlos testen. | 4 Wochen kostenlos testen. |
| M5 | `M5-feed-4x5.png` + `M5-story-9x16.png` | Aufgaben lösen, Zeit verdienen. Daten auf Servern in Frankfurt. | Aufgaben lösen, Zeit verdienen. |

Jedes Überschriftenfeld ist ein Satz aus dem freigegebenen Text desselben
Motivs, kein neuer Text.

Bei allen vier Anzeigen beide Formate in **eine** Anzeige laden: Meta nimmt
die 4:5-Fassung für den Feed und die 9:16-Fassung für Stories und Reels
(„Medien je Platzierung anpassen"). Bei M1 ist das wichtig: Das 9:16-Video
allein würde Meta im Feed auf 4:5 beschneiden und dabei die erste Zeile der
Überschrift kappen.

**M2 nur als Karte.** Kein Name, kein Foto, keine Anführungszeichen — es darf
nicht wie ein echtes Kundenzitat aussehen.

**Ausschalten, bevor veröffentlicht wird:** Metas automatische
„Advantage+ Creative"-Verbesserungen (Text-Varianten, Musik, Bildzuschnitt,
generierte Hintergründe). Sie ändern freigegebene Texte und Bilder ohne
Rückfrage.

---

## 5. Während der 14 Tage

- **Täglich einmal** den Zählbericht lesen (`npm run trichter` oder
  Claude fragen). Nicht an den Anzeigen drehen, bevor Tag 5 vorbei ist —
  Meta braucht die ersten Tage zum Einpendeln.
- **Keine anderen Kanäle parallel.** Ohne Klick-Kennung unterscheidet der
  Bericht nicht, woher jemand kam. Ein Forumsbeitrag in Woche 1 macht aus
  dem Meta-Test ein Rätsel.
- **Welches Motiv trägt**, zeigt Meta selbst (Klickrate und Kosten je Klick
  je Anzeige). Welches Motiv *Registrierungen* bringt, zeigt ohne
  Klick-Kennung niemand — das ist der Preis der Datenschutz-Entscheidung.
- **Notaus:** Kampagne im Werbeanzeigenmanager pausieren. Der einzige Weg,
  der sofort wirkt.

## 6. Nach den 14 Tagen

Lesart nach der Tabelle in `verkaufstest.md`, Phase 2 — die Schwellen stehen
dort seit dem 24.09.2026 und werden nachträglich nicht verschoben.

Kosten je Registrierung = Ausgabe laut Meta ÷ Summe „elternkonten" im
Zählbericht über die 14 Tage.

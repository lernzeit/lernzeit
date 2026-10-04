# Ratgeber: Quellenprüfung vor der Veröffentlichung

Stand 04.10.2026. Die Artikel in `src/content/ratgeber/` erscheinen erst, wenn
`veroeffentlicht: true` gesetzt ist **und** jede Quelle `geprueftAm` hat. So
erzwingt es `sichtbareArtikel()`.

Die Entwürfe sind aus Suchergebnissen entstanden. Die Originale (AWMF, WHO, mpfs,
BIÖG) waren aus der Cloud-Umgebung nicht erreichbar. **Jede Zeile unten muss
jemand mit Browser am Original prüfen**, zum Beispiel eine Claude-Sitzung in
Claude Desktop. Stimmt eine Aussage nicht, wird der Artikeltext korrigiert,
nicht die Quelle passend gemacht.

So geht die Prüfung:
1. Quelle öffnen, die Stelle suchen, die Aussage vergleichen (Zahl, Alter,
   Wortlaut sinngemäß).
2. Ergebnis in die Spalte „Befund“ schreiben: `ok`, `korrigieren: …` oder
   `nicht gefunden`.
3. Sind alle Zeilen einer Quelle `ok`: in der Artikeldatei `geprueftAm` auf das
   Datum setzen. Bei Abweichungen den Text anpassen und erneut prüfen.
4. Erst wenn alle Quellen eines Artikels geprüft sind: `veroeffentlicht: true`.

## Artikel 1: Wie viel Bildschirmzeit ist für Kinder in Ordnung?

Datei: `src/content/ratgeber/bildschirmzeit-nach-alter.ts`

| Nr. | Aussage im Text | Quelle | Befund |
|---|---|---|---|
| 1.1 | Leitlinie 2023 von elf Fachgesellschaften, federführend DGKJ | [1] AWMF 027-075 (Leitlinientext, Titelseite/Impressum) | |
| 1.2 | Gilt für Freizeit, schulische Bildschirmnutzung zählt nicht mit | [1] | |
| 1.3 | Unter 3 Jahren gar nicht, auch nicht passiv („nebenbei, Fernseher im Raum“ ist unsere Erläuterung von „passiv“, prüfen, ob die Leitlinie das so meint) | [1] | |
| 1.4 | 3–6 Jahre: höchstens 30 Minuten an einzelnen Tagen, nicht allein | [1] | |
| 1.5 | 6–9 Jahre: höchstens 30–45 Minuten an einzelnen Tagen | [1] | |
| 1.6 | 9–12 Jahre: höchstens 45–60 Minuten, Internet nur unter Aufsicht | [1] | |
| 1.7 | 12–16 Jahre: höchstens 1–2 Stunden täglich, nicht nach 21 Uhr | [1] | |
| 1.8 | BIÖG: möglichst nicht täglich, sonst unter den Zeiten bleiben | [3] kindergesundheit-info.de, Jahr der Seite ergänzen | |
| 1.9 | WHO 2019: unter 2 Jahren kein Bildschirm, 2–4 Jahre höchstens 1 Stunde, weniger ist besser | [2] WHO-Meldung 24.04.2019 | |
| 1.10 | WHO begründet mit Bewegung und Schlaf | [2] | |
| 1.11 | LernZeit: Obergrenze ab Werk 30 Min werktags, 60 am Wochenende, mit Premium anpassbar | `docs/faktenpruefung.md` Zeile 4 und 9 (bereits geprüft) | ok |

## Artikel 2: Ab wann ein eigenes Smartphone?

Datei: `src/content/ratgeber/eigenes-smartphone.ts`

| Nr. | Aussage im Text | Quelle | Befund |
|---|---|---|---|
| 2.1 | KIM-Studie 2024 des mpfs, befragt Kinder 6–13 und Eltern; Erscheinungsjahr der Studie | [1] mpfs, PDF `https://mpfs.de/app/uploads/2025/05/KIM-Studie-2024.pdf` | |
| 2.2 | 46 % der 6- bis 13-Jährigen haben ein eigenes Smartphone | [1] | |
| 2.3 | Nach Alter: 6–7: 11 %, 8–9: 33 %, 10–11: 63 %, 12–13: 79 % | [1] | |
| 2.4 | 13 % der Kinder ohne eigenes Gerät dürfen sich eines ausleihen | [1] | |
| 2.5 | 70 % nutzen das Internet (2022: 62 %) | [1] | |
| 2.6 | Mehr als die Hälfte der Internetnutzer ist täglich online | [1] | |
| 2.7 | Über drei Viertel der Smartphone-Besitzer dürfen es mit in die Schule nehmen, Nutzung meist nur in den Pausen | [1] | |
| 2.8 | Leitlinie: 9–12 Jahre höchstens 45–60 Minuten, Internet unter Aufsicht | [2] AWMF 027-075 | |

## Zurückgestellt

- **Mediensucht (DAK/UKE):** Die Zahlen unterscheiden sich je nach Berichtsjahr
  (Bericht vom 12.03.2025, neuer Bericht vom 24.03.2026 mit KI-Chatbots).
  Erst schreiben, wenn der aktuelle Ergebnisbericht im Original gelesen ist.

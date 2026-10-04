# Ratgeber: Quellenprüfung vor der Veröffentlichung

Stand 04.10.2026. Die Artikel in `src/content/ratgeber/` erscheinen erst, wenn
`veroeffentlicht: true` gesetzt ist **und** jede Quelle `geprueftAm` hat. So
erzwingt es `sichtbareArtikel()`.

Geprüft am 04.10.2026 an den Originalen:
- Leitlinie AWMF 027-075, Version 1.0 (PDF von medienleitlinie.de, Dateiname
  `027-075l_..._2023-09.pdf`, identisch mit der AWMF-Fassung; der direkte
  AWMF-PDF-Link lieferte HTTP 500, die Registerseite ist erreichbar).
- WHO-Meldung vom 24.04.2019 (who.int).
- BIÖG-Nachricht „Kinder und Medien: Wie viel Bildschirmzeit ist okay?“ vom
  08.08.2025 (kindergesundheit-info.de).
- KIM-Studie 2024, PDF `https://mpfs.de/app/uploads/2025/05/KIM-Studie-2024.pdf`
  (Stuttgart, Juni 2025). Seitenangaben = PDF-Seiten.

So geht die Prüfung bei neuen Artikeln:
1. Quelle öffnen, die Stelle suchen, die Aussage vergleichen (Zahl, Alter,
   Wortlaut sinngemäß).
2. Ergebnis in die Spalte „Befund“ schreiben: `ok`, `korrigiert: …` oder
   `nicht gefunden`.
3. Sind alle Zeilen einer Quelle `ok`/`korrigiert`: in der Artikeldatei
   `geprueftAm` setzen. Nicht Auffindbares wird gestrichen.
4. Erst wenn alle Quellen eines Artikels geprüft sind: `veroeffentlicht: true`.

## Artikel 1: Wie viel Bildschirmzeit ist für Kinder in Ordnung?

Datei: `src/content/ratgeber/bildschirmzeit-nach-alter.ts`

| Nr. | Aussage im Text | Quelle | Befund |
|---|---|---|---|
| 1.1 | Leitlinie 2023 von elf Fachgesellschaften, federführend DGKJ | [1] | korrigiert: Titelseite nennt 10 Gesellschaften/Verbände/Behörden (u. a. BZgA, BVKJ) plus Patientenvertretung (Fachverband Medienabhängigkeit); Text jetzt „zehn Fachgesellschaften, Verbände und Behörden gemeinsam mit einer Patientenvertretung“. Federführung DGKJ ok (S. 2). Erstveröffentlichung 07/2023, gültig ab 15.07.2023 (S. 56–57) |
| 1.2 | Gilt für Freizeit, schulische Bildschirmnutzung zählt nicht mit | [1] | korrigiert: Empfehlungen nennen „freizeitliche Nutzung“ (S. 29–30), aber S. 16: für die gesundheitlichen Risiken ist „die Summe der Bildschirmmediennutzung für Schule und Freizeit zusammengenommen ausschlaggebend“. Text entsprechend geändert |
| 1.3 | Unter 3 Jahren gar nicht, auch nicht passiv | [1] | korrigiert: Empf. 25 (S. 29) „jeglicher passiven und aktiven Nutzung“; „passiv“ meint laut S. 35 das Mitschauen bei Eltern oder älteren Geschwistern. Beispiel „Fernseher im Raum“ ersetzt |
| 1.4 | 3–6 Jahre: höchstens 30 Minuten an einzelnen Tagen, nicht allein | [1] | korrigiert: Empf. 26 (S. 29) „nicht ohne Anwesenheit der Eltern“; Text jetzt „Die Eltern sollen dabei sein“ |
| 1.5 | 6–9 Jahre: höchstens 30–45 Minuten an einzelnen Tagen | [1] | ok, Empf. 27 (S. 30) |
| 1.6 | 9–12 Jahre: höchstens 45–60 Minuten, Internet nur unter Aufsicht | [1] | ok, Empf. 30 „täglich“ und 32 „nur beaufsichtigten Internetzugang“ (S. 30); „täglich“ im Text ergänzt |
| 1.7 | 12–16 Jahre: höchstens 1–2 Stunden täglich, nicht nach 21 Uhr | [1] | ok, Empf. 33 „maximal 1-2 Stunden am Tag und bis spätestens 21 Uhr“ (S. 30) |
| 1.8 | BIÖG: möglichst nicht täglich, sonst unter den Zeiten bleiben | [3] BIÖG, Nachricht vom 08.08.2025 | nicht gefunden: Die Seite nennt die Zeiten der Leitlinie, aber keine Empfehlung „möglichst nicht täglich“ (sie schlägt sogar ein täglich/wöchentlich ausschöpfbares Zeitkontingent vor). Satz gestrichen, ebenso die nicht belegte Deutung „Kontingent … nicht gemeint“; Quelle [3] aus dem Artikel entfernt. Ersatz: Hinweis „an einzelnen Tagen“ vs. „täglich“ direkt aus [1] (S. 29–30) |
| 1.9 | WHO 2019: unter 2 Jahren kein Bildschirm, 2–4 Jahre höchstens 1 Stunde, weniger ist besser | [2] | ok: Meldung 24.04.2019; unter 1 Jahr „not recommended“, 1-Jährige „not recommended“, 2 Jahre und 3–4 Jahre „no more than 1 hour; less is better“ (Abschnitte Infants, Children 1–2, Children 3–4) |
| 1.10 | WHO begründet mit Bewegung und Schlaf | [2] | korrigiert: WHO nennt Ersatz sitzender Bildschirmzeit durch aktives Spielen und ausreichend guten Schlaf; die frühere Formulierung „beides leidet, wenn sie lange sitzen“ stand so nicht im Original |
| 1.11 | LernZeit: Obergrenze ab Werk 30 Min werktags, 60 am Wochenende, mit Premium anpassbar | `docs/faktenpruefung.md` Zeile 4 und 9 | ok |

## Artikel 2: Ab wann ein eigenes Smartphone?

Datei: `src/content/ratgeber/eigenes-smartphone.ts`

| Nr. | Aussage im Text | Quelle | Befund |
|---|---|---|---|
| 2.1 | KIM-Studie 2024 des mpfs, befragt Kinder 6–13 und Eltern; Erscheinungsjahr | [1] | ok: Kinder 6–13 und Haupterzieher*innen persönlich befragt (S. 4); erschienen Stuttgart, Juni 2025 (Jahr 2025) |
| 2.2 | 46 % der 6- bis 13-Jährigen haben ein eigenes Smartphone | [1] | ok (S. 8) |
| 2.3 | Nach Alter: 6–7: 11 %, 8–9: 33 %, 10–11: 63 %, 12–13: 79 % | [1] | ok (S. 9). Satz zum „größten Sprung“ präzisiert: laut S. 9 zwischen 8–9 und 10–11 Jahren (+30 PP), Schulwechsel ebenfalls dort genannt |
| 2.4 | 13 % der Kinder ohne eigenes Gerät dürfen sich eines ausleihen | [1] | ok (S. 9) |
| 2.5 | 70 % nutzen das Internet (2022: 62 %) | [1] | korrigiert: 72 % (2022: 70 %) (S. 36) |
| 2.6 | Mehr als die Hälfte der Internetnutzer ist täglich online | [1] | ok: 54 % der internetnutzenden Kinder täglich (S. 36) |
| 2.7 | Über drei Viertel der Smartphone-Besitzer dürfen es mit in die Schule nehmen, Nutzung meist nur in den Pausen | [1] | ok mit Präzisierung: 77 % der Schulkinder mit eigenem Handy/Smartphone; 63 % derer, die es mitnehmen dürfen, nur in den Pausen (S. 55). Text sagt jetzt „Schulkinder mit eigenem Handy“ |
| 2.8 | Leitlinie: 9–12 Jahre höchstens 45–60 Minuten, Internet unter Aufsicht | [2] AWMF 027-075 | ok, Empf. 30 und 32 (S. 30) |

## Zurückgestellt

- **Mediensucht (DAK/UKE):** Die Zahlen unterscheiden sich je nach Berichtsjahr
  (Bericht vom 12.03.2025, neuer Bericht vom 24.03.2026 mit KI-Chatbots).
  Erst schreiben, wenn der aktuelle Ergebnisbericht im Original gelesen ist.

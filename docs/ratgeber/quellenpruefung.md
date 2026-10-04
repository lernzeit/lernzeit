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

## Artikel 3: Regeln für Bildschirmzeit – Mediennutzungsvertrag

Datei: `src/content/ratgeber/mediennutzungsvertrag.ts`

Geprüft am 04.10.2026 am Original. Die Arbeitsumgebung von Claude erreichte die
Seiten nicht (Netzsperre). Geöffnet hat sie deshalb der Lovable-Agent, ohne
Änderungen am Code. Er hat jede Zeile mit wörtlichem Zitat und URL belegt; die
Zitate stehen unten.
[1] = https://www.internet-abc.de/eltern/familie-medien/mediennutzungsvertrag/,
[2] = https://www.mediennutzungsvertrag.de/. Die klicksafe-Seiten zum Vertrag
meldeten „Seite nicht gefunden“ und werden nicht zitiert.

| Nr. | Aussage im Text | Quelle | Befund |
|---|---|---|---|
| 3.1 | Online-Werkzeug von klicksafe und Internet-ABC | [1] | korrigiert: „kostenlos“ gestrichen, steht nirgends. Zitat: „haben die Medienkompetenzinitiativen klicksafe und Internet-ABC ein Online-Tool zur Erstellung eines Mediennutzungsvertrags entwickelt“ |
| 3.2 | Regelvorlagen für Kinder bis zwölf und über zwölf | [1] | korrigiert: statt „6 bis 12“. Zitat: „Regelvorlagen für die Altersgruppen bis zwölf und über zwölf Jahren stehen bereit“ |
| 3.3 | Bereiche; Vorlagen anpassbar, eigene Regeln möglich | [2] Menü, [1] | korrigiert: Bereichsnamen wie im Menü („Allgemeine Regeln · Zeitliche Regelung · Handy / Smartphone · Internet · Fernsehen / (Online-)Videos · Digitale Spiele / Spielen · Sonstige Verabredungen“). Zitat [1]: „Zahlreiche, individuell anpassbare Regelvorlagen … Darüber hinaus können auch eigene Regeln erstellt werden.“ |
| 3.4 | Drucken oder als PDF speichern; Platz für Unterschriften von Erwachsenen und Kind | [2] | korrigiert: „von allen unterschrieben“ gestrichen. Fundstelle: Menüpunkt „Drucken/PDF“, Felder „Unterschrift Erwachsene(r)“ und „Kind“ |
| 3.5 | Auch Regeln für die Eltern, wegen der Vorbildfunktion | [1] | ok: „Um auch die Eltern im Sinne ihrer Vorbildfunktion in die Pflicht zu nehmen, sind auch passende Elternregeln vorhanden.“ |
| 3.6 | Leitlinie: 6–9 J. 30–45 Min. an einzelnen Tagen; 9–12 J. 45–60 Min. täglich, Internet unter Aufsicht; 12–16 J. 1–2 Std., nicht nach 21 Uhr | [3] AWMF 027-075 | ok, wie 1.5–1.7 (Empf. 27, 30, 32, 33, S. 30) |
| 3.7 | LernZeit: 30 Sek. je Aufgabe, Obergrenze 30/60 Min., Freigabe per Anfrage | `docs/faktenpruefung.md` 3, 4, 10; `src/content/faq.ts` | ok |

Die Ratschläge im Abschnitt „Damit die Abmachung im Alltag hält“ stammen von der
Redaktion, sind keine Quellenaussage und enthalten keine Zahlen.

## Artikel 4: Bildschirmzeit beim Kind einstellen – iPhone und Android

Datei: `src/content/ratgeber/bildschirmzeit-einstellen.ts`

Geprüft am 04.10.2026 am Original, ebenfalls über den Lovable-Agenten. Apple
beschreibt auf der aktuellen Hilfeseite iOS 27; dort tragen die Funktionen neue
Namen. Die Erklärungen stammen deshalb aus dem iPhone-Handbuch für iOS 26.
**Bei der nächsten iOS-Version Namen und Links erneut prüfen.**

| Nr. | Aussage im Text | Quelle | Befund |
|---|---|---|---|
| 4.1 | Familienfreigabe, eigener Apple Account je Mitglied, Verwaltung vom eigenen iPhone/iPad/Mac | [1] support.apple.com/de-de/108806 (veröffentlicht 23.09.2026) | ok: „stelle sicher, dass du die Familienfreigabe eingerichtet hast und dass jedes Familienmitglied über einen eigenen Apple Account verfügt.“ / „kannst du die „Bildschirmzeit“ und die Kindersicherung deines Kindes von deinem eigenen iPhone, iPad oder Mac aus einrichten und verwalten.“ |
| 4.2 | Zeitpläne: nur Anrufe, Nachrichten und erlaubte Apps; iOS 26 „Auszeit“, iOS 27 „Bildschirmzeitpläne“ | [2] iOS 26, [1] | korrigiert: statt „ausgewählte Apps und Anrufe“. Zitat [2]: „Während einer Auszeit sind nur Anrufe, Nachrichten und Apps verfügbar, die du erlaubt hast.“ |
| 4.3 | Tägliche Zeitlimits für App-Kategorien (z. B. Spiele, soziale Netzwerke) und einzelne Apps; iOS 27 „Nutzungszeiten“ | [2], [1] | ok: „Lege ein Zeitlimit für eine Kategorie von Apps (z. B. „Spiele“ oder „Soziale Netzwerke“) und für einzelne Apps fest.“ / „indem du tägliche Zeitlimits festlegst.“ |
| 4.4 | Apps und Kontakte, die während der Zeitpläne und nach dem Limit verfügbar bleiben | [2] | korrigiert: Begriff „Immer erlaubt“ und Beispiel „Telefon“ gestrichen. Zitat: „Wähle Apps und Kontakte aus, die während Auszeiten und nach dem Erreichen deines Limits verfügbar bleiben.“ |
| 4.5 | Eigener Code schützt die Einstellungen | [3] | ok: „Du kannst einen Code für ein Kind erstellen, der eingegeben werden muss, bevor die Einstellungen für „Bildschirmzeit“ geändert werden können.“ |
| 4.6 | Kind fordert mehr Zeit an, Eltern genehmigen in Einstellungen > Bildschirmzeit oder in „Nachrichten“ | [4] | korrigiert: „oder lehnen ab“ gestrichen. Zitat: „Wenn dein Kind mehr Bildschirmzeit anfordert, kannst du die Anfrage unter „Einstellungen“ > „Bildschirmzeit“ oder in der App „Nachrichten“ genehmigen“ |
| 4.7 | Family Link auf dem eigenen Gerät (Android ab 6.0, iPhone ab iOS 16); Konto für Kind unter 13 erstellen oder Elternaufsicht für bestehendes Konto | [5] | ok: „Sie müssen ein Android-Gerät (6.0 oder höher), ein iPhone (iOS 16 oder höher) … nutzen, auf das Sie die Family Link App herunterladen können.“ / „um ein Google-Konto für Ihr Kind unter 13 Jahren zu erstellen … Außerdem haben Sie die Möglichkeit, die Elternaufsicht für ein …“ |
| 4.8 | Tageslimit, Ruhezeiten mit Sperre, Limits für einzelne Apps, nicht für System-Apps | [6] | korrigiert: „Schlafenszeit“ heißt „Ruhezeiten“. Zitate: „Aktivieren Sie Tageslimit.“ / „Sie können festlegen, dass das Android-Gerät oder Chromebook Ihres Kindes gesperrt wird …“ / „Für System-Apps können keine App-Limits festgelegt werden.“ |
| 4.9 | Bonuszeit für heute, ohne Limits zu ändern, während oder kurz vor der Sperrung | [6] | ok: „Sie können Ihrem Kind für heute mehr Zeit auf seinem Gerät erlauben. Dabei ist es nicht erforderlich, das Tageslimit, die Ruhezeiten oder den Schulmodus zu ändern. Dazu können Sie während oder kurz vor der Sperrung des Android-Geräts Ihres Kindes Bonuszeit hinzufügen.“ |
| 4.10 | Kindersicherung bei Apple eingebaut | [1] | korrigiert: „kostet nichts extra“ gestrichen (Apple und Google sagen das nicht). Zitat [1]: „mit der Kindersicherung, die direkt in iPhone, iPad und Mac integriert ist“ |
| 4.11 | LernZeit: 30 Sek., Obergrenze, Anfrage; Freigabe heute noch selbst in Family Link/Bildschirmzeit | `docs/faktenpruefung.md` 3, 4, 10; `docs/positionierung.md` (Satz für die Landingpage) | ok |

## Zurückgestellt

- **Mediensucht (DAK/UKE):** Die Zahlen unterscheiden sich je nach Berichtsjahr
  (Bericht vom 12.03.2025, neuer Bericht vom 24.03.2026 mit KI-Chatbots).
  Erst schreiben, wenn der aktuelle Ergebnisbericht im Original gelesen ist.

# Plan: LernZeit für Kinder spannender machen (11.10.2026)

Anstoß: Rechen-Inseln (Maskottchen, Münzen und Avatare, Fehlerkiste, Reise durchs Schuljahr).
Die Seite war aus der Claude-Umgebung nicht erreichbar; der Plan beruht auf der Beschreibung
des Betreibers.

## Thema (entschieden 11.10.2026): „Klecks und die Tintenkarte“

Eine Welt aus dem Schulheft statt fremder Inseln. Klecks, ein Tintenklecks, ist aus dem Füller
entwischt und malt in den Heften des Kindes eine Welt fürs Schuljahr; dafür braucht er Tinte.

| Baustein | Name |
|---|---|
| Maskottchen | **Klecks** (animiert: atmen, blinzeln, umsehen, winken, Tropfen; Stimmungen freut sich / denkt nach / macht Mut) |
| Spielgeld | **Tintentropfen** (statt Sterne/Münzen) |
| Reise durchs Schuljahr | **Tintenkarte**: jedes Thema ein Ort (z. B. Minus-Keller, Prozent-Pizzeria), „ab November“ |
| Fortschritt je Ort | **3 Stempel** wie vom Lehrer |
| Fehlerkiste | **Berichtigung**: Kleckse wegwischen |
| Sammlung | **Federmäppchen**: Figuren (Avatare) und Abzeichen |

Nicht übernommen: „Weg zur 1“ (Notenversprechen), zusätzliches Level/XP. Abzeichen
„Mitternachts-Gelehrter“ und „Nachteule“ entfernen (belohnen Lernen spät nachts).
Entwurf: Artefakt „Klecks und die Tintenkarte“ (claude.ai).

## Ausgangslage

- 75 Kinderkonten (ohne Testkonten), davon **4 in den letzten 14 Tagen aktiv**, im Schnitt an
  2,8 Tagen. Das Problem ist das Dranbleiben, nicht der Einstieg.
- Vorhanden: Zeit-Uhr, Lernpflanze (Serie), Hefte mit Farben und Stickern, Sticker-Wahl bei 5/5,
  Erfolge (889 vergeben), Tagesaufgabe, Lernpläne, 32 Avatare (alle frei).
- Eine Fehlerkiste gibt es technisch schon (`review_queue`, 217 Einträge, Wiederholung nach
  1/3/7 Tagen) – aber unsichtbar: Die Aufgaben werden still in normale Runden gemischt.

## Grundsätze

1. **Bildschirmzeit bleibt die Belohnung.** 30 Sek. pro richtiger Aufgabe, Eltern genehmigen –
   unverändert.
2. **Sterne sind Spielgeld, keine Zeit.** Eine zweite Währung nur für die Spielwelt (Avatare,
   Hefte, Rahmen). Nie in Bildschirmzeit tauschbar, nie mit Geld kaufbar, keine Zufallsbelohnungen
   (Kinder-App, Store-Regeln für Kinder, kein Glücksspiel-Muster).
3. **Kein Druck.** Keine Ranglisten mit anderen Kindern, keine verlierbaren Vorräte, keine
   drängenden Pushes an Kinder. Pausen werden verziehen.
4. **Heft-Gestaltung bleibt.** Maskottchen als Tinte-Zeichnung, keine Verläufe, Emoji nur bei
   Avatar und Stickern.
5. **Kein neues Tracking von Kindern.** Erfolg wird an vorhandenen Daten gemessen
   (`game_sessions`: aktive Kinder pro Woche, Lerntage pro Woche).

## Stufe 1 – schnell spürbar

| # | Baustein | Was das Kind sieht | Technik |
|---|---|---|---|
| 1 | **Berichtigung** (Fehlerkiste) | Kachel auf dem Kind-Start: „3 Aufgaben zum Berichtigen“. Eigene kurze Runde; geschafft → Rotstift wird grüner Haken, Aufgabe verlässt die Kiste. | `review_queue` gibt es; neue Runde „Berichtigung“, Zähler, Animation. Bildschirmzeit wie bei normalen Aufgaben. |
| 2 | **Tintentropfen** | Nach jeder Runde „+5 Tinte“; Stand oben neben dem Namen. Extra für 5/5, Berichtigung, Tagesaufgabe. | Tabelle `kind_tinte` (Buchungen). Vergabe nur serverseitig beim Rundenabschluss (RPC prüft `game_sessions`), Kind kann nicht selbst schreiben. |
| 3 | **Freischalten** | Avatare, Heft-Farben, Sticker-Pakete, Rahmen für die Zeit-Uhr gegen Tinte. Vorschau mit Schloss und Preis. | 8 Avatare frei, Rest mit Preis; bereits gewählte Avatare bleiben. Tabelle `kind_freigeschaltet`, RPC `mit_tinte_freischalten`. |

## Stufe 2 – Spielwelt

| # | Baustein | Was das Kind sieht | Technik |
|---|---|---|---|
| 4 | **Maskottchen** | Eine Figur (Vorschlag: „Klecks“, ein Tintenklecks mit Füller) begrüßt, lobt, macht bei 3 Fehlern Mut, erinnert an Berichtigung oder den Test im Lernplan. Ein Satz, nie mehr. | SVG im Heft-Stil, wenige Posen (freut sich, denkt nach, winkt). Feste, geprüfte Sätze – keine KI-Texte an Kinder. |
| 5 | **Reise durchs Schuljahr** | Pro Fach eine Heftseite mit Stationen = Themen des Schuljahres in Lehrplan-Reihenfolge. Station geschafft nach z. B. 10 richtigen Aufgaben im Thema; Stern-Bonus und Sticker. | Themenlisten je Fach und Klasse (Start: Mathe Kl. 1–7), geprüft gegen Lehrpläne mit Quellen wie beim Ratgeber. `ai-question-generator` bekommt das Thema (gibt es schon für Lernpläne). Größter Aufwand. |

## Stufe 3 – Eltern einbinden

| # | Baustein | Was passiert |
|---|---|---|
| 6 | **Wochenziel** | „4 Lerntage diese Woche“ neben der Pflanze. Verzeiht einzelne Pausentage. |
| 7 | **Eltern-Bonus für Stationen** | Eltern sehen die Reise und legen fest, ob eine geschaffte Station Extra-Minuten bringt (z. B. 10). Verbindet Spielwelt und Bildschirmzeit – die Eltern entscheiden. |

## Bewusst nicht

Ranglisten, Kauf von Sternen, Zufallskisten, Countdown-Druck, Werbung, Pushes an Kinder außer den
bestehenden Hinweisen.

## Messung

Vorher/nachher: aktive Kinder pro Woche und Lerntage pro aktivem Kind (heute 4 aktive in
14 Tagen, Ø 2,8 Tage). Ziel nach Stufe 1: mehr Lerntage je aktivem Kind; nach Stufe 2: mehr
Kinder, die nach 14 Tagen noch lernen.

## Auslieferung

Alles liegt im Web-Teil plus Datenbank – erreicht die Apps erst mit einem App-Build (Sammelliste
in `docs/release-2.0.md`). Stufe 1 kann zusammen mit 2.0.2 kommen.

## Offen (Betreiber)

- Name und Aussehen des Maskottchens.
- „Sterne“ oder „Münzen“ (Vorschlag: Sterne – passt zu Schulheft und den Sticker-Sternen).
- Welches Fach zuerst für die Reise (Vorschlag: Mathe, weil Aufgaben dort am verlässlichsten sind).

# Plan: LernZeit für Kinder spannender machen (11.10.2026)

**Umgesetzt am 11.10.2026** (Web und Datenbank; in den Apps mit dem nächsten Build 2.0.2):
Klecksi, Tinte, Heftrand-Reise auf dem Kind-Start, Berichtigung, Federmäppchen (Figuren),
Urkunden, Wochenziel, Eltern-Bonus je Seite. Datenbank:
`supabase/migrations/20261011200000_klecksi_reise.sql` (per SQL mit Rollback getestet),
Regeln: `src/lib/reise.ts`, Test: `npm run test:reise`.
Noch offen: Heft-Farben, Sticker-Pakete und Rahmen gegen Tinte; Tinte für die Tagesaufgabe;
Nacht-Erfolge in der Datenbank löschen (`20261011201000_nacht_erfolge_entfernen.sql`, von Hand
im SQL-Editor; die App vergibt und zeigt sie schon nicht mehr).

Anstoß: Rechen-Inseln (Maskottchen, Münzen und Avatare, Fehlerkiste, Reise durchs Schuljahr).
Die Seite war aus der Claude-Umgebung nicht erreichbar; der Plan beruht auf der Beschreibung
des Betreibers.

## Thema (11.10.2026): Klecks und eine Reise für alle Fächer

Klecks, ein Tintenklecks (Königsblau, echte Klecks-Form mit Spritzern und Tropfen), begleitet
das Kind. Es gibt **eine** Reise für alle Fächer, direkt auf dem Kind-Start – keine Reise je Fach
und Klasse. Grund: Themenlisten für jedes Fach und jede Klasse müssten gegen 16 Lehrpläne geprüft
werden, und das Kind stünde in jedem Fach an einer anderen Stelle. Die Inhalte steuern weiter
Lernpläne und Schwerpunkte der Eltern.

| Baustein | Name |
|---|---|
| Maskottchen | **Klecksi** (Version „Tropfen“, entschieden 11.10.2026): runder Klecks in Königsblau mit weichen Ausbuchtungen und Spritzern; atmet, blinzelt, wackelt. Arme wachsen nur für Gesten heraus: einmal grüßen (erstes Öffnen am Tag, Antippen), jubeln (5/5, Feld, Seite, Urkunde), Mut machen (nach Fehlern). Dazu „denkt nach“. |
| Spielgeld | **Tintentropfen** |
| Reise | **Kleckis Heftrand-Reise** (entschieden 11.10.2026): Seiten mit je 12 Feldern. Jede geschaffte Runde in einem beliebigen Fach malt ein Feld in der Heftfarbe dieses Fachs aus. |
| Doppelt weit | Runden im **Lernplan** oder in einem **Schwerpunkt-Fach** der Eltern (`is_priority`) zählen zwei Felder (Stern am Feld). |
| Alle Fächer | **Bunte Seite**: 3 verschiedene Fächer auf einer Seite (oder alle sichtbaren, wenn es weniger sind) → +20 Tinte am Seitenende. Hinweis statt Pflicht. |
| Seitenende | +30 Tinte und ein Sammelstück; Eltern können Extra-Minuten festlegen (Stufe 3). |
| Fehlerkiste | **Berichtigung**: Kleckse wegwischen, zählt ein Feld |
| Sammlung | **Federmäppchen**: Figuren (Avatare) gegen Tinte |
| Erfolge | **Urkunden**: die bestehenden Erfolge mit Bonus-Minuten und Langfristzielen |

Stil (Entwurf: Artefakt „Klecks und die Heftrand-Reise“):
- Felder sind Heftrand-Kritzel (Kästchen, Würfel, Stern …) auf
  einem Pfad von unten nach oben; Klecks steht auf dem nächsten Feld, hinter ihm eine
  Tintenspur. Am Seitenende faltet Klecks etwas aus Papier (Flieger, Frosch, Himmel & Hölle,
  Schiff …) für das Regal.
- Verworfen: „Der magische Comic“ (jede Seite eine Folge, Bild von Bleistift zu Farbe).

„Geschafft“ heißt: Runde beendet mit mindestens 3 von 5 richtig (Vorschlag). Nichts geht verloren,
Pausen kosten nichts.

Nicht übernommen: „Weg zur 1“ (Notenversprechen), zusätzliches Level/XP, eigene Abzeichen
(die bestehenden Erfolge bleiben, Wunsch des Betreibers). Erfolge „Mitternachts-Gelehrter“
(Lernen 0–4 Uhr) und „Nachteule“ (nach 21 bzw. vor 6 Uhr) entfernen: Keine Belohnung für
Handynutzung spät abends oder früh morgens. „Zeitreisender“ (verschiedene Uhrzeiten) bleibt.

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
2. **Tinte ist Spielgeld, keine Zeit.** Eine zweite Währung nur für die Spielwelt (Avatare,
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
| 5 | **Reise auf dem Kind-Start** | Eine Reise für alle Fächer (siehe Thema). Felder in Heftfarben, Lernplan und Schwerpunkt doppelt, bunte Seite als Bonus. | Tabelle `kind_reise` (Felder mit Fach, Quelle, Runde). Vergabe serverseitig beim Rundenabschluss wie die Tinte. Keine Themenlisten nötig. |

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

## Nachträge (11.10.2026)

- Faltanleitungen: Jede der 8 Faltfiguren lässt sich Schritt für Schritt nachfalten (Animation).
- Weihnachtszeit 1.12.–6.1.: Mütze, Schnee, Weihnachts-Sticker und -Figuren, Adventskalender
  (5 Aufgaben aus allen Fächern, ab 4 richtig ein Sticker, sonst keine Belohnung).
  Der App-Build mit diesen Teilen muss vor dem 1. Dezember in den Stores sein.

## Offen (Betreiber)

- Name: „Karl Klecks“ (pme Lernwelten) ist ein ähnliches Maskottchen – Namen vor dem Start prüfen
  (DPMA), „Klecksi“ ist eigenständiger als „Klecks“.
- Ab wann eine Runde „geschafft“ ist: umgesetzt mit 60 % (3 von 5). Bei Bedarf in `runde_belohnen` ändern.

# Wiederholungen bei Mathe-Fragen: Ausgangswert und Nachprüfung

Anlass (21.11.2026): Klara (Klasse 7, `5a2c5877…`) spielt fast nur Mathe, 10–33 Runden am Tag (50–165 Aufgaben). Der Betreiber
hatte den Eindruck, die Fragen wiederholen sich. Die Schwierigkeit passt (rund 70 % richtig) und bleibt, wie sie ist.

Änderungen (Commit 42b635b, Edge Functions am 21.11.2026 eingespielt, App-Teil erst mit dem nächsten Build):
- Grundlagen nach der Klasse des Kindes statt der Stoff-Klasse; Anteil Klasse 5–6: 25 %, Klasse 7: 15 %.
- Grundlagen-Muster, die das Kind zuletzt hatte (Signatur ohne Zahlen), werden übersprungen.
- Der Prompt nennt die jüngsten 8 statt der ältesten 8 gestellten Fragen.
- App: merkt sich 300 statt 100 Fragen je Klasse/Fach, schickt die letzten 150 (Klaras iPhone: Stand 20261022, also erst
  nach dem nächsten iOS-Build).

## Ausgangswert (vor der Änderung)

Gemessen in den Funktionsprotokollen (`function_logs`), alle Kinder, Mathe-Anfragen überwiegend von Klara (einziges Kind der
Klasse 7 mit Mathe).

| Kennzahl | Zeitraum | Wert |
|---|---|---|
| Vorrats-Fragen (`CACHE-FIRST hit … serving <id>`), die in derselben Woche erneut kamen | 14.–20.11.2026, je Tag abgefragt | 59 von 583 Auslieferungen (10,1 %), 58 Fragen mehrfach |
| Grundlagen-Aufgaben (`🧮 Grundlagen`) | 20.11.2026 | 42 Aufgaben, 18 verschiedene Muster (Zahlen → #), 40 verschiedene Texte |
| KI erzeugte eine schon gestellte Frage (`repeated question`) | 20.11.2026 | 3 |
| Ersatz aus dem Vorrat (`Cache fallback: serving`) | 20.11.2026 | 7 |
| Mathe-Anfragen Klasse 7 (`Kategorie: … (math/Klasse 7)`) | 20.11.2026 | 70 |

## Nachprüfung (fällig ab 05.12.2026)

Dieselben Abfragen für die Woche **28.11.–04.12.2026** (je 24 h ein `query_logs`-Aufruf, IDs gekürzt auf 8 Zeichen, Mehrfach-
Auslieferungen über die Woche zählen). Erwartung:
- Grundlagen: deutlich weniger Aufgaben (Anteil 15 % statt ~30 %) und fast keine Muster-Wiederholung am selben Tag.
- Vorrat: Anteil Wiederholungen innerhalb der Woche unter 10 %. Solange Klaras App nur 100 Fragen kennt, kann er kaum
  sinken; dann zuerst klären, ob der iOS-Build mit dem neuen App-Teil bei ihr installiert ist (`profiles.app_stand`).
- Außerdem `game_sessions` für Klara: Richtig-Quote weiter um 70 %, Rundenzahl ähnlich.

# LernZeit-Handysperre – Prüfung vom 10.10.2026

Bis alles fertig und getestet ist, sehen nur freigeschaltete Kinder die Sperre
(Tabelle `handysperre_freigaben`, zurzeit Klara). Alle anderen werden auf Apples
Bildschirmzeit verwiesen.

| # | Befund im Code | Lösung | Aufwand |
|---|---|---|---|
| 1 | Viele Erklärtexte (Einrichtung, Hinweiskarten, Freigabe-Dialog). | Ein Satz pro Karte; Erklärungen nur auf Antippen. Die zwei Karten auf „Heute“ sind gekürzt. | klein |
| 2 | Eine Freigabe öffnet das Handy bis Uhrzeit X (`releaseFor`: jetzt + Minuten). Ob das Kind es nutzt, zählt nicht. | Nach **Nutzung** zählen: Apples `DeviceActivityEvent` mit Schwelle (z. B. 30 Min. Nutzung am Tag). Erreicht das Kind sie, sperrt die Erweiterung wieder – wie Apples App-Limits. Dafür einmal „Alle Apps & Kategorien“ im Apple-Auswahldialog wählen. | mittel |
| 3 | Kein Zeitfenster (Ruhezeit). | Tägliches Zeitfenster (z. B. 21–6 Uhr) mit `DeviceActivitySchedule`: in der Ruhezeit alles gesperrt, auch mit verdienter Zeit. Einstellen bei den Eltern (Regeln); wirkt, sobald LernZeit auf dem Kind-Handy einmal geöffnet war. | mittel |
| 4 | Keine Limits je App. | Je App ein eigenes Limit (Schwelle wie in 2). Auswahl nur auf dem Kind-Handy möglich (Apple-Vorgabe). | groß, optional |
| 5 | „Ausnahmen wählen“ gibt es (Apps bleiben trotz Sperre offen), aber versteckt. Telefon und Einstellungen sperrt Apple laut Doku nie. Auf dem Gerät nicht geprüft. | Ausnahmen sichtbar machen („Immer erlauben“); Telefon/Notruf auf Klaras Handy prüfen. | klein |

## Auf Klaras Handy prüfen (vor dem Umbau)

- [ ] Sperre aktiv: Lässt sich telefonieren (auch Notruf)? Öffnet LernZeit?
- [ ] Ausnahme wählen (z. B. Nachrichten) → bleibt sie offen?
- [ ] 10 Minuten genehmigen, Handy 10 Minuten nicht anfassen → ist die Zeit danach weg? (heute: ja)

## Grenzen (Apple)

- Was gesperrt wird, lässt sich nur auf dem Kind-Handy auswählen.
- Änderungen der Eltern wirken erst, wenn LernZeit auf dem Kind-Handy läuft
  (öffnen oder im Hintergrund aufwachen) – kein Fernzugriff.
- Android: keine Schnittstelle für Dritte, dort bleibt Family Link.

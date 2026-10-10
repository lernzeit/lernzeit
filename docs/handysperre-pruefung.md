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

## Stand 10.10.2026 (abends)

| # | Umgesetzt | Wirkt ab |
|---|---|---|
| Eltern-Hürde | Kinder-Handy fragt, Elternteil tippt auf dem eigenen Handy „Erlauben“ (Push + Karte auf „Heute“, Tabelle `geraet_freigaben`, RPCs `geraet_freigabe_anfragen`/`_beantworten`). Passwort nur noch als Notweg, ohne globales Abmelden. | nächster App-Build |
| 1 | Einrichtungskarte, Probelauf, Freiminuten gekürzt. | nächster App-Build |
| 2 | „Was zählt als Handyzeit?“ (Apple-Auswahl, einmal). Danach zählt freie Zeit nur bei Nutzung (`DeviceActivityEvent`, ab iOS 17.4 ohne frühere Nutzung). Gilt knapp 24 h, dann verfällt der Rest. Ohne Auswahl: weiter nach Uhr. | nächster iOS-Build |
| 3 | Ruhezeit bei den Eltern unter Regeln (`child_settings.ruhezeit_von/_bis`). Das Kinder-Handy übernimmt sie beim Öffnen; Apple sperrt dann täglich, auch ohne LernZeit. | nächster iOS-Build |
| 5 | „Immer erlaubt (N)“ als eigener Knopf. Telefon bleibt offen (auf Klaras Handy geprüft). | nächster App-Build |

Bekannte Grenzen: Apps, die als Handyzeit zählen, zählen auch, wenn sie „Immer erlaubt“
sind – deshalb im Auswahldialog LernZeit und die immer erlaubten Apps abwählen. Ob iOS ein
Zählfenster über Mitternacht annimmt, ist nicht dokumentiert; sonst gilt es bis 23:59.

## Auf Klaras Handy prüfen (nach dem nächsten Build)

- [x] Sperre aktiv: Telefonieren geht, LernZeit öffnet (10.10.2026).
- [ ] „Immer erlaubt“ → Kinder-Handy fragt → auf dem Eltern-Handy kommt Push, „Erlauben“ → Apple-Auswahl öffnet sich.
- [ ] „Was zählt als Handyzeit?“: „Alle Apps & Kategorien“, LernZeit abwählen.
- [ ] 10 Minuten genehmigen, Handy 15 Minuten liegen lassen → Zeit ist noch da („noch 10 Min.“).
- [ ] 10 Minuten nutzen → Sperre kommt wieder.
- [ ] Ruhezeit in den Regeln setzen (z. B. in 5 Minuten), LernZeit auf Klaras Handy öffnen → Sperre kommt zur Uhrzeit, Telefon bleibt offen, endet zur Endzeit.

## Grenzen (Apple)

- Was gesperrt wird, lässt sich nur auf dem Kind-Handy auswählen.
- Änderungen der Eltern wirken erst, wenn LernZeit auf dem Kind-Handy läuft
  (öffnen oder im Hintergrund aufwachen) – kein Fernzugriff.
- Android: keine Schnittstelle für Dritte, dort bleibt Family Link.

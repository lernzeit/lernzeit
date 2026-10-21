# LernZeit-Handysperre – Prüfung vom 10.10.2026, Umbau 17.10.2026

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
sind (vom Betreiber am 17.10.2026 so akzeptiert); LernZeit im Auswahldialog abwählen.
Die Frage nach einem Zählfenster über Mitternacht ist seit dem Tagesbudget (Fenster 0–24 Uhr,
täglich) erledigt. Offen bleibt nur Punkt 4 (Limits je App, optional).

## Stand 17.10.2026: Tagesbudget wie Apple (`docs/handysperre-konzept-2026-10-17.md`)

| Baustein | Umgesetzt |
|---|---|
| Freiminuten ohne Knopf | Täglich wiederkehrendes Zählfenster `lernzeit.tag` (0:00–23:59:59 Ortszeit). Schwelle = Freiminuten (Werktag/Wochenende) + heute genehmigt + Extra der Eltern. Bis dahin offen, dann zu. Ab iOS 17.4 zählt die Nutzung seit 0 Uhr (`includesPastActivity: true`), neue Minuten heben nur die Schwelle. „Freiminuten starten“ und `claim_base_time` entfallen (bleibt für alte App-Versionen). |
| Zählen immer nach Nutzung | „Was zählt als Handyzeit?“ ist Pflichtschritt der Einrichtung. Ohne Auswahl zählt nichts; Karte und Einrichtung sagen das. Kein Zählen nach Uhr, kein Probelauf mehr. |
| Eltern-Einstellungen | Kinder → Regeln: Freiminuten werktags/am Wochenende (`child_settings.freiminuten_wochenende`), Ruhezeit, „+15/+30 Min.“, „Heute ohne Limit“ (`extrazeit_geben` → `handyzeit_extra`, Push an das Kind), Stand „noch 25 Min. (35 von 60)“ (`handyzeit_stand`, vom Kinder-Handy gemeldet). |
| Elterncode | 6 Ziffern, wechselt alle 30 Min., gilt mind. 30 Min. (HOTP/SHA-256, `notfallcode_anzeigen`, `src/lib/notfallcode.ts`). Kinder-Handy prüft ohne Internet; 5 Fehlversuche = 15 Min. Pause. Öffnet 15/30/60 Min. (auch in der Ruhezeit) oder ersetzt „Eltern-Handy fragen“. Jede Nutzung → `notfall_entsperrungen` + Push an die Eltern. Das Passwort entfällt. Schlüssel holt das Kinder-Handy einmal (`notfall_schluessel_holen`), danach nur nach „Erlauben“ auf dem Eltern-Handy. |
| Tag in Ortszeit | App (`lib/handyzeit.ts`) und Swift (`heuteText`) rechnen 'YYYY-MM-DD' in Ortszeit. |

Nicht kompiliert geprüft: Der Swift-Teil ließ sich hier nur auf Syntax prüfen (kein Xcode).
Erst der Codemagic-Build zeigt Typfehler.

## Auf Klaras Handy prüfen (Build ab 17.10.2026)

- [ ] Nach dem Update LernZeit öffnen: Karte „Deine Handyzeit heute“ zeigt „noch X Min.“ ohne Knopf, Handy ist offen.
- [ ] Fehlt „Was zählt als Handyzeit?“: Karte sagt es; Einstellungen → Bildschirmzeit → „Handy sperren“ → wählen („Alle Apps & Kategorien“, LernZeit abwählen).
- [ ] Freiminuten auf 10 stellen, LernZeit auf Klaras Handy öffnen, 10 Min. eine andere App nutzen → Sperre kommt.
- [ ] Handy 15 Min. liegen lassen → Stand ändert sich nicht.
- [ ] Danach auf dem Eltern-Handy „+15 Min.“ → Klara bekommt Push, öffnet LernZeit → Handy wieder offen, Schwelle 25.
- [ ] Elterncode: auf dem Eltern-Handy „Elterncode zeigen“, auf Klaras Handy im Flugmodus eingeben → 15 Min. offen, auch in der Ruhezeit. Eltern bekommen Push.
- [ ] Nach Mitternacht (oder am nächsten Morgen): Handy offen, Stand 0, Wochenend-Wert am Samstag.
- [ ] iOS-Version von Klaras Handy notieren (vor 17.4 zählt ein neu angemeldetes Fenster ab dann, mit Abzug des schon Gezählten).

- [ ] Eltern-Handy: Unter Kinder → Regeln steht vor der Einrichtung nur „Auf dem iPhone von Klara … einrichten“
      (nur bei iPhone-Kindern, bei Android nichts); nach
      dem ersten Öffnen von LernZeit auf Klaras Handy (Sperre läuft) erscheinen Freiminuten und Handysperre.

## „Eltern fragen“ direkt vom Sperrbildschirm (Build nach dem 20.10.2026)

- [ ] Auf Klaras Handy eine gesperrte App öffnen, „Eltern fragen“ tippen: Sperrbildschirm bleibt und zeigt
      „Anfrage ist raus“; auf dem Eltern-Handy kommt „Klara möchte mehr Handyzeit“, ohne dass Klara LernZeit öffnet.
- [ ] Im Flugmodus: Sperrbildschirm zeigt „Gemerkt“; nach dem Öffnen von LernZeit (mit Netz) kommt die Mitteilung.
- [ ] Zeigt er „Gemerkt“ auch mit Netz, lässt Apple der Erweiterung keinen Netzzugriff — dann bleibt der Weg über LernZeit.

## Für alle freischalten (nach bestandenem Test, ohne neuen Build)

1. Warten, bis die App-Version mit Tagesbudget im App Store ist und die meisten sie haben.
2. Kinder in `handysperre_freigaben` eintragen; für neue Kinder ein Trigger (Claude bitten).
3. Eltern von iPhone-Kindern sehen danach eine Zeile unter Regeln, bis die Sperre auf dem iPhone läuft;
   bei Android oder unbekanntem Gerät erscheint nichts.

## Auf Klaras Handy prüfen (Build vom 10.10.2026)

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

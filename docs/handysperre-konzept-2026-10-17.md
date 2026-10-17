# LernZeit-Handysperre: Prüfung und Umbau-Vorschlag (17.10.2026)

Ziel des Betreibers: Die Sperre als einfache Alternative zu Apples Bildschirmzeit anbieten.
Gezählt wird nur die aktive Nutzung (App im Vordergrund); sie geht von den täglichen
Freiminuten ab, verdiente LernZeit-Zeit kommt dazu; „immer erlaubte“ Apps zählen nicht.
Einstellungen beim Elternteil, Notentsperrung auf dem Kinder-Handy.

## 1. Stand heute (Code in `native/screen-time/`, `src/services/screenTime/`)

| Baustein | Wie es heute läuft | Bewertung |
|---|---|---|
| Sperren | `ManagedSettings`: alles gesperrt außer „Immer erlaubt“ (`shieldAll`, `.all(except:)`). Telefon/Einstellungen sperrt Apple nie, LernZeit bleibt offen (auf Klaras Handy am 10.10. geprüft). | gut |
| Freiminuten | Täglich `screen_time_base_minutes`, aber erst, wenn das Kind „Freiminuten starten“ tippt (`claim_base_time`). Tag beginnt um 0 Uhr **UTC** (= 2 Uhr deutscher Zeit). | Anforderung nicht erfüllt: Freiminuten sollten ohne Knopf da sein |
| Zählen nach Nutzung | Nur, wenn ein Elternteil einmal „Was zählt als Handyzeit?“ gewählt hat (`zaehlAuswahl`). Dann misst Apple die Vordergrund-Nutzung dieser Auswahl (`DeviceActivityEvent`, Schwelle = freie Minuten, ab iOS 17.4 nur Nutzung ab jetzt). Ohne Auswahl läuft die Zeit nach Uhr ab – auch wenn das Handy in der Tasche liegt. | richtiges Prinzip, aber nur optional |
| Verdiente Zeit | Nach Genehmigung beim nächsten Öffnen von LernZeit eingelöst (`claim_approved_time`), läuft auf die laufende Zählung obendrauf. | gut |
| „Immer erlaubt“ wird nicht gezählt | Nur, wenn die Eltern im Zähl-Dialog genau diese Apps weglassen. Wählen sie „Alle Apps & Kategorien“, zählen auch die immer erlaubten mit. | **Grenze von Apple**, siehe 3 |
| Ruhezeit | Täglich wiederkehrend, wirkt ohne LernZeit (`setzeRuhezeit`). Einstellbar beim Elternteil. | gut |
| Eltern-Hürde | Ändern (Ausnahmen, Zählen, Aufheben) nur nach „Erlauben“ auf dem Eltern-Handy oder mit E-Mail + LernZeit-Passwort. | Passwort-Weg lückenhaft, siehe 4 |
| Stand auf dem Gerät | Klara: `screen_time_managed = false`, letzte Freigabe 08.10. Ihre Store-App ist älter als 10.10.: Zählen nach Nutzung, Ruhezeit und Eltern-Handy-Hürde liefen **noch nie auf einem echten Gerät**. | offen |

## 2. Antwort: Einstellungen beim Elternteil?

| Einstellung | Vom Eltern-Handy aus? |
|---|---|
| Freiminuten pro Tag (heute schon), getrennt Werktag/Wochenende | **ja** (Zahl auf dem Server, Kinder-Handy übernimmt sie) |
| Ruhezeit | **ja** (heute schon) |
| Sperre pausieren, Extra-Zeit „jetzt 15 Min. frei“ | **ja**, wäre neu (wie eine genehmigte Anfrage) |
| Welche Apps immer erlaubt sind, was als Handyzeit zählt | **nein**: Apples Auswahldialog liefert Kennungen, die nur auf dem Gerät gelten, auf dem gewählt wurde. Die Auswahl findet auf dem Kinder-Handy statt, freigegeben vom Eltern-Handy (gibt es schon). |
| Sperre ganz aus | **ja** als Auftrag; wirksam, sobald LernZeit auf dem Kinder-Handy läuft |

Alles, was auf dem Kinder-Handy wirken soll, greift erst, wenn LernZeit dort einmal läuft
(Öffnen oder Push). Apple kennt keinen Fernzugriff auf die Sperre.

## 3. Was Apple nicht kann (ehrlich sagen)

- **„Alles außer“ beim Zählen gibt es nicht.** Sperren kann „alles außer diesen Apps“,
  Zählen nur „diese Apps/Kategorien“. Liegt eine immer erlaubte App in einer gezählten
  Kategorie (z. B. Schul-App in „Bildung“), zählt sie mit. Lösung im Dialog: Kategorien
  wählen, in denen keine immer erlaubte App liegt, und die Tipps dazu anzeigen.
- **Familienfreigabe bleibt Pflicht.** Die Sperre mit Elternschutz (`.child`) geht nur auf
  einem Kinder-iPhone in Apples Familienfreigabe; das muss das Elternteil einmal einrichten.
  Es entfällt aber alles Weitere in Apples Bildschirmzeit (Limits, Auszeiten, Code-Pflege).
- **Nur iPhone/iPad.** Auf Android gibt es keine Schnittstelle für Dritte; dort bleibt Family Link.
- **Geräte-Uhr:** Wann eine Freigabe endet, entscheidet das Gerät (bekannte Grenze, wie bei Apple).

## 4. Notentsperrung und Passwort

**Antwort auf die Frage:** Das LernZeit-Passwort funktioniert **nicht** bei Anmeldung mit
Apple oder Google: Diese Konten haben kein LernZeit-Passwort. Bei „E-Mail verbergen“ (Apple)
kennt das Elternteil nicht einmal seine LernZeit-E-Mail (eine `@privaterelay.appleid.com`-
Adresse). Der Passwort-Weg hilft also nur Eltern mit E-Mail-Konto. Der Weg „Eltern-Handy
fragen“ braucht Internet auf beiden Geräten und das Eltern-Handy in Reichweite.

**Vorschlag:** ein **Eltern-Notfallcode**, unabhängig von der Anmeldeart:

- In der Eltern-App steht unter dem Kind „Notfallcode“: sechs Ziffern, die alle 30 Sekunden
  wechseln (Verfahren wie bei Zwei-Faktor-Apps, TOTP). Das Elternteil liest ihn vor, auch am
  Telefon aus der Ferne.
- Das Kinder-Handy prüft ihn **ohne Internet** (gemeinsamer Schlüssel, einmal beim
  Einrichten der Sperre in der App Group gespeichert). Nach 5 falschen Versuchen 15 Minuten
  Pause.
- Der Code öffnet nur: Sperre für 15/30/60 Minuten aussetzen oder Einstellungen ändern;
  jede Notentsperrung landet als Hinweis beim Elternteil.
- Letzter Weg wie heute: Apple selbst (Einstellungen → Bildschirmzeit, mit der Apple-ID des
  Elternteils kann LernZeit der Zugriff entzogen werden).
- Das Passwort entfällt dann als Notweg.

## 5. Umbau-Vorschlag „Tagesbudget wie Apple“

1. **Freiminuten ohne Knopf:** Täglich wiederkehrendes Zählfenster (0–24 Uhr, Ortszeit),
   Schwelle = Freiminuten des Tages + heute verdiente Minuten, Nutzung ab Tagesbeginn.
   Bis zur Schwelle ist alles offen, danach greift die Sperre (wie Apples App-Limits).
   Neue verdiente Minuten erhöhen die Schwelle. Kein „Freiminuten starten“, kein Zählen
   nach Uhr mehr.
2. **Zählen immer nach Nutzung:** „Was zählt als Handyzeit?“ wird Teil der Einrichtung
   (Pflichtschritt mit Empfehlung), statt optional.
3. **Eltern-Einstellungen:** Freiminuten Werktag/Wochenende, Ruhezeit, „Heute X Min.
   extra“, Pause bis morgen; Stand der Nutzung („heute 34 von 60 Min.“) beim Elternteil.
4. **Notfallcode** wie in 4.
5. **Tag in Ortszeit** statt UTC (`claim_base_time` entfällt mit 1.).

Aufwand: Swift-Teil neu (Zählfenster, Notfallcode), Datenbankfelder, Eltern- und
Kinderoberfläche. Prüfung nur auf einem echten Gerät mit einem neuen iOS-Build (Klaras
Handy), Checkliste in `docs/handysperre-pruefung.md`.

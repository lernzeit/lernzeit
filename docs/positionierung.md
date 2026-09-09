# Positionierung

**Zweck.** Dieses Dokument legt fest, *was* LernZeit verspricht, *wem*, und
*mit welchen Worten*. Jede Anzeige, jeder Landingpage-Text und jeder
Store-Text wird gegen dieses Dokument geprüft — und dieses Dokument wird
gegen `docs/faktenpruefung.md` geprüft.

**Die Kette ist einseitig gerichtet:**

```
Code und Datenbank  ->  faktenpruefung.md  ->  positionierung.md  ->  Anzeige
```

Nichts läuft rückwärts. Ein Satz, der in einer Anzeige gut klingt, darf nicht
nachträglich in die Positionierung geschrieben werden, damit er zulässig wird.
Wenn der Satz stimmen soll, muss zuerst das Produkt ihn wahr machen.

**Stand:** 09.09.2026.

---

## 0. Was dieses Dokument nicht ist — und warum das wichtig ist

**Es gibt bisher keine Marktdaten.** Für LernZeit wurde noch nie geworben. Die
Konten und Lernsitzungen in der Datenbank stammen überwiegend vom Betreiber
selbst und von internen Testern.

Daraus folgt eine Regel, die für dieses Dokument und für alle späteren
Auswertungen gilt:

> **Die vorhandenen Nutzungszahlen sind kein Argument — weder für das Produkt
> noch gegen es.** Sie sind kein Marktsignal, kein Beleg für Nachfrage und
> kein Beleg für fehlende Nachfrage. Sie tauchen in keiner Anzeige auf und
> dienen nicht als Vergleichsmaßstab.

Das betrifft ausdrücklich auch eine Zahl, die in einer früheren Fassung dieses
Dokuments als „die härteste Zahl im Projekt" stand: abgelaufene Testphasen
gegenüber einem zahlenden Abo. Diese Gegenüberstellung war eine Fehldeutung.
Interne Tester schließen kein Abo ab, weil sie es nicht brauchen — nicht, weil
das Angebot sie nicht überzeugt. Die Zahl beweist nichts und ist entfernt.

**Was in diesem Dokument steht, sind zwei verschiedene Dinge**, und sie sind
durchgehend getrennt gehalten:

| | |
|---|---|
| **Belegt** | Eigenschaften des Produkts, im Code oder in der Datenbank nachgesehen. Diese dürfen in eine Anzeige. |
| **Annahme** | Vermutungen über Menschen und Märkte. Diese dürfen die Kampagne *steuern*, aber niemals als Tatsache behauptet werden. |

Die Personas in Abschnitt 4 sind ausdrücklich Annahmen. Die erste Kampagne ist
der erste echte Test.

---

## 1. Was LernZeit ist — in einem Satz

> LernZeit ist eine App, mit der Kinder sich Bildschirmzeit durch das Lösen
> von Schulaufgaben verdienen. Die Eltern legen fest, wie viel Zeit eine
> richtige Antwort wert ist.

Belegt durch `child_settings.*_seconds_per_task` (Standard 30, je Fach
änderbar) und die Zeitgutschrift in `game_sessions.time_earned`
(Faktenprüfung 3).

Was in diesem Satz **nicht** steht, steht dort mit Absicht nicht: dass die
Zeit automatisch freigeschaltet wird. Siehe Abschnitt 6.

---

## 2. Die Kategorie, in der wir antreten

LernZeit ist **keine** Lern-App und **keine** Bildschirmzeit-App. Es ist eine
dritte Sache, und genau darin liegt die Positionierung.

- Eine Lern-App (Anton, Simpleclub, Duolingo) muss das Kind selbst
  motivieren. Ihr Problem ist, dass das Kind sie freiwillig öffnen soll.
- Eine Bildschirmzeit-App (Family Link, Apple Bildschirmzeit) nimmt Zeit weg.
  Ihr Problem ist, dass sie das Kind zum Gegner der Eltern macht.

LernZeit verbindet beides: Die Zeit, um die ohnehin verhandelt wird, wird zur
Währung des Lernens. Der Streit „Handy weg" wird ersetzt durch eine Regel,
die das Kind selbst bedienen kann.

**Der Satz, der die Kategorie trägt:**

> Nicht Bildschirmzeit wegnehmen. Bildschirmzeit verdienen lassen.

*Einordnung: Das ist eine Annahme über den Markt, keine belegte Aussage über
Wettbewerber.* Deshalb keine Superlative — siehe Abschnitt 6.

---

## 3. Wofür Eltern bezahlen sollen

Kostenlos ist bereits: Aufgaben lösen, Zeit verdienen, alle Fächer der
Klassenstufe, beliebig viele Kinderprofile (Faktenprüfung 8).

Bezahlt wird für drei Funktionen (Faktenprüfung 9):

| Funktion | Fundstelle |
|---|---|
| KI-Lernplan für eine anstehende Klassenarbeit | `LearningPlanGenerator.tsx:81` |
| Eigene Tagesobergrenze pro Kind | `ChildSettingsEditor.tsx:396` |
| Erweiterte Lernanalyse | `ChildLearningAnalysis.tsx` |

**Eine Vorsichtsmaßnahme, kein Befund:** Der KI-Lernplan ist die auffälligste
dieser drei Zusagen und zugleich die am wenigsten erprobte — er ist bisher
kaum durchgespielt worden. Bevor er zum Hauptargument einer Anzeige wird,
gehört er selbst mehrfach ausprobiert. In einer Aufzählung darf er stehen.

---

## 4. Personas — Annahmen, keine Befunde

Es gibt keine Nutzerforschung und keine Marktdaten (Abschnitt 0). Die
folgenden drei Personas sind **Hypothesen**, abgeleitet aus dem, was das
Produkt kann und für wen es sinnvoll ist. Sie steuern, welche Suchbegriffe
und welche Texte getestet werden. Sie sind kein Wissen.

Die erste Kampagne prüft sie. Welche Persona tatsächlich klickt, sich anmeldet
und bleibt, ist eine offene Frage — und die zweitwichtigste, die das erste
Budget beantwortet.

### Persona A — „Der Aushandler" (Kind etwa 11 bis 14)

**Annahme.** Elternteil eines Kindes mit eigenem Smartphone. Die tägliche
Diskussion über Bildschirmzeit ist Alltag. Family Link oder Apple
Bildschirmzeit ist eingerichtet, funktioniert technisch, wird aber als
Machtmittel erlebt — vom Kind wie von den Eltern.

**Vermuteter Auslöser.** Nicht „mein Kind lernt zu wenig", sondern „ich will
nicht jeden Abend streiten".

**Was diese Person hier fände.** Eine Regel statt einer Verhandlung. Das Kind
kann sich Zeit selbst erarbeiten, die Eltern müssen nicht Nein sagen.

**Warum diese Persona zuerst getestet wird.** Sie setzt ein eigenes Gerät des
Kindes voraus — ohne das ergibt die App weniger Sinn, was die Landingpage in
`SetupSteps.tsx:68` selbst schreibt. Und ihr vermuteter Schmerz ist akut genug
für einen Klick.

**Einwand, den diese Person zuerst hätte.** „Und wer schaltet die Zeit dann
frei?" Antwort in Abschnitt 6; sie muss spätestens auf der Landingpage kommen.

### Persona B — „Der Vorsorger" (Grundschulkind)

**Annahme.** Elternteil eines Grundschulkindes. Meist noch kein eigenes Gerät
des Kindes, sondern Tablet oder Eltern-Handy zur Mitbenutzung. Bildschirmzeit
ist noch kein Streit, sondern eine Sorge.

**Vermuteter Auslöser.** „Ich will es von Anfang an richtig machen."

**Was diese Person hier fände.** Kurze Aufgaben mit sofortiger, sichtbarer
Belohnung — eine Runde umfasst fünf Aufgaben.

**Einschränkung.** Ohne eigenes Gerät greift die Belohnung schwächer, und der
Nutzen ist mittelbarer.

### Persona C — „Der Fachhelfer"

**Annahme.** Elternteil, das ein konkretes Fachproblem lösen will („Mathe
läuft gerade schlecht"). Diese Person sucht zunächst eine Lern-App.

**Was diese Person hier fände.** Regelmäßiges Üben, das nicht jeden Tag neu
verhandelt werden muss — plus, mit Premium, einen Lernplan für die nächste
Klassenarbeit.

**Was ehrlich dazugehört.** LernZeit hat keine Erklärvideos und keinen
geführten Lernpfad. Gegen eine reine Lern-App verliert es in diesem Vergleich.
Der Anzeigentext für diese Persona sollte deshalb nicht „besser in Mathe"
versprechen, sondern **regelmäßiges Üben** — das ist die Stärke und sie ist
belegbar.

**Warum diese Persona mitgetestet wird.** Ihre Suchbegriffe sind völlig andere
(„mathe üben klasse 5" statt „bildschirmzeit regeln"), und sie sind
wahrscheinlich günstiger, weil weniger umkämpft als der Streit-Winkel. Ob sie
auch besser umwandeln, ist offen — genau das misst Abschnitt 13.

### Reihenfolge

Bei 250 € im Monat werden nicht drei Personas gleichzeitig beworben, weil dann
keine genug Daten für eine Aussage sammelt. **A und C zuerst**, weil ihre
Suchbegriffe sich nicht überschneiden und sich damit sauber vergleichen
lassen. **B danach**, weil dort das eigene Gerät fehlt und der Nutzen am
schwersten zu erklären ist.

---

## 5. Die Nutzenversprechen, die geführt werden dürfen

Jede Zeile hier ist in `docs/faktenpruefung.md` als **bestätigt** vermerkt oder
im Code nachgesehen. Andere Versprechen gibt es nicht.

| # | Versprechen | Belegt durch |
|---|---|---|
| V1 | Kinder verdienen Bildschirmzeit durch richtige Antworten | Faktenprüfung 3 |
| V2 | Standard 30 Sekunden je richtiger Aufgabe, von Eltern je Fach änderbar | Faktenprüfung 3 |
| V3 | 4 Wochen kostenlos testen, keine Zahlungsdaten nötig | Faktenprüfung 1 |
| V4 | 2,99 € im Monat oder 29,99 € im Jahr | Faktenprüfung 5 |
| V5 | Beliebig viele Kinderprofile | Faktenprüfung 8 |
| V6 | Alle Fächer der jeweiligen Klassenstufe, Klasse 1 bis 10 | Faktenprüfung 8 |
| V7 | Daten liegen auf Servern in der EU (Frankfurt) | Faktenprüfung 11 |
| V8 | Verknüpfung von Eltern und Kind über einen Einladungscode, 7 Tage gültig, einmalig | Faktenprüfung 2 |
| V9 | Aufgaben passend zur Klassenstufe und zum Schuljahresfortschritt | `_shared/school-year.ts` |

**Zu V3 — Wortlaut ist Pflicht.** Es heißt **„4 Wochen"**, überall gleich. Die
Datenbank vergibt tatsächlich 30 Tage; die gerundete Zahl verspricht also zwei
Tage *weniger*, als geliefert wird. In dieser Richtung ist die Abweichung
unproblematisch, und die Entscheidung dafür ist bewusst gefallen. Entscheidend
ist nur, dass Anzeige und Zielseite dieselbe Zahl nennen — Google gleicht das
ab. Also nirgends „30 Tage" schreiben, auch nicht, weil es großzügiger klingt.

**Zu V6 — Wortlaut ist Pflicht.** Es heißt **„alle Fächer der jeweiligen
Klassenstufe"**, nicht „alle Fächer". Chemie gibt es ab Klasse 7, Physik ab 5,
Englisch ab 3. Ein Drittklässler bekommt vier Fächer, nicht zehn.

**Zu V9 — neu und ohne Wirkungsnachweis.** Der Fragen-Generator zieht früh im
Schuljahr überwiegend Stoff der vorigen Klassenstufe. Die Ursache ist belegt,
die *Wirkung* ist nicht gemessen. Formulierung deshalb beschreibend („passend
zum Schuljahresfortschritt"), niemals wertend („nie zu schwer").

---

## 6. Was wir nicht versprechen

Verbindlich. Ein Text, der gegen eine dieser Zeilen verstößt, wird nicht
veröffentlicht — auch nicht, wenn er besser konvertiert.

1. **Keine automatische Freigabe der verdienten Zeit.** Sie wird heute von
   Hand freigegeben (`screen_time_managed` und `screen_time_auto_release`,
   beide Standard `false` — Faktenprüfung 10). Kein Text darf das Gegenteil
   andeuten, auch nicht durch Auslassung. Die Landingpage sagt es heute schon
   offen (`HonestyBlock.tsx`) — dabei bleibt es.
2. **Keine Tagesobergrenze als Zahl.** Die Standardwerte stimmen — werktags 30
   Minuten, am Wochenende 60, in Testphase und Premium anpassbar
   (Faktenprüfung 4). In eine Anzeige gehören sie trotzdem nicht: In 30 Zeichen
   ohne den Zusatz „Standard, anpassbar" liest sich „höchstens 30 Minuten" wie
   eine Produktgrenze. Beworben wird, **dass** Eltern die Grenze setzen, nicht
   welche.
3. **Keine Superlative.** Kein „die einzige App", „die erste", „die beste".
4. **Keine Lernerfolgs-Behauptungen.** Kein „bessere Noten", „X % mehr
   Lernzeit", „nachweislich wirksam". Es gibt keine Studie und keine Messreihe.
5. **Keine erfundenen Zahlen, Zitate oder Testimonials** — auch nicht als
   Platzhalter in einem Entwurf, der „später ersetzt wird".
6. **Keine Nutzerzahlen und keine Nutzungsstatistiken.** Die vorhandenen Zahlen
   stammen aus internem Test (Abschnitt 0). Sie belegen nichts über den Markt
   und gehören in keine Anzeige — weder als Erfolgs- noch als Größenangabe.
7. **Keine Bewertungen oder Sterne**, solange sie nicht auf der jeweiligen
   Store-Seite selbst nachgesehen wurden.
8. **Der KI-Lernplan nicht als Hauptargument**, siehe Abschnitt 3.
9. **Keine Daten von Kindern an Werbeplattformen.** Siehe Abschnitt 7 — das ist
   keine Textregel, sondern im Code erzwungen.

Fächer dürfen namentlich beworben werden. Welche sich lohnen, entscheidet sich
an den Kosten je Klick, nicht an einer Vorabregel.

---

## 7. Wer angesprochen wird — und was gemessen wird

Hier werden zwei Dinge unterschieden, die oft verwechselt werden.

### 7.1 Ansprache — Kinder dürfen vorkommen

Der übliche Weg in die App ist nicht nur „Elternteil entdeckt App und
installiert sie". Ebenso häufig probiert **das Kind** die App aus und bittet
danach die Eltern um Verknüpfung und Freigabe. Beide Wege sind vorgesehen: Ein
Kinderkonto kann eigenständig bestehen und später verknüpft werden — die
Registrierung sagt das wörtlich („mit den Eltern verbinden geht auch später",
`AuthForm.tsx:842`).

**Für die Texte heißt das:** Eine Anzeige darf das Kind als handelnde Person
zeigen und darf es ansprechen. Der Satz „Probier es aus und zeig es deinen
Eltern" ist zulässig und beschreibt einen echten Weg durch das Produkt.

**Was dabei gilt:** Kein Druck auf das Kind, keine Dringlichkeit, kein
Kaufaufruf an Kinder. Kaufen können ohnehin nur Eltern — Premium ist an das
Elternkonto gebunden, und das steht so auch in der Datenschutzerklärung.

### 7.2 Aussteuerung — nur Erwachsene

Google und Meta beschränken Werbung an Minderjährige von sich aus; personali-
sierte Ausspielung an unter 18-Jährige ist dort nicht vorgesehen. Die Anzeigen
werden also **Erwachsenen** gezeigt, auch wenn der Text ein Kind anspricht.
Zielgruppen aus Kinderdaten werden nicht gebildet.

### 7.3 Messung — Kinder werden nicht getrackt

**Umgesetzt am 09.09.2026 in `src/lib/analytics.ts`.** Kein Ereignis eines
Kindes erreicht eine Werbeplattform:

- `track()` spiegelt Ereignisse nach `window.dataLayer` — der einzige Weg zu
  GA4 und Google Ads. Diese Spiegelung unterbleibt, sobald das Ereignis
  `role: 'child'` trägt **oder** die angemeldete Person ein Kinderprofil hat.
- Ist die Rolle nicht feststellbar, wird gesperrt. Eine verlorene Conversion
  kostet Messgenauigkeit; ein gemeldetes Kind kostet eine Zusage.
- Die Sperre sitzt in `track()`, nicht beim Aufrufer. Wer später ein neues
  Ereignis ergänzt, ist automatisch auf der sicheren Seite.
- Nachprüfbar mit `node scripts/test-analytics-audience.mjs` (acht Fälle).

**Was weiterhin erfasst wird:** Die Tabelle `analytics_events` in Supabase
(EU) bekommt auch Kinder-Ereignisse. Das ist erste Partei — die Daten
verlassen die eigene Infrastruktur nicht und gehen an keine Werbeplattform.
Ohne sie gäbe es keinen eigenen Funnel-Bericht, weil Verknüpfung und erste
Lernsitzung nun einmal auf der Kinderseite stattfinden.

**Zur E-Mail-Adresse der Eltern:** Sie wird an Google und Meta ausschließlich
als SHA-256-Hashwert übermittelt, nie im Klartext.

### 7.4 Land und Sprache

Deutschland, deutschsprachig. Das Produkt bildet deutsche Lehrpläne ab; jede
andere Ausspielung wäre verbranntes Geld.

---

## 8. Tonalität

Die Landingpage hat einen Abschnitt mit der Überschrift **„Was heute noch
nicht geht"**. Das ist keine Schwäche, die man in der Werbung kaschieren
müsste — das ist die Positionierung.

**Wie wir klingen:** ruhig, konkret, elterlich. Wir kennen den Streit um das
Handy, wir dramatisieren ihn nicht.

| nicht so | sondern so |
|---|---|
| „Schluss mit dem Handy-Chaos!" | „Weniger Diskussion um die Bildschirmzeit." |
| „Revolutionäre Lern-KI" | „Aufgaben passend zur Klassenstufe." |
| „Ihr Kind wird besser in Mathe" | „Fünf Aufgaben, und die Zeit ist verdient." |
| „Jetzt gratis sichern!" | „4 Wochen kostenlos testen." |

Keine Angst als Verkaufsargument. Kein Schuldgefühl gegenüber Eltern. Kein
Ausrufezeichen in einer Überschrift.

---

## 9. Kanäle

**Google und Meta sind beide vorgesehen.** Die Datenschutzerklärung wird
deshalb von Anfang an für beide Plattformen gefasst, statt sie später ein
zweites Mal prüfen zu lassen.

**Wo das erste Geld hingeht: Google Suche.** Wer „bildschirmzeit kind regeln"
sucht, hat den Bedarf bereits formuliert. Bei 250 € im Monat ist gesuchte
Nachfrage die Ausspielung mit den meisten verwertbaren Daten je Euro. Meta
zeigt Anzeigen Leuten, die gerade nicht suchen — das braucht mehr Budget,
bevor überhaupt etwas erkennbar wird.

**Empfehlung zur Reihenfolge, nicht zum Ausschluss:** erst Google allein, bis
Abschnitt 13 Zahlen geliefert hat. Meta danach, mit den dann bekannten Kosten
je Anmeldung als Vergleichsmaßstab.

**In keinem Fall:** App-Install-Kampagnen. Sie bräuchten Werbe-SDKs in der
nativen App und würden die Zusagen brechen, die heute halten (Faktenprüfung
12). Der Trichter beginnt auf der Website.

**Ebenfalls nicht:** Display, YouTube, Performance Max — bei diesem Budget
verschleiert Performance Max die Ausspielung, man zahlt und lernt nichts.

---

## 10. Bausteine für Anzeigentexte

**Vorschlag, ausdrücklich noch nicht freigegeben.** Nichts wird geschaltet,
bevor du es Zeile für Zeile abgenommen hast. Google-Grenzen: Überschriften
höchstens 30 Zeichen, Beschreibungen höchstens 90.

### Überschriften (≤ 30 Zeichen)

| Text | Zeichen | für | gedeckt durch |
|---|---|---|---|
| Bildschirmzeit verdienen | 24 | A | V1 |
| Lernen statt Diskutieren | 24 | A | Abschnitt 2 |
| Aufgaben lösen, Zeit sammeln | 28 | A | V1 |
| Mathe üben, Zeit verdienen | 26 | C | V1, V6 |
| Jeden Tag ein paar Aufgaben | 27 | C | V1 |
| 4 Wochen kostenlos testen | 25 | alle | V3 |
| Ohne Zahlungsdaten starten | 26 | alle | V3 |
| 2,99 € im Monat | 15 | alle | V4 |
| Eltern legen die Regeln fest | 28 | A, B | V2 |
| Klasse 1 bis 10 | 15 | alle | V6 |
| Server in Deutschland | 21 | alle | V7 |
| Für jedes Kind ein Profil | 25 | alle | V5 |

### Beschreibungen (≤ 90 Zeichen)

| Text | Zeichen | für |
|---|---|---|
| Dein Kind löst Schulaufgaben und verdient sich Bildschirmzeit. Du legst fest, wie viel. | 87 | A |
| Pro richtiger Antwort gibt es Zeit. Standard sind 30 Sekunden, änderbar für jedes Fach. | 87 | A, B |
| Regelmäßig üben, ohne jeden Tag neu zu diskutieren. Mathe und Deutsch ab Klasse 1. | 82 | C |
| 4 Wochen alle Funktionen kostenlos. Keine Zahlungsdaten nötig. Danach 2,99 € im Monat. | 86 | alle |
| Aufgaben passend zur Klassenstufe, Klasse 1 bis 10. Daten auf Servern in der EU. | 80 | alle |

### Der Satz, der auf die Landingpage gehört, nicht in die Anzeige

> Die verdiente Zeit gibst du heute noch selbst in Family Link
> beziehungsweise in der Bildschirmzeit frei.

Er steht bereits in `HonestyBlock.tsx`. In 90 Zeichen klänge er wie
Kleingedrucktes; auf der Landingpage steht er sichtbar — und muss dort stehen
bleiben, bevor der erste Euro fließt.

---

## 11. Die Landingpage, auf die geführt wird

Ziel ist `/`. Zwei Bedingungen vor der ersten Schaltung:

1. **Die Datenschutzerklärung ist an vier Stellen zu präzisieren**
   (Faktenprüfung 12, Entwurf in `docs/datenschutz-entwurf.md`). Es geht nicht
   um die Werbefreiheit in der App — die bleibt wörtlich stehen und bleibt
   wahr. Betroffen sind der Tracking-Satz, die Cookie-Zusage, die
   Dienstleisterliste und ein fehlendes Wort in der Kinder-Aufzählung.
2. **Ein Einwilligungsbanner muss stehen, bevor der erste Werbe-Tag lädt.**
   Ohne Consent Mode v2 nimmt Google Conversions in der EU ohnehin nicht an.
   Das ist keine Kür, sondern die Voraussetzung dafür, dass die Messung
   überhaupt funktioniert.

---

## 12. Offene Punkte vor der ersten Schaltung

| # | Punkt | Nötiger Schritt | Art |
|---|---|---|---|
| W1 | Datenschutzerklärung deckt seitenübergreifendes Werbe-Tracking nicht ab | Vier Stellen neu fassen, juristisch prüfen lassen. Entwurf in `docs/datenschutz-entwurf.md` | **Blocker** |
| W2 | Kein Einwilligungsbanner vorhanden | CMP einbinden, Consent Mode v2 verdrahten | **Blocker** |
| W3 | Attribution erfasst nur `gclid` | `gbraid`, `wbraid`, `fbclid`, `fbp`, `fbc` ergänzen (`analytics.ts`, `ATTRIBUTION_FIELDS`) | **Blocker** |
| W4 | Keine automatische Löschung der Attributionsdaten | 90 Tage / 13 Monate, wie im Datenschutz-Entwurf zugesagt | **Blocker** |
| W5 | Store-Stände nicht überprüfbar (Netzsperre der Arbeitsumgebung) | Beide Store-Seiten selbst aufrufen | Kontrolle durch dich |
| W6 | Stripe-Beträge nicht gegengelesen | Im Stripe-Konto prüfen, ob 2,99 € und 29,99 € hinterlegt sind | Kontrolle durch dich |
| W7 | „Höchstens 30 Minuten am Tag" nennt den Wochenend-Standard nicht | Zwei Textstellen ergänzen | optional |

W3 ist neu und leicht zu übersehen: Ohne `gbraid` und `wbraid` fehlt die
Zuordnung für einen Teil der Klicks von iOS-Geräten — also genau dort, wo die
Zielgruppe sitzt.

---

## 13. Zielwerte

### 13.1 Der Nullpunkt

**Es hat noch nie eine Kampagne gegeben.** Es gibt keine Kosten je Klick,
keine Kosten je Anmeldung und keine Umwandlungsrate aus Werbung — nicht, weil
sie schlecht wären, sondern weil sie nicht existieren.

Die vorhandenen Konten und Sitzungen stammen aus internem Test (Abschnitt 0)
und zählen **nicht** als Vergleichsmaßstab. Der erste Monat erzeugt den
Maßstab, gegen den ab dem zweiten Monat gemessen wird. Das ist sein Zweck.

### 13.2 Zielwerte des ersten Monats

Budget: 250 €, Beginn deutlich darunter.

| | Kennzahl | Zielwert | Wie gemessen |
|---|---|---|---|
| Z1 | Ausgabe | unter 250 € | Notaus greift bei 250 € |
| Z2 | Klicks | mindestens 300 | Google Ads |
| Z3 | Kosten je Klick | unter 0,80 € | Google Ads |
| Z4 | Neue Elternkonten aus Werbung | mindestens 20 | Attributionstabelle, nicht Google-Schätzung |
| Z5 | davon mit verknüpftem Kind | mindestens 8 | `parent_child_relationships` |
| Z6 | davon mit Lernsitzung in Woche 1 | mindestens 5 | `game_sessions` |
| Z7 | Zahlendes Abo aus Werbung binnen 60 Tagen | mindestens 1 | `subscriptions.status = 'active'` |

Diese Zielwerte sind **gesetzt, nicht abgeleitet** — es gibt nichts, wovon man
sie ableiten könnte. Sie sind absichtlich klein, damit sie bei 250 €
erreichbar bleiben, und bilden trotzdem den vollständigen Trichter ab. Z7
fällt später als der Berichtszeitraum, weil die Testphase vier Wochen läuft;
vor Tag 29 kann es strukturell kein Abo geben.

**Zusätzlich zu messen, ohne Zielwert:** Kosten je Anmeldung getrennt nach
Persona A und Persona C. Welche der beiden günstiger ist, ist die wichtigste
Erkenntnis des ersten Monats — und dafür braucht es keinen Zielwert, sondern
nur zwei getrennte Kampagnen.

### 13.3 Was es bedeutet, wenn ein Zielwert verfehlt wird

Diese Spalte ist der Grund, warum es die Zielwerte gibt. Ohne sie wird jede
Zahl im Nachhinein gedeutet, wie es gerade passt.

| Verfehlt | Wahrscheinliche Ursache | Konsequenz |
|---|---|---|
| **Z2** — zu wenige Klicks | Suchvolumen zu klein oder Gebot zu niedrig | Zuerst das Gebot prüfen. Bleibt es dabei: weitere Suchbegriffe, **kein** höheres Budget. |
| **Z3** — zu teure Klicks | Wettbewerb, oder zu breit ausgesteuert | Auf exakte Suchbegriffe verengen, breite Übereinstimmung abschalten. |
| **Z4** — Klicks, aber keine Anmeldungen | Landingpage, oder Erwartungsbruch zwischen Anzeige und Seite | Anzeigentext gegen Seitentext lesen. **Nicht** das Budget erhöhen — ein undichter Trichter wird durch mehr Zufluss nicht dichter. |
| **Z5** — Anmeldung, aber keine Verknüpfung | Der Einladungscode-Weg ist die Hürde | Produktbefund, kein Werbebefund. Werbung pausieren, bis der Weg leichter ist. |
| **Z6** — Verknüpfung, aber kein Lernen | Kein eigenes Gerät, oder erste Aufgaben zu schwer | Trefferquote der Neuen ansehen. Wirkt die Schuljahres-Anpassung aus V9? |
| **Z7** — keine Umwandlung | Die Premium-Funktionen tragen den Preis nicht — **oder** die Stichprobe ist schlicht zu klein | Bei 20 Anmeldungen ist ein einzelnes Abo statistisch kaum vom Zufall zu trennen. Kein Grund für einen Umbau des Angebots, aber Grund, das Budget nicht zu erhöhen, bevor Z4 bis Z6 stabil sind. |
| **Z1** — Budget überschritten | Notaus oder Tageslimit fehlerhaft | Sofort alles anhalten. Ursache finden, bevor irgendetwas weiterläuft. |

**Der Fall, der ausdrücklich kein Misserfolg ist:** Z2 und Z3 erreicht, Z4 bis
Z7 verfehlt. Dann ist bekannt, was ein Klick kostet und wo der Trichter
undicht ist — zwei Dinge, die vorher niemand wusste. 250 € dafür sind günstig.

### 13.4 Wann abgeschaltet wird

- Ausgabe erreicht 250 € im Kalendermonat → Notaus.
- Kosten je Anmeldung über 25 € nach 100 Klicks → anhalten und prüfen.
- 150 Klicks ohne eine einzige Anmeldung → anhalten. Etwas ist grundlegend
  falsch, und weitere Klicks kosten nur Geld.

---

## 14. Wie dieses Dokument geändert wird

1. Eine neue Behauptung wird **zuerst** in `docs/faktenpruefung.md` geprüft.
2. Erst wenn sie dort **bestätigt** ist, darf sie hier als Versprechen stehen.
3. Ändert sich das Produkt, wird die Faktenprüfung wiederholt — und dieses
   Dokument daran angepasst, nicht umgekehrt.
4. Eine Zahl aus einer Nachricht, einer Erinnerung oder einem älteren Dokument
   wird **nicht** übernommen, ohne sie im Code oder in der Datenbank gesehen zu
   haben. Auch dann nicht, wenn jemand sagt, sie sei bereits korrigiert.
5. Eine Annahme wird erst dann zu einem Beleg, wenn Daten aus einer echten
   Kampagne sie stützen. Interne Nutzung ist keine Kampagne.

Punkt 1 in Abschnitt 6 wird sich ändern, sobald die automatische Freigabe
ausgeliefert ist. Dann wird aus der offenen Einschränkung das stärkste
Argument, das dieses Produkt hat. Bis dahin bleibt sie eine Einschränkung —
offen benannt, nicht versteckt.

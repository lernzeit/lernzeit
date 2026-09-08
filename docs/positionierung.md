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

**Stand:** 08.09.2026. Alle Zahlen in diesem Dokument sind an diesem Tag
entweder im Quelltext oder in der Produktionsdatenbank
(`fsmgynpdfxkaiiuguqyr`) nachgesehen worden. Die jeweilige Fundstelle steht
dabei.

---

## 1. Was LernZeit ist — in einem Satz

> LernZeit ist eine App, mit der Kinder sich Bildschirmzeit durch das Lösen
> von Schulaufgaben verdienen. Die Eltern legen fest, wie viel Zeit eine
> richtige Antwort wert ist.

Dieser Satz ist vollständig gedeckt:

| Bestandteil | Nachweis |
|---|---|
| „durch das Lösen von Schulaufgaben" | `game_sessions`, 334 Sitzungen seit 24.07.2025 |
| „verdienen sich Bildschirmzeit" | `game_sessions.time_earned`, insgesamt 884 Minuten vergeben |
| „Eltern legen fest, wie viel" | `child_settings.*_seconds_per_task`, Standard 30 (Faktenprüfung Zeile 3) |

Was in diesem Satz **nicht** steht, steht dort mit Absicht nicht: dass die
Zeit automatisch freigeschaltet wird. Siehe Abschnitt 6.

---

## 2. Die Kategorie, in der wir antreten

LernZeit ist **keine** Lern-App und **keine** Bildschirmzeit-App. Es ist eine
dritte Sache, und genau darin liegt die Positionierung.

- Eine Lern-App (Anton, Simpleclub, Duolingo) muss das Kind selbst
  motivieren. Ihr Problem ist, dass das Kind sie freiwillig öffnen soll.
- Eine Bildschirmzeit-App (Family Link, Apple Bildschirmzeit, Kids Place)
  nimmt Zeit weg. Ihr Problem ist, dass sie das Kind zum Gegner der Eltern
  macht.

LernZeit verbindet beides: Die Zeit, um die ohnehin verhandelt wird, wird zur
Währung des Lernens. Der Streit „Handy weg" wird ersetzt durch eine Regel,
die das Kind selbst bedienen kann.

**Der Satz, der die Kategorie trägt:**

> Nicht Bildschirmzeit wegnehmen. Bildschirmzeit verdienen lassen.

**Was wir dazu nicht behaupten:** dass es keine vergleichbare App gäbe. Das
ist nicht geprüft und lässt sich in einer Anzeige auch nicht belegen.
Superlative („die einzige", „die erste") sind in Abschnitt 6 gesperrt.

---

## 3. Wofür Eltern uns tatsächlich bezahlen sollen

Kostenlos ist bereits: Aufgaben lösen, Zeit verdienen, alle Fächer der
Klassenstufe, beliebig viele Kinderprofile (Faktenprüfung Zeile 8).

Bezahlt wird für drei Funktionen (Faktenprüfung Zeile 9):

| Funktion | Fundstelle |
|---|---|
| KI-Lernplan für eine anstehende Klassenarbeit | `LearningPlanGenerator.tsx:81` |
| Eigene Tagesobergrenze pro Kind | `ChildSettingsEditor.tsx:396` |
| Erweiterte Lernanalyse | `ChildLearningAnalysis.tsx` |

**Einschränkung, die in der Werbung Folgen hat:** Der KI-Lernplan ist die
auffälligste dieser drei Zusagen und laut Nutzungsdaten praktisch ungenutzt
(drei erzeugte Pläne, ein Nutzer). Bis er selbst mehrfach durchgespielt
wurde, wird er **nicht** zum Haupt-Argument einer Anzeige gemacht. Er darf in
einer Aufzählung stehen, nicht in einer Überschrift.

---

## 4. Personas

Die Personas sind **nicht erfunden**. Sie sind aus den vorhandenen Daten
abgeleitet, und wo die Daten nicht ausreichen, steht das ausdrücklich dabei.

### Datengrundlage (Stand 08.09.2026)

| | Wert | Quelle |
|---|---|---|
| Elternkonten | 16 | `profiles`, `role = 'parent'` |
| Kinderprofile | 65 | `profiles`, `role = 'child'` |
| Eltern mit mindestens einem verknüpften Kind | 7 | `parent_child_relationships` |
| Verknüpfungen insgesamt | 12 | dieselbe Tabelle |
| Kinder mit mindestens einer Lernsitzung | 18 | `game_sessions` |
| davon an 2 oder mehr Tagen aktiv | 7 | `game_sessions` |
| davon an 5 oder mehr Tagen aktiv | 3 | `game_sessions` |
| davon an 14 oder mehr Tagen aktiv | 1 | `game_sessions` |
| Aktive Kinder der letzten 30 Tage | 5 | `game_sessions` |

Klassenverteilung der 65 Kinderprofile (`profiles.grade`):

| Klasse | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | ohne |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Kinder | 21 | 4 | 4 | 3 | 4 | 7 | 7 | 8 | 2 | 4 | 1 |

Zwei Häufungen: **Klasse 1** (21 Profile) und **Klassen 6 bis 8** (22
Profile). Dazwischen ist es dünn.

**Vorsicht bei der Deutung:** 65 Kinderprofile bei 16 Elternkonten und nur 12
Verknüpfungen heißt, dass ein großer Teil dieser Profile angelegt und nie
verknüpft wurde. Die Klasse-1-Häufung kann daher auch ein Artefakt sein —
Klasse 1 ist plausibel der Standardwert, den jemand stehen lässt, der ein
Profil nur ausprobiert. **Diese Zahl trägt keine Anzeige.** Sie ist ein
Hinweis, keine Zielgruppe.

### Persona A — „Der Aushandler" (Kind Klasse 6 bis 8)

**Wer.** Elternteil eines 11- bis 14-Jährigen mit eigenem Smartphone. Die
tägliche Diskussion über Bildschirmzeit ist bereits Alltag. Family Link oder
Apple Bildschirmzeit ist eingerichtet, funktioniert technisch, wird aber als
Machtmittel erlebt — vom Kind wie von den Eltern.

**Auslöser für die Suche.** Nicht „mein Kind lernt zu wenig", sondern „ich
will nicht jeden Abend streiten".

**Was diese Person hier findet.** Eine Regel statt einer Verhandlung. Das
Kind kann sich Zeit selbst erarbeiten, die Eltern müssen nicht Nein sagen.

**Warum das die Hauptzielgruppe ist.** Diese Gruppe ist in den Daten am
belastbarsten vertreten (22 Profile in 6–8), sie hat ein eigenes Gerät —
ohne das ergibt die App wenig Sinn, was die Landingpage in
`SetupSteps.tsx:68` selbst schreibt — und ihr Schmerz ist akut genug für
einen Klick auf eine Anzeige.

**Einwand, den diese Person zuerst hat.** „Und wer schaltet die Zeit dann
frei?" Antwort steht in Abschnitt 6 und muss in jeder Anzeigenstrecke
spätestens auf der Landingpage kommen — nicht später.

### Persona B — „Der Vorsorger" (Kind Klasse 1 bis 4)

**Wer.** Elternteil eines Grundschulkindes. Meist noch kein eigenes Gerät des
Kindes, sondern Tablet oder Eltern-Handy zur Mitbenutzung. Bildschirmzeit ist
noch kein Streit, sondern eine Sorge.

**Auslöser.** „Ich will es von Anfang an richtig machen."

**Was diese Person hier findet.** Kurze Aufgaben mit sofortiger, sichtbarer
Belohnung. Eine Sitzung dauert fünf Aufgaben; die tatsächlich gemessenen
Sitzungen liegen bei rund 40 bis 120 Sekunden
(`game_sessions.duration_seconds`).

**Warum das die zweite und nicht die erste Zielgruppe ist.** Ohne eigenes
Gerät des Kindes greift die Belohnung schwächer, und der Nutzen ist
mittelbarer. Diese Gruppe wird beworben, **nachdem** Persona A Zahlen
geliefert hat — nicht parallel. Bei einem Monatsbudget von 250 € reicht das
Geld nicht für zwei Zielgruppen gleichzeitig, ohne dass beide zu wenig Daten
erzeugen, um irgendetwas zu erkennen.

### Persona C — „Der Fachhelfer" — vorerst NICHT beworben

Elternteil, das ein konkretes Fachproblem lösen will („Mathe läuft
schlecht"). Diese Person sucht eine Lern-App, nicht eine
Bildschirmzeit-Lösung, und vergleicht mit Anton und Simpleclub. In diesem
Vergleich verliert LernZeit, weil es keinen Lernpfad und keine Erklärvideos
hat.

Der Vollständigkeit halber, weil es die naheliegendste Falle wäre: Die
Trefferquoten in `game_sessions` zeigen, wo das Produkt inhaltlich steht.

| Fach | Sitzungen | Kinder | Trefferquote |
|---|---|---|---|
| Mathematik | 212 | 14 | 76,6 % |
| Deutsch | 54 | 9 | 70,2 % |
| Englisch | 25 | 6 | 69,6 % |
| Sachkunde | 19 | 3 | 84,2 % |
| Erdkunde | 5 | 2 | 44,0 % |
| Geschichte | 4 | 2 | 35,0 % |
| Latein | 3 | 1 | 26,7 % |

Die Nebenfächer haben zu wenige Sitzungen für eine Aussage, aber sie liegen
auffällig niedrig. **Kein Fach außer Mathematik wird namentlich beworben**,
und keine Trefferquote geht in eine Anzeige. Diese Tabelle ist
Produktsteuerung, nicht Marketing.

---

## 5. Die Nutzenversprechen, die geführt werden dürfen

Jede Zeile hier ist in `docs/faktenpruefung.md` als **bestätigt** vermerkt
oder heute im Code nachgesehen. Andere Versprechen gibt es nicht.

| # | Versprechen | Belegt durch |
|---|---|---|
| V1 | Kinder verdienen Bildschirmzeit durch richtige Antworten | Faktenprüfung 3 |
| V2 | Standard 30 Sekunden je richtiger Aufgabe, von Eltern je Fach änderbar | Faktenprüfung 3 |
| V3 | 4 Wochen kostenlos testen, keine Zahlungsdaten nötig | Faktenprüfung 1; 77 von 78 Abo-Zeilen ohne Stripe-Kunden-ID |
| V4 | 2,99 € im Monat oder 29,99 € im Jahr | Faktenprüfung 5 |
| V5 | Beliebig viele Kinderprofile | Faktenprüfung 8 |
| V6 | Alle Fächer der jeweiligen Klassenstufe, Klasse 1 bis 10 | Faktenprüfung 8 |
| V7 | Daten liegen auf Servern in der EU (Frankfurt) | Faktenprüfung 11 |
| V8 | Verknüpfung von Eltern und Kind über einen Einladungscode, 7 Tage gültig, einmalig | Faktenprüfung 2 |
| V9 | Aufgaben passend zur Klassenstufe und zum Schuljahresfortschritt | `_shared/school-year.ts`, ausgeliefert 08.09.2026 |

**Zu V3 — Wortlaut ist Pflicht.** Es heißt **„4 Wochen"**, überall gleich.
Die Datenbank vergibt tatsächlich 30 Tage; die gerundete Zahl verspricht also
zwei Tage *weniger*, als geliefert wird. In dieser Richtung ist die Abweichung
unproblematisch, und die Entscheidung dafür ist bewusst gefallen
(Faktenprüfung 1). Entscheidend ist nur, dass Anzeige und Zielseite dieselbe
Zahl nennen — Google gleicht das ab. Also nirgends „30 Tage" schreiben, auch
nicht, weil es großzügiger klingt.

**Zu V6 — Wortlaut ist Pflicht.** Es heißt **„alle Fächer der jeweiligen
Klassenstufe"**, nicht „alle Fächer". Chemie gibt es ab Klasse 7, Physik ab
5, Englisch ab 3. Ein Drittklässler bekommt vier Fächer, nicht zehn.

**Zu V9 — neu und noch ohne Wirkungsnachweis.** Seit dem 08.09.2026 zieht der
Fragen-Generator früh im Schuljahr überwiegend Stoff der vorigen
Klassenstufe. Der Nutzen ist plausibel und die Ursache belegt, die *Wirkung*
ist noch nicht gemessen. Formulierung deshalb beschreibend („passend zum
Schuljahresfortschritt"), niemals wertend („nie zu schwer").

---

## 6. Was wir nicht versprechen

Diese Liste ist verbindlich. Ein Text, der gegen eine dieser Zeilen verstößt,
wird nicht veröffentlicht — auch nicht, wenn er besser konvertiert.

1. **Keine automatische Freigabe der verdienten Zeit.** Sie wird heute von
   Hand freigegeben (`child_settings.screen_time_managed` und
   `screen_time_auto_release`, beide Standard `false` — Faktenprüfung 10).
   Die Gerätesperre über Apple Family Controls ist gebaut, aber nicht
   ausgeliefert. Kein Text darf das Gegenteil andeuten, auch nicht durch
   Auslassung. Die Landingpage sagt es heute schon offen
   (`HonestyBlock.tsx`) — dabei bleibt es.
2. **Keine Tagesobergrenze als Zahl.** Die Standardwerte stimmen — werktags
   30 Minuten, am Wochenende 60, in Testphase und Premium anpassbar
   (Faktenprüfung 4). In eine Anzeige gehören sie trotzdem nicht: In 30
   Zeichen ohne den Zusatz „Standard, anpassbar" liest sich „höchstens 30
   Minuten" wie eine Produktgrenze. Beworben wird, **dass** Eltern die Grenze
   setzen, nicht welche.
3. **Keine Superlative.** Kein „die einzige App", „die erste", „die beste".
   Nicht belegbar.
4. **Keine Lernerfolgs-Behauptungen.** Kein „bessere Noten", „X % mehr
   Lernzeit", „nachweislich wirksam". Es gibt keine Studie und keine
   Messreihe.
5. **Keine erfundenen Zahlen, Zitate oder Testimonials** — auch nicht als
   Platzhalter in einem Entwurf, der „später ersetzt wird".
6. **Keine Nutzerzahlen.** 16 Elternkonten und eine zahlende Familie
   erlauben kein „tausende Familien".
7. **Keine Bewertungen oder Sterne**, solange sie nicht auf der jeweiligen
   Store-Seite selbst nachgesehen wurden.
8. **Kein Fach außer Mathematik namentlich**, siehe Abschnitt 4, Persona C.
9. **Der KI-Lernplan nicht als Hauptargument**, siehe Abschnitt 3.
10. **Kein Kind wird angesprochen.** Weder in der Anzeige noch in der
    Zielgruppeneinstellung. Siehe Abschnitt 7.

---

## 7. Wer angesprochen wird — und wer nicht

**Beworben werden Eltern. Niemals Kinder.** Das gilt in beide Richtungen:

- **In der Ansprache.** Die Anzeige redet mit einem Erwachsenen über sein
  Kind. Sie redet nie mit dem Kind.
- **In der Aussteuerung.** Keine Zielgruppe, keine Ausschlussliste und kein
  Signal, das auf Kinderdaten aufsetzt. Keine Custom Audience aus
  Kinderprofilen. Keine Remarketing-Liste, die aus einem Kinderkonto entsteht.
  Technisch heißt das: Conversions werden ausschließlich aus Elternkonten
  gemeldet, und aus Elternkonten nur mit gehashten Kennungen (SHA-256), nie
  im Klartext.

**Land und Sprache.** Deutschland, deutschsprachig. Das Produkt bildet
deutsche Lehrpläne ab; jede andere Ausspielung wäre verbranntes Geld.

**Geräte.** Persona A setzt ein eigenes Gerät des Kindes voraus. Das lässt
sich nicht ansteuern, gehört aber in den Anzeigentext, damit sich Klicks
selbst filtern.

---

## 8. Tonalität

Die Landingpage hat bereits einen Abschnitt mit der Überschrift **„Was heute
noch nicht geht"**. Das ist keine Schwäche, die man in der Werbung
kaschieren müsste — das ist die Positionierung.

**Wie wir klingen:** ruhig, konkret, elterlich. Wir kennen den Streit um das
Handy, wir dramatisieren ihn nicht.

**Wie wir nicht klingen:**

| nicht so | sondern so |
|---|---|
| „Schluss mit dem Handy-Chaos!" | „Weniger Diskussion um die Bildschirmzeit." |
| „Revolutionäre Lern-KI" | „Aufgaben passend zur Klassenstufe." |
| „Ihr Kind wird besser in Mathe" | „Fünf Aufgaben, zwei Minuten, verdiente Zeit." |
| „Jetzt gratis sichern!" | „30 Tage kostenlos testen." |

Keine Angst als Verkaufsargument. Kein Schuldgefühl gegenüber Eltern. Kein
Ausrufezeichen in einer Überschrift.

---

## 9. Kanäle

**Google und Meta sind beide vorgesehen.** Die Datenschutzerklärung wird
deshalb von Anfang an für **beide** Plattformen gefasst, nicht erst
nachträglich für Meta erweitert. Eine Datenschutzerklärung zweimal ändern zu
lassen, kostet mehr als sie einmal richtig zu schreiben.

**Wo das erste Geld hingeht: Google Suche.** Wer „bildschirmzeit kind regeln"
sucht, hat den Bedarf bereits formuliert. Bei 250 € im Monat ist gesuchte
Nachfrage die Ausspielung mit den meisten verwertbaren Daten je Euro. Meta
zeigt Anzeigen Leuten, die gerade nicht suchen — das braucht mehr Budget,
bevor überhaupt etwas erkennbar wird.

**Empfehlung zur Reihenfolge, nicht zum Ausschluss:** erst Google allein
laufen lassen, bis Abschnitt 13 Zahlen geliefert hat. Meta danach, mit dem
dann bekannten Kosten-je-Anmeldung als Vergleichsmaßstab. Beides gleichzeitig
bei 250 € führt dazu, dass keiner der beiden Kanäle genug Daten für eine
Aussage sammelt.

**In keinem Fall:** App-Install-Kampagnen. Sie bräuchten Werbe-SDKs in der
nativen App und würden genau die Zusagen brechen, die heute halten
(Faktenprüfung 12). Der Trichter beginnt auf der Website.

**Ebenfalls nicht:** Display, YouTube, Performance Max. Performance Max ist
bei diesem Budget ungeeignet, weil es die Ausspielung verschleiert — man zahlt
und lernt nichts.

**App-Store-Optimierung** ist kein bezahlter Kanal und läuft unabhängig
weiter.

---

## 10. Die Bausteine für Anzeigentexte

**Diese Texte sind ein Vorschlag und ausdrücklich noch nicht freigegeben.**
Nichts davon wird geschaltet, bevor du es Zeile für Zeile abgenommen hast.

Alle Bausteine halten die Google-Grenzen ein: Überschriften höchstens 30
Zeichen, Beschreibungen höchstens 90.

### Überschriften (je ≤ 30 Zeichen)

| Text | Zeichen | gedeckt durch |
|---|---|---|
| Bildschirmzeit verdienen | 24 | V1 |
| Lernen statt Diskutieren | 24 | Abschnitt 2 |
| Aufgaben lösen, Zeit sammeln | 28 | V1 |
| 4 Wochen kostenlos testen | 25 | V3 |
| Ohne Zahlungsdaten starten | 26 | V3 |
| 2,99 € im Monat | 15 | V4 |
| Eltern legen die Regeln fest | 28 | V2 |
| Klasse 1 bis 10 | 15 | V6 |
| Server in Deutschland | 21 | V7 |
| Für jedes Kind ein Profil | 25 | V5 |

### Beschreibungen (je ≤ 90 Zeichen)

| Text | Zeichen |
|---|---|
| Dein Kind löst Schulaufgaben und verdient sich Bildschirmzeit. Du legst fest, wie viel. | 87 |
| Pro richtiger Antwort gibt es Zeit. Standard sind 30 Sekunden, änderbar für jedes Fach. | 87 |
| 4 Wochen alle Funktionen kostenlos. Keine Zahlungsdaten nötig. Danach 2,99 € im Monat. | 86 |
| Aufgaben passend zur Klassenstufe, Klasse 1 bis 10. Daten auf Servern in der EU. | 80 |

### Der Satz, der auf die Landingpage gehört, nicht in die Anzeige

> Die verdiente Zeit gibst du heute noch selbst in Family Link
> beziehungsweise in der Bildschirmzeit frei.

Er steht bereits in `HonestyBlock.tsx`. In einer Anzeige mit 90 Zeichen wäre
er nicht unterzubringen, ohne dass er nach einer Einschränkung im Kleingedruckten
klingt. Auf der Landingpage steht er sichtbar — und muss dort stehen bleiben,
bevor der erste Euro fließt.

---

## 11. Die Landingpage, auf die geführt wird

Ziel ist `/` mit dem bestehenden Landing-Aufbau. Zwei Bedingungen sind vor
der ersten Schaltung zu erfüllen:

1. **Die Datenschutzerklärung ist an vier Stellen zu präzisieren**
   (Faktenprüfung 12, Entwurf in `docs/datenschutz-entwurf.md`). Es geht
   nicht um die Werbefreiheit in der App — die bleibt wörtlich stehen und
   bleibt wahr. Betroffen sind der ATT- und Tracking-Satz, die Cookie-Zusage,
   die Dienstleisterliste und ein fehlendes Wort in der Kinder-Aufzählung.
   **Das ist der Blocker vor jedem Budget** — nicht wegen des Umfangs,
   sondern weil eine veröffentlichte Zusage nicht rückwirkend gebrochen
   werden kann.
2. **Ein Einwilligungsbanner muss stehen, bevor der erste Werbe-Tag lädt.**
   Ohne Einwilligung darf kein Google- oder Meta-Tag ausgeführt werden, und
   ohne Consent Mode v2 nimmt Google die Conversions in der EU ohnehin nicht
   an. Das ist keine Kür, sondern die Voraussetzung dafür, dass die Messung
   überhaupt funktioniert.

---

## 12. Wo Produkt und Text heute auseinanderlaufen

Diese Punkte sind vor der ersten Schaltung zu entscheiden. Sie kommen aus der
Faktenprüfung und sind hier mit dem konkret nötigen Schritt versehen.

| # | Punkt | Nötiger Schritt | Art |
|---|---|---|---|
| W1 | Datenschutzerklärung deckt seitenübergreifendes Werbe-Tracking nicht ab | Vier Stellen neu fassen, juristisch prüfen lassen. Entwurf liegt in `docs/datenschutz-entwurf.md` | **Blocker** |
| W2 | Kein Einwilligungsbanner vorhanden | CMP einbinden, Consent Mode v2 verdrahten, vor jedem Werbe-Tag | **Blocker** |
| W3 | Store-Stände nicht überprüfbar (Netzsperre der Arbeitsumgebung) | Beide Store-Seiten selbst aufrufen, Version notieren | Kontrolle durch dich |
| W4 | Stripe-Beträge nicht gegengelesen (kein Stripe-Zugang in dieser Umgebung) | Im Stripe-Konto prüfen, ob 2,99 € und 29,99 € hinterlegt sind | Kontrolle durch dich |
| W5 | „Höchstens 30 Minuten am Tag" nennt den Wochenend-Standard nicht | Zwei Textstellen ergänzen: `ChildSettingsEditor.tsx:357`, `OnboardingNextStepCard.tsx:149` | optional, kosmetisch |

W1 und W2 sind Voraussetzung. W3 und W4 sind Kontrollen, an die ich technisch
nicht herankomme. W5 ist ein Vorschlag, keine Baustelle.

**Nicht mehr auf dieser Liste:** die Testphasen-Formulierung. „4 Wochen"
bleibt bewusst stehen (Faktenprüfung 1) und wird in der Werbung genauso
verwendet.

---

## 13. Zielwerte

### 13.1 Ausgangslage, gegen die gemessen wird

Ohne diese Zahlen ist jeder spätere Erfolg unbeweisbar. Stand 08.09.2026:

| Größe | Wert |
|---|---|
| Elternkonten insgesamt | 16 |
| Elternkonten mit verknüpftem Kind | 7 |
| Zahlende Abos | **1** (`subscriptions`, `status = 'active'`) |
| Laufende Testphasen | 8 |
| Abgelaufene Testphasen ohne Abschluss | 65 |
| Aktive Kinder der letzten 30 Tage | 5 |
| Lernsitzungen der letzten 30 Tage | 34 |
| Aktive Fragen im Bestand | 2.858 (`ai_question_cache`) |

**Die härteste Zahl steht in der dritten Zeile.** 65 abgelaufene Testphasen
gegen ein zahlendes Abo. Ob das an fehlender Reichweite liegt oder daran,
dass das Produkt die Testphase nicht überzeugend übersteht, ist bisher
**nicht entschieden** — und genau diese Frage beantwortet das erste
Werbebudget. Das ist der eigentliche Wert der Phase, nicht die
Neuanmeldungen.

### 13.2 Zielwerte des ersten Monats

Budget: 250 €, Beginn deutlich darunter.

| Kennzahl | Zielwert | Wie gemessen |
|---|---|---|
| Z1 | Ausgabe bleibt unter 250 € | Tageslimit × 30 zzgl. Google-Überlieferung; Notaus greift bei 250 € |
| Z2 | mindestens 300 Klicks im Monat | Google Ads |
| Z3 | Kosten je Klick unter 0,80 € | Google Ads |
| Z4 | mindestens 20 neue Elternkonten aus Werbung | Attributionstabelle, nicht Google-Schätzung |
| Z5 | mindestens 8 davon verknüpfen ein Kind | `parent_child_relationships` gegen die Attributionstabelle |
| Z6 | mindestens 5 davon mit einer Lernsitzung in Woche 1 | `game_sessions` |
| Z7 | mindestens 1 zahlendes Abo aus Werbung binnen 60 Tagen | `subscriptions.status = 'active'` |

Z4 bis Z7 sind **absichtlich klein**. Bei 250 € sind sie erreichbar, und sie
bilden trotzdem den vollständigen Trichter ab. Z7 fällt später als der
Berichtszeitraum, weil die Testphase 30 Tage läuft — vor Tag 31 kann es
strukturell kein Abo geben.

### 13.3 Was es bedeutet, wenn ein Zielwert verfehlt wird

Diese Spalte ist der Grund, warum es die Zielwerte gibt. Ohne sie wird jede
Zahl im Nachhinein gedeutet, wie es gerade passt.

| Verfehlt | Wahrscheinliche Ursache | Konsequenz |
|---|---|---|
| **Z2** — zu wenige Klicks | Suchvolumen zu klein oder Gebot zu niedrig | Zuerst das Gebot prüfen. Bleibt es dabei: Der Kanal trägt die Zielgruppe nicht. Weitere Suchbegriffe prüfen, **kein** höheres Budget. |
| **Z3** — zu teure Klicks | Wettbewerb um die Begriffe, oder zu breit ausgesteuert | Auf exakte Suchbegriffe verengen. Breite Übereinstimmung abschalten. |
| **Z4** — Klicks, aber keine Anmeldungen | Landingpage oder Erwartungsbruch zwischen Anzeige und Seite | Anzeigentext gegen Seitentext lesen. **Nicht** das Budget erhöhen — ein undichter Trichter wird durch mehr Zufluss nicht dichter. |
| **Z5** — Anmeldung, aber keine Verknüpfung | Der Einladungscode-Weg ist die Hürde | Das ist ein Produktbefund, kein Werbebefund. Werbung pausieren, bis der Weg leichter ist. |
| **Z6** — Verknüpfung, aber kein Lernen | Kein eigenes Gerät, oder erste Aufgaben zu schwer | Trefferquote der Neuen gegen die Bestandskinder halten (Abschnitt 4). Wirkt die Schuljahres-Anpassung aus V9? |
| **Z7** — keine Umwandlung | Die Premium-Funktionen tragen den Preis nicht | Der wichtigste Befund überhaupt. Er bedeutet: **kein weiteres Werbebudget**, bis das Angebot steht. |
| **Z1** — Budget überschritten | Notaus oder Tageslimit fehlerhaft | Sofort alles anhalten. Ursache finden, bevor irgendetwas weiterläuft. |

**Der Fall, der ausdrücklich kein Misserfolg ist:** Z2 und Z3 erreicht, Z7
verfehlt. Dann hat die Werbung funktioniert und das Produkt hat die
Antwort gegeben, die vorher niemand hatte. 250 € für diese Antwort sind
günstig.

### 13.4 Wann abgeschaltet wird

Unabhängig von allem anderen:

- Ausgabe erreicht 250 € im Kalendermonat -> Notaus.
- Kosten je Anmeldung über 25 € nach 100 Klicks -> anhalten und prüfen.
- 150 Klicks ohne eine einzige Anmeldung -> anhalten. Etwas ist grundlegend
  falsch, und weitere Klicks kosten nur Geld.

---

## 14. Wie dieses Dokument geändert wird

1. Eine neue Behauptung wird **zuerst** in `docs/faktenpruefung.md` geprüft.
2. Erst wenn sie dort **bestätigt** ist, darf sie hier als Versprechen stehen.
3. Ändert sich das Produkt, wird die Faktenprüfung wiederholt — und dieses
   Dokument daran angepasst, nicht umgekehrt.
4. Eine Zahl aus einer Nachricht, einer Erinnerung oder einem älteren
   Dokument wird **nicht** übernommen, ohne sie im Code oder in der Datenbank
   gesehen zu haben. Auch dann nicht, wenn jemand sagt, sie sei bereits
   korrigiert.

Zeile 10 in Abschnitt 6 wird sich ändern, sobald die automatische Freigabe
ausgeliefert ist. Dann wird aus der offenen Einschränkung das stärkste
Argument, das dieses Produkt hat. Bis dahin bleibt sie eine Einschränkung —
offen benannt, nicht versteckt.

# Verkaufstest — kann LernZeit verkauft werden?

**Stand:** 24.09.2026. Alle Zahlen in Abschnitt 2 am selben Tag in der
Produktionsdatenbank nachgesehen.

Dieses Dokument tritt neben `positionierung.md` (was gesagt werden darf) und
`faktenpruefung.md` (was belegt ist). Hier steht, **wie wir die eine Frage
beantworten, die seit einem Jahr offen ist**: Zahlt jemand dafür?

---

## 1. Die Frage braucht weniger, als wir gebaut haben

Wir haben zwei Wochen in Einwilligung, Klick-Kennungen und Conversion-Upload
gesteckt. Für die Frage „kann ich das verkaufen?" ist davon **nichts nötig**.

Der Grund steht in der Datenbank: In den letzten 30 Tagen sind **3** neue
Elternkonten entstanden. Es gibt praktisch keinen organischen Zulauf. Wer in
einem Werbefenster von 14 Tagen dazukommt, kommt aus der Werbung — das ist
keine Schätzung, das ist Arithmetik.

Damit brauchst du für die Antwort keine Klick-Kennung, kein Meta-Pixel, keine
CMP. Du brauchst zwei Zahlen aus zwei getrennten Quellen:

| Quelle | Zahl |
|---|---|
| Meta-Werbekonto | ausgegebenes Geld, Klicks |
| Eigene Datenbank | neue Elternkonten, abgeschlossene Abos im selben Fenster |

Die Messtechnik brauchst du erst, wenn die Antwort „ja" lautet und du
*optimieren* willst. Vorher optimierst du etwas, von dem du nicht weißt, ob
es existiert.

**Das heißt nicht, dass die Arbeit umsonst war.** Die Datenschutzerklärung
musste ohnehin stimmen, und der `localStorage`-Fund war ein echter Mangel.
Aber es war nicht der Weg zur Antwort.

---

## 2. Was die Datenbank hergibt — und was nicht

> **Korrekturvermerk, 24.09.2026.** Dieser Abschnitt stand zweimal falsch da.
> Erst zählte er Kinderkonten als Testphasen. Dann, nach der Korrektur, zog er
> aus 19 Elternkonten Quoten und daraus einen Befund („der Trichter bricht bei
> der Verknüpfung"). Beides war unzulässig, das zweite besonders: **Alle
> bestehenden Konten sind Testkonten des Betreibers.** Aus ihnen lässt sich
> über Nutzerverhalten nichts ableiten — auch nicht „vorsichtig", auch nicht
> „als Rechenannahme".
>
> Die Warnzeile allein hat das nicht verhindert; sie stand schon da, als der
> Fehler geschrieben wurde. Deshalb ist der Abschnitt jetzt anders gebaut: Die
> Zahlen über Konten stehen gar nicht mehr im Fließtext, sondern nur in 2.1 —
> unter der Überschrift, was aus ihnen **nicht** folgt.

### 2.1 Über den Markt: nichts

Sämtliche Konten in der Datenbank sind Testkonten des Betreibers. Daraus folgt
**keine** Aussage über:

* wie viele Besucher sich registrieren
* wie viele Eltern ein Kind verknüpfen, und woran es scheitert, wenn nicht
* wie viele die App nach einer Woche noch benutzen
* wie viele zahlen, und was sie zu zahlen bereit wären
* ob 2,99 € zu wenig, passend oder zu viel ist

Diese fünf Zahlen sind unbekannt. Sie sind der Zweck des Tests in Phase 2.
Jeder Plan, der sie vorab beziffert, beziffert eine Erfindung.

### 2.2 Über die Maschine: einiges, und das ist nachprüfbar

Diese Aussagen hängen nicht an Nutzerverhalten. Sie stehen im Code oder in der
Konfiguration und gelten für jeden, der morgen dazukommt.

| | Befund | Woher |
|---|---|---|
| M1 | Die Testphase berührt Stripe nie. Bei der Registrierung entsteht nur ein lokales Kennzeichen; Stripe wird erst beim Checkout angesprochen. | `subscriptions`-Zeilen ohne `stripe_customer_id`; Zielseite: „keine Zahlungsdaten nötig" |
| M2 | Der Weg von der Bezahlschranke zu Stripe ist im echten Betrieb **nie gegangen worden**. `checkout_started` ist im Ereignis-Protokoll null Mal aufgetaucht. | `analytics_events` |
| M3 | Ein einziger Stripe-Checkout ist je durchgelaufen, am 14.02.2026. | `subscriptions`, Status `active` |
| M4 | Es gibt praktisch keinen organischen Zulauf. | 3 neue Elternkonten in 30 Tagen — und selbst die sind Testkonten. Der Zulauf von Fremden ist damit **null**, nicht „gering". |
| M5 | Preis: 2,99 € im Monat, 29,99 € im Jahr. | `src/config/pricing.ts` |

**M2 und M3 sind die wichtigsten.** Sie sagen nichts darüber, ob jemand zahlen
*will* — sie sagen, dass der Bezahlweg **unerprobt** ist. Bevor 250 € auf ihn
zeigen, muss er einmal nachweislich tragen. Das ist Phase 1.

**M4 ist der Grund, warum der Test ohne Messtechnik funktioniert.** Bei null
Fremdzulauf ist jede Registrierung im Werbefenster der Werbung zuzuordnen.

### 2.3 Was 250 € leisten können

Die folgenden Spannen sind **Branchenwerte für deutsche Meta-Anzeigen**, keine
Messwerte von LernZeit. Sie dienen der Budgetplanung, nicht der Prognose.

```
250 €  bei 0,50–1,50 € je Klick        →    170–500 Klicks
       bei 5–25 % Registrierungsquote  →      9–125 Elternkonten
```

Die Spanne ist absichtlich weit. Wie es bei LernZeit wirklich aussieht, ist
unbekannt — das ist ja die Frage. Für die Planung heißt das nur eines: **250 €
reichen, um die Registrierungsquote und die Kosten je Registrierung zu
messen.** Ob sie reichen, um die Zahlerquote zu messen, entscheidet sich erst,
wenn die erste Zahl da ist.

### 2.4 Die Preisrechnung

2,99 € im Monat. Bei sechs Monaten Verweildauer sind das **18 €** Umsatz je
Kunde; das Jahresabo bringt 29,99 €. Ein Kunde darf in der Anschaffung also
höchstens etwa **6 bis 10 €** kosten.

Du hast entschieden, beim Preis zu bleiben. Das ist notiert und wird nicht
erneut aufgemacht — die Zahl steht hier, weil das Ergebnis von Phase 2 an ihr
gemessen wird, nicht als erneuter Einwand.

---

## 3. Der Vorschlag — drei Phasen

### Phase 1 — diese Woche, ohne einen Euro Werbebudget

Deine Entscheidungen vom 24.09.2026 sind eingearbeitet: **Preis bleibt bei
2,99 €/29,99 €**, **keine Zahlungsdaten zu Beginn der Testphase**. Damit fällt
die Zahlungsentscheidung am Tag 30. Phase 1 dreht deshalb nicht am Produkt,
sondern sorgt dafür, dass der Test überhaupt ablesbar ist.

| | Maßnahme | Warum |
|---|---|---|
| 1.1 | **Selbst einmal komplett kaufen** — fremde Karte, nicht das Betreiberkonto, von der Registrierung bis zur Abbuchung und zurück bis zur Kündigung. | Befund M2 und M3: Der Bezahlweg ist unerprobt, `checkout_started` nie ausgelöst. Bevor 250 € dorthin zeigen, muss er einmal nachweislich tragen. |
| 1.2 | **Den Trichter lückenlos messbar machen.** Jede Stufe bekommt ein Ereignis: Zielseite gesehen, Registrierung begonnen, Registrierung abgeschlossen, Einladungscode erzeugt, Kind verknüpft, erste Aufgabe gelöst, Bezahlschranke gesehen, Bezahlvorgang begonnen. | Damit die Werbung sagen kann, **wo** es klemmt. Heute wissen wir das nicht — und dürfen es auch nicht aus den Testkonten raten. |
| 1.3 | **Zählbericht bauen:** je Tag eine Zeile mit allen Stufen aus 1.2. | Damit du den Test täglich selbst liest, statt am Ende zu rätseln. |
| 1.4 | **Bei der Eigenkaufprobe (1.1) mitschreiben,** ob jedes Ereignis aus 1.2 auch wirklich ankommt. | Ein Trichter, dessen Stufen nicht feuern, misst nichts. |

**Stand 24.09.2026: 1.2 und 1.3 sind gebaut.**

`funnel_report(tage)` in der Datenbank liefert eine Zeile je Tag mit neun
Stufen, `npm run trichter` druckt sie als Tabelle. Zwei Entscheidungen darin
sind wichtiger, als sie aussehen:

* **Wo es eine Tabelle gibt, wird die Tabelle gezählt, nicht das Ereignis.**
  Elternkonten aus `profiles`, Verknüpfungen aus
  `parent_child_relationships`, erste Lernsitzung aus `game_sessions`, Abos
  aus `subscriptions`. Ereignisse nur dort, wo keine Tabelle existiert:
  Besuch der Zielseite, geöffnetes Formular, gesehene Bezahlschranke,
  begonnener Bezahlvorgang.
* **Der Grund dafür ist ein Fund.** Seit Messbeginn am 18.08.2026 sind 16
  Konten entstanden — `sign_up_completed` steht null Mal im Protokoll. Ein
  Ereignis, das im Browser abgeschickt wird, während die Ansicht wechselt,
  kann unterwegs verloren gehen. Die vier kritischen Stellen
  (`sign_up_completed` zweimal, `checkout_started` dreimal,
  `subscription_purchased`) warten das Ereignis jetzt ab, bevor sie
  weiterschalten.

Die Ursache ist damit **wahrscheinlich** behoben, nicht nachweislich. Bewiesen
ist sie erst, wenn bei der Eigenkaufprobe aus 1.1 alle neun Stufen im Bericht
auftauchen. Bis dahin gilt: Der Bericht trägt auch ohne diese Ereignisse,
weil die vier entscheidenden Stufen aus Tabellen kommen.

Nichts davon ändert Produktversprechen, Preis oder App-Store-Text.

**Ausdrücklich nicht in Phase 1:** „die Verknüpfung Eltern–Kind reparieren".
In einer früheren Fassung stand das hier, abgeleitet aus den Testkonten. Ob
dieser Schritt für echte Nutzer eine Hürde ist, weiß niemand. Phase 1.2 macht
ihn messbar; repariert wird, was die Messung zeigt — nicht, was ich vermute.

### Phase 2 — 250 €, 14 Tage, eine Plattform

**Meta zuerst, nicht Google.** Wer nach „Handyzeit Kind App" sucht, kennt die
Kategorie bereits — das sind sehr wenige. Das Problem ist verbreitet, die
Lösung sucht niemand aktiv. Solche Produkte werden **unterbrochen** verkauft,
nicht gesucht. Dass die Kanzlei die Meta-*Messung* gesperrt hat, spielt keine
Rolle: Anzeigen schalten darf man, gezählt wird in der eigenen Datenbank.

| | |
|---|---|
| Budget | 250 €, hart begrenzt im Werbekonto |
| Laufzeit | 14 Tage |
| Zielgruppe | Deutschland, Eltern von Kindern 6–16, keine Interessenverfeinerung |
| Anzeigen | 5 Varianten, siehe Abschnitt 4 |
| Zielseite | `lernzeit.app/start` |
| Gezählt wird | jede Stufe aus 1.2, je Tag |

**Was der Test beantwortet — und was nicht.**

Nach 14 Tagen weißt du sicher: was ein Klick kostet, was eine Registrierung
kostet, und an welcher Stufe die Leute abspringen. Das ist die eigentliche
Ausbeute.

Was du nach 14 Tagen **nicht** sicher weißt: die Zahlerquote. Sie kommt
frühestens an Tag 45, weil die Testphase vier Wochen läuft. Ein Zwischensignal
gibt es trotzdem — `checkout_started` und „Bezahlschranke gesehen" aus 1.2.
Fällt in 14 Tagen keines davon ein einziges Mal, ist auch das eine Auskunft.

**Vorher festlegen, was ein Ja ist.** Nachher festgelegte Schwellen sind keine
Schwellen. Weil die Ausgangswerte unbekannt sind, wird die Schwelle an der
Preisrechnung aus 2.4 aufgehängt, nicht an einer geratenen Quote:

| Ergebnis nach 14 Tagen | Lesart |
|---|---|
| Registrierung unter 3 € | Selbst bei einer schwachen Zahlerquote kann das aufgehen. Laufen lassen, an Tag 45 nachsehen. |
| Registrierung 3–8 € | Offen. Entscheidet sich an Tag 45. |
| Registrierung über 8 € | Bei 18 € Umsatz je Kunde müsste fast jeder Registrierte zahlen. Das tut niemand. Anderer Kanal, andere Zielseite oder anderer Preis. |
| unter 20 Registrierungen insgesamt | Die Anzeige greift nicht. Das Produkt wurde nicht getestet — neue Motive, nicht aufgeben. |

### Phase 3 — erst wenn Phase 2 trägt

Dann, und nur dann, lohnt sich die Technik, die wir schon haben: Klick-Kennung,
serverseitige Conversions, Usercentrics. Sie macht aus „es trägt" ein „es
skaliert". Vorher ist sie Ballast.

---

## 4. Anzeigen, die nicht nach KI aussehen

### 4.1 Das Bild verrät dich, nicht der Text

Generierte Familien am Küchentisch erkennt heute jeder in einer Viertelsekunde
— zu glatte Haut, zu warmes Licht, zu perfekte Komposition, niemand schaut
wirklich irgendwohin. Die Anzeige ist verbrannt, bevor der Text gelesen wird.

Was stattdessen geht, absteigend nach Wirkung:

1. **Bildschirmaufnahme der echten App.** 10 Sekunden: Aufgabe erscheint, Kind
   tippt die Antwort, Zeitgutschrift springt hoch. Kann nicht nach KI aussehen,
   weil es keine ist. Kostet dich zehn Minuten mit dem Telefon.
2. **Ein Foto, das du selbst machst.** Dein eigenes Kind am Telefon, schlechtes
   Wohnzimmerlicht, unscharfer Hintergrund. Die Unvollkommenheit ist das
   Echtheitssignal.
3. **Nur Text auf einfarbigem Grund.** Kein Bild, keine Illustration. Wirkt in
   diesem Umfeld oft am besten, weil es aussieht wie ein Beitrag und nicht wie
   eine Anzeige.

KI ist hier nützlich beim **Schreiben und Variieren**, nicht beim Bild.

### 4.2 Woran man KI-Text erkennt — und was stattdessen dasteht

| Verräter | Stattdessen |
|---|---|
| Dreiklänge: „schnell, einfach, sicher" | Ein Ding. Nur eins. |
| „Nicht nur …, sondern auch …" | Punkt. Neuer Satz. |
| Gedankenstriche als Rhythmusmittel | Punkt oder Komma. |
| „revolutionär", „mühelos", „intelligent", „KI-gestützt" | Was es tut, in Alltagsworten. |
| Ausrufezeichen, Emoji-Listen | Nichts davon. |
| Glatte, allgemeine Behauptung | Eine konkrete Szene mit einer Zahl. |

Die Regel dahinter: **Ein echter Mensch schreibt über eine bestimmte Situation
am Dienstagabend, nicht über eine Produktkategorie.**

### 4.3 Fünf Motive — freigegeben am 24.09.2026

Gedeckt durch V1, V2, V3, V4, V6, V7 in `positionierung.md`. Seit der Freigabe
liegen sie als M1 bis M5 in `werbung/motive.json`, der einzigen Quelle für
Werbetexte; `npm run motive:pruefen` hält sie gegen die Regeln.

**Beim Einrichten der Anzeigen zu beachten:** Vier der fünf Überschriften sind
länger als die rund 40 Zeichen, die Meta im Überschriftenfeld auf dem Handy
zeigt. Sie gehören deshalb **auf das Bild** (Text-auf-Farbe-Karte oder als
Einblendung über der Bildschirmaufnahme), nicht in Metas Überschriftenfeld.
Dort steht besser etwas Kurzes wie „4 Wochen kostenlos testen". M2 ist mit
134 Zeichen Text knapp über der Grenze, ab der Meta „Mehr anzeigen" einblendet
— der Preis im letzten Satz verschwindet dahinter.

1. **„18 Uhr. Das Handy soll weg. Sie wissen, wie der Abend jetzt läuft."**
   Bei LernZeit verdient Ihr Kind sich die Zeit selbst: 30 Sekunden Handyzeit
   je richtig gelöster Aufgabe. 4 Wochen kostenlos.

2. **„Ich habe aufgehört zu diskutieren."**
   Meine Tochter rechnet jetzt zehn Aufgaben, wenn sie länger aufs Handy will.
   Die Zeit schreibt die App gut, nicht ich. 2,99 € im Monat.

3. **„Nicht weniger Handy. Anders verdientes Handy."**
   Richtige Antwort, Zeit aufs Konto. Klasse 1 bis 10, alle Fächer der
   jeweiligen Klassenstufe. 4 Wochen kostenlos testen.

4. **„Wie viel Zeit eine Aufgabe wert ist, legen Sie fest."**
   Standard sind 30 Sekunden. In Mathe mehr, in Deutsch weniger — Ihre
   Entscheidung, je Fach.

5. **„Das Handy war schon immer die Währung. Jetzt hat sie einen Kurs."**
   Aufgaben lösen, Zeit verdienen. Daten auf Servern in Frankfurt.

Nummer 2 ist bewusst in der Ich-Form geschrieben. Sie wird als Text-auf-Farbe
geschaltet und **darf nicht wie ein echtes Kundenzitat aussehen** — kein Name,
kein Foto, keine Anführungszeichen mit Quellenangabe. Erfundene Testimonials
sind ausgeschlossen, und zwar ausnahmslos.

### 4.4 Material — erzeugt am 25.09.2026

Alles unter `werbung/material/`, alles aus `werbung/motive.json` erzeugt und
jederzeit neu erzeugbar. Geändert wird der Text dort, nie im Bild.

| Datei | Motiv | Format | Erzeugt mit |
|---|---|---|---|
| `M1-demo-9x16.mp4`, `M1-demo-feed-4x5.mp4` | M1 | Reels/Stories 1080 × 1920, Feed 1080 × 1350, je ~21 s | `npm run build && FFMPEG=… npm run werbung:video` |
| `M2-feed-4x5.png`, `M2-story-9x16.png` | M2 | Feed 1080 × 1350, Story 1080 × 1920 | `npm run werbung:karten` |
| `M3-…`, `M5-…` | M3, M5 | dieselben | dieselben |

**Das Video (M1)** zeigt zuerst die Überschrift von M1 als Karte (3,7 s),
dann die **echte Demo** der Startseite: fünf Mathe-Aufgaben der 3. Klasse,
alle richtig, am Ende „5 von 5 richtig". Aufgenommen im Browser, nicht
nachgestellt. Während der Aufnahme sind alle Aufrufe an Supabase gesperrt —
die Demo nimmt ihren eingebauten Fragenpool, und kein Aufnahmebesuch landet
im Trichterbericht. Stumme Tonspur; Musik wäre eine eigene Entscheidung und
eine Lizenzfrage.

Was man wissen muss, bevor man es schaltet:

- **Die Demo zeigt keine Sekunden.** Sie zeigt Sterne und „In der echten App
  wird daraus Bildschirmzeit". Die „30 Sekunden" stehen nur im Anzeigentext
  von M1. Das ist gedeckt (V2), aber das Video selbst beweist es nicht.
- **Die Anzeigen siezen, die App duzt.** Die Demo sagt „dein Kind", die
  Motive sagen „Ihr Kind". Beides ist für sich stimmig; ob der Bruch stört,
  ist deine Entscheidung.
- **M4 fehlt als Material.** Die Einstellung „Sekunden je Fach" gibt es nur
  im Elternbereich eines echten Kontos. Am besten nimmst du sie auf deinem
  Telefon auf (Bildschirmaufnahme, Elternbereich → Einstellungen), 10 s
  genügen.
- **Die Karten** (M2, M3, M5) halten im Story-Format die Meta-Schutzzone ein:
  oben 270 px und unten 672 px bleiben frei für Profilzeile und Schaltflächen.

**Wie die Kampagne eingerichtet wird:** `docs/meta-kampagne.md`.

Bei der Aufnahme aufgefallen und behoben: Über der Klassenwahl der Demo stand
„MathTime 📱⏰", ein alter Arbeitsname, jetzt „LernZeit". Und jeder
Fortschrittsbalken der App war leer schon voll grün (Spurfarbe `secondary`
statt `muted`) — bei Frage 1 von 5 sah es aus wie fertig, in der
Lernanalyse wirkten 20 % wie fast alles. Und am wichtigsten: **Jeder
Erstbesucher bekam ein bis drei Sekunden nach dem Laden einen Neustart der
Seite** (der Service Worker übernahm die Seite, die App hielt das für ein
Update). Wer gerade die Demo begonnen hatte, stand wieder auf der
Startseite. Behoben am 25.09.2026 in `src/main.tsx`.

---

## 5. Was der „Agent" sein sollte — und was nicht

Du wolltest ursprünglich einen Agenten, der bei Meta und Google Werbung
schaltet. Ehrliche Einschätzung: **Jetzt noch nicht.** Ein Agent, der Gebote
und Zielgruppen optimiert, ist Optimierungsmaschinerie. Optimieren kann man
erst, wenn etwas da ist, das sich lohnt. Bei 250 € Budget und fünf Motiven
machst du das besser selbst — in zehn Minuten am Tag.

Was stattdessen gebaut ist, Stand 24.09.2026:

| | Was | Wo |
|---|---|---|
| A | **Zählbericht** — je Tag alle Stufen des Trichters | `npm run trichter`, Funktion `funnel_report` |
| B | **Motiv-Generator** — neue Entwürfe, nur aus V1 bis V9, jeder vor der Rückgabe geprüft | Edge Function `generate-ad-motifs`, `npm run motive:erzeugen` |
| C | **Regelprüfung** — jeder Text gegen Abschnitt 5, 6 und 8 der Positionierung | `supabase/functions/_shared/ad-rules.ts`, `npm run motive:pruefen` |

### Was der Generator kann — und was nicht

**Er kann:** Varianten schreiben, die mit einer konkreten Szene beginnen, nur
belegte Fakten nennen und keine der verbotenen Formulierungen enthalten. Er
schreibt nur Entwürfe; freigeben kann nur ein Mensch.

**Er kann nicht:** beweisen, dass eine Aussage inhaltlich gedeckt ist. Die
Regeln fangen Zahlen, Pflicht-Wortlaute und verbotene Wörter. Sie fangen
nicht, wenn ein Satz unbelegt *klingt, ohne es zu sagen*.

Beispiele aus den ersten drei Läufen, alle am 24.09.2026:

| Entwurf | Problem | Gefangen? |
|---|---|---|
| „Die Einrichtung dauert nur einen Moment." | erfundene Eigenschaft | nach Lauf 1 als Regel ergänzt, jetzt Hinweis |
| „Es ist 15 Uhr. Hausaufgabenzeit." | legt Hausaufgabenhilfe nahe | nach Lauf 2 als Regel ergänzt, jetzt Hinweis |
| „Nur noch fünf Minuten." | 6.2 kannte „fünf" nicht — aber es ist gar keine Tagesgrenze | Regel 6.2 präzisiert: Verstoß nur mit Grenz-Zusammenhang |
| „Sonntagabend. Zeit für die Planung der Woche." | deutet eine Planungsfunktion an, nahe am KI-Lernplan | **nein** — nur beim Lesen |
| „…verknüpfen Sie Ihre Geräte einmalig." | V8 verknüpft Konten, nicht Geräte | **nein** — nur beim Lesen |

Die letzten beiden Zeilen sind der Grund, warum die Freigabe beim Menschen
bleibt. Jeder Entwurf in `werbung/motive.json` trägt deshalb eine
`einschaetzung` (empfohlen / mittel / abraten) und eine `pruefnotiz`.

**Qualität:** Lauf 1 war regelkonform, aber flach — Datenblatt-Sätze, fünf von
acht mit derselben Schlussformel. Nach der Vorgabe „jedes Motiv beginnt mit
einem Moment" kamen in Lauf 2 Einstiege wie „Wie lange darf ich heute am Handy
spielen?" und „Mathe soll mehr wert sein als Englisch." Die Texte darunter
bleiben schwächer als die Überschriften. Für den ersten Test sind die fünf
handgeschriebenen Motive das bessere Material; der Generator lohnt sich, sobald
feststeht, welches Motiv gewinnt — dann für Varianten genau davon.

### Warum die Edge Function eigenständig ist

Edge Functions werden in diesem Projekt **nicht** beim Merge ausgeliefert. Am
24.09.2026 nachgesehen: Die repo-verwalteten Funktionen stammen aus einer
Sammel-Auslieferung am 06.09.2026 um 20:44 UTC. Die einzige spätere Änderung
an Produktionscode (`annual-grade-upgrade`, 14.09.) ist per Schnittstelle
hochgeladen worden, nicht über den Merge. Heute steht nichts aus — aber jede
künftige Änderung an einer Edge Function muss eigens ausgeliefert werden.

Der Generator besteht deshalb nur aus zwei Dateien und wird einzeln
hochgeladen.
Wer `ad-rules.ts` ändert, muss die Funktion neu ausliefern — sonst prüft der
Server nach alten Regeln und `npm run motive:pruefen` nach neuen.

Der Agent, der eigenständig Budget verschiebt, kommt in Phase 3 — wenn es
Budget gibt, das sich zu verschieben lohnt.

---

## 6. Entschieden — und was noch offen ist

**Entschieden am 24.09.2026:**

| | Entscheidung |
|---|---|
| Preis | bleibt bei 2,99 €/Monat und 29,99 €/Jahr |
| Zahlungsdaten zu Beginn der Testphase | nein, bleibt ohne Karte |

Beides ist eingearbeitet. Die Folge steht in Phase 2: Die Zahlerquote kommt
erst an Tag 45. Bis dahin gemessen werden die Stufen bis zur Registrierung und
die Absprungstelle danach.

**Noch offen:**

1. **Meta-Werbekonto.** Muss von dir angelegt werden, mit Zahlungsmittel und
   verifizierter Seite. Ich lege keine Konten an — das ist deine Regel und sie
   ist richtig.
2. ~~Freigabe der fünf Motive~~ — **erledigt am 24.09.2026**, M1 bis M5.
3. **Durchsicht der elf Generator-Entwürfe** (G1 bis G11 in
   `werbung/motive.json`). Jeder trägt eine Einschätzung; empfohlen sind G1,
   G6, G8 und G11.
4. **Die Eigenkaufprobe aus Phase 1.1.** Die kann nur jemand mit einer echten
   Karte machen, und der Weg ist seit Februar nicht gegangen worden.

---

## 7. Was dieses Dokument bewusst nicht behauptet

* Nicht, dass das Produkt sich verkaufen lässt. Das ist die offene Frage.
* Nicht, dass es sich nicht verkaufen lässt. **Sämtliche bestehenden Konten
  sind Testkonten des Betreibers.** Über den Markt sagen sie nichts — weder
  Gutes noch Schlechtes, und auch nichts „Vorsichtiges".
* Nicht, dass 250 € reichen, um ein Geschäft zu beweisen. Sie reichen, um zu
  messen, was eine Registrierung kostet und wo die Leute abspringen. Das
  genügt für die nächste Entscheidung, nicht für alle.

**Regel für alle künftigen Fassungen dieses Dokuments:** Eine Zahl aus der
Datenbank darf hier nur stehen, wenn sie eine Eigenschaft der *Software*
beschreibt (Abschnitt 2.2). Sobald sie etwas über *Menschen* behauptet, ist
sie unzulässig, solange die einzigen Konten Testkonten sind. Diese Regel ist
in diesem Dokument zweimal gebrochen worden, beide Male unabsichtlich, beide
Male in eine Richtung, die nach einer Erkenntnis aussah.

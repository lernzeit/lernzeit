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

## 2. Der Befund, der den Plan ändert

> **Einordnung vorweg:** Die bestehenden Konten sind der Betreiber und interne
> Tester. Sie sind **kein Marktsignal** und werden hier nicht als solches
> verwendet. Was sie zeigen, ist etwas anderes: ob die Maschine funktioniert.

### 2.1 Der Zahlweg ist so gut wie unerprobt

| | |
|---|---|
| Zeilen in `subscriptions` mit Status `trialing` | **81** |
| davon mit einer Stripe-Kundennummer | **0** |
| davon mit einer Stripe-Abonummer | **0** |
| Zeilen mit Status `active` | **1**, vom 14.02.2026 |
| ist das der Betreiber? | nein, andere E-Mail als das Betreiberkonto |

In sieben Monaten ist **genau ein** Stripe-Checkout durchgelaufen. Die 81
Testphasen haben Stripe nie berührt — sie sind ein lokales Kennzeichen, das
bei der Registrierung gesetzt wird.

Das ist nicht überraschend: Die Zielseite verspricht „4 Wochen alle Funktionen
kostenlos – keine Zahlungsdaten nötig". Genau so verhält sich das Produkt.

### 2.2 Und darum wäre der Test mit 250 € heute wertlos

| | |
|---|---|
| abgelaufene Testphasen | **68** |
| daraus entstandene Abos | **0** |
| Kinder, die nach Ablauf weiterlernten | **0** |

Wer eine Anzeige klickt, registriert sich, testet vier Wochen gratis — und
trifft die Zahlungsentscheidung **frühestens 30 Tage später**. Du gibst im
Oktober Geld aus und weißt im Dezember, ob jemand zahlt. Nach einem Jahr
Entwicklung ist das die falsche Reihenfolge.

Rechne es durch, mit realistischen deutschen Meta-Werten:

```
250 €  bei 0,50–1,50 € je Klick      →    170–500 Klicks
       bei 15 % Registrierungsquote  →     25–75 Elternkonten
       bei 2–5 % Zahlerquote         →    0,5–4 zahlende Kunden
                                           …in 30+ Tagen
```

Null bis vier. Aus so einem Ergebnis lässt sich nichts ablesen — weder ein Ja
noch ein Nein. Du hättest 250 € ausgegeben und wüsstest so viel wie vorher.

### 2.3 Die eigentliche Frage ist der Preis, nicht die Werbung

2,99 € im Monat. Bleibt ein Kunde im Schnitt sechs Monate, sind das **18 €**
Lebenszeitumsatz; das Jahresabo bringt 29,99 €. Damit darf ein Kunde in der
Anschaffung **höchstens etwa 6 bis 10 €** kosten, sonst rechnet es sich nie.

Bei 25–75 Registrierungen aus 250 € kostet eine Registrierung 3–10 €. Wenn
davon jede zehnte zahlt, kostet ein Kunde 30–100 €. Bei 18 € Umsatz je Kunde
ist das Geschäft dann tot — nicht wegen der Anzeigen, sondern wegen des
Preises.

**Das ist die unbequeme Erkenntnis dieses Dokuments:** Werbung kann einen zu
niedrigen Preis nicht retten. Vergleichbare Elternkontroll-Apps liegen bei 5
bis 10 € im Monat. Ob 2,99 € richtig ist, gehört auf den Tisch, bevor Geld in
Anzeigen fließt.

---

## 3. Der Vorschlag — drei Phasen

### Phase 1 — diese Woche, ohne einen Euro Werbebudget

Ziel: den Zahlweg so umbauen, dass die Antwort in **Tagen** kommt, nicht in
Wochen.

| | Maßnahme | Warum |
|---|---|---|
| 1.1 | **Zahlungsdaten zu Beginn der Testphase.** Die vier Wochen bleiben kostenlos wie versprochen, aber die Karte wird beim Start hinterlegt: „4 Wochen kostenlos, danach 2,99 €/Monat, jederzeit kündbar." | Die Entscheidung fällt am Tag 0 statt am Tag 30. Du siehst in einer Woche, ob jemand bereit ist zu zahlen. Das ist der Standardweg im Abo-Geschäft, und er wandelt um ein Vielfaches besser. |
| 1.2 | **Selbst einmal komplett kaufen** — mit einer fremden Karte, nicht mit dem Betreiberkonto, bis zur Abbuchung und zurück bis zur Kündigung. | Genau ein Mensch hat das je getan, im Februar. Bevor du 250 € auf diesen Weg lenkst, muss er nachweislich tragen. |
| 1.3 | **Preisfrage entscheiden** (Abschnitt 6, Frage 1). | Ändert alles Nachfolgende. |
| 1.4 | Eine **Zählabfrage** bauen: neue Elternkonten und Abos je Tag, als eine Zahl. | Damit du den Test lesen kannst, ohne mich zu fragen. |

**Achtung bei 1.1:** „4 Wochen kostenlos" ist eine geführte Zusage (V3 in
`positionierung.md`) und steht auf der Zielseite und im App Store. Die Zusage
bleibt wortgleich — nur die Karte kommt dazu. Der Satz „keine Zahlungsdaten
nötig" muss dann überall verschwinden, auch im App Store. Das ist der Preis
dieser Änderung, und er ist nicht klein.

### Phase 2 — 250 €, 14 Tage, eine Plattform

**Meta zuerst, nicht Google.** Begründung: Wer nach „Handyzeit Kind App" sucht,
kennt die Kategorie bereits — das sind sehr wenige. Das Problem ist verbreitet,
die Lösung sucht niemand aktiv. Solche Produkte werden **unterbrochen**
verkauft, nicht gesucht. Dafür ist Instagram/Facebook der Kanal. Dass die
Kanzlei die Meta-*Messung* gesperrt hat, spielt keine Rolle: Anzeigen schalten
darf man, gezählt wird in der eigenen Datenbank.

| | |
|---|---|
| Budget | 250 €, hart begrenzt im Werbekonto |
| Laufzeit | 14 Tage |
| Zielgruppe | Deutschland, Eltern von Kindern 6–16, keine Interessenverfeinerung |
| Anzeigen | 5 Varianten, siehe Abschnitt 4 |
| Zielseite | `lernzeit.app/start`, unverändert |
| Gemessen wird | neue Elternkonten und Abos je Tag, aus der eigenen Datenbank |

**Vorher festlegen, was ein Ja ist.** Nachher festgelegte Schwellen sind keine
Schwellen. Vorschlag:

| Ergebnis nach 14 Tagen | Lesart |
|---|---|
| Kunde kostet unter 15 € | Es trägt. Phase 3. |
| Kunde kostet 15–40 € | Grenzfall. Preis erhöhen oder Zielseite verbessern, dann wiederholen. |
| Kunde kostet über 40 € | Nicht über bezahlte Anzeigen verkaufbar. Anderer Weg oder anderer Preis. |
| unter 20 Registrierungen insgesamt | Die Anzeige greift nicht. Das Produkt wurde noch gar nicht getestet — neue Motive, nicht aufgeben. |

Die letzte Zeile ist wichtig: Ein schwaches Ergebnis kann an der Anzeige
liegen und nicht am Produkt. Deshalb fünf Varianten und nicht eine.

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

### 4.3 Fünf Entwürfe

Gedeckt durch V1, V2, V3, V4 in `positionierung.md`. **Nichts davon wird ohne
deine Freigabe geschaltet.**

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

---

## 5. Was der „Agent" sein sollte — und was nicht

Du wolltest ursprünglich einen Agenten, der bei Meta und Google Werbung
schaltet. Ehrliche Einschätzung: **Jetzt noch nicht.** Ein Agent, der Gebote
und Zielgruppen optimiert, ist Optimierungsmaschinerie. Optimieren kann man
erst, wenn etwas da ist, das sich lohnt. Bei 250 € Budget und fünf Motiven
machst du das besser selbst — in zehn Minuten am Tag.

Was ich dagegen sofort bauen kann und was sich rechnet:

| | Was | Nutzen |
|---|---|---|
| A | **Täglicher Zählbericht.** Ein Aufruf, eine Tabelle: neue Elternkonten, gestartete Testphasen, abgeschlossene Abos, je Tag, letzte 14 Tage. | Du liest den Test, ohne mich zu fragen. |
| B | **Motiv-Generator.** Aus `positionierung.md` und `faktenpruefung.md` neue Textvarianten, die nur belegte Aussagen verwenden — mit Prüfung gegen die Verbotsliste aus Abschnitt 6 der Positionierung. | Nachschub an Varianten, ohne dass eine unbelegte Behauptung durchrutscht. |
| C | **Warnung bei Abweichung.** Meldet, wenn eine Zahl in einem Anzeigentext nicht mehr zur Datenbank passt. | Die Regel, die du selbst aufgestellt hast, durchgesetzt statt nur aufgeschrieben. |

Der Agent, der eigenständig Budget verschiebt, kommt in Phase 3 — wenn es
Budget gibt, das sich zu verschieben lohnt.

---

## 6. Was ich von dir brauche

1. **Der Preis.** Bleibt es bei 2,99 €/29,99 €, oder testen wir höher? Bei
   2,99 € muss ein Kunde unter ~8 € in der Anschaffung kosten; das ist in
   bezahlter Werbung sportlich. Meine Empfehlung: 4,99 €/Monat und
   39,99 €/Jahr für neue Kunden, bestehende behalten ihren Preis.
2. **Karte zu Beginn der Testphase — ja oder nein?** Das ist die Änderung mit
   dem größten Hebel und dem größten Risiko. Ohne sie dauert der Test sechs
   Wochen statt zwei.
3. **Meta-Werbekonto.** Muss von dir angelegt werden, mit Zahlungsmittel und
   verifizierter Seite. Ich lege keine Konten an — das ist deine Regel und sie
   ist richtig.
4. **Freigabe der fünf Motive** aus Abschnitt 4.3, gern mit Änderungen.

---

## 7. Was dieses Dokument bewusst nicht behauptet

* Nicht, dass das Produkt sich verkaufen lässt. Das ist die offene Frage.
* Nicht, dass es sich nicht verkaufen lässt. Die bestehenden Zahlen stammen
  vom Betreiber und von Testern und sagen über den Markt nichts.
* Nicht, dass 250 € reichen, um ein Geschäft zu beweisen. Sie reichen, um zu
  messen, was ein Kunde kostet — und das genügt für die Entscheidung.

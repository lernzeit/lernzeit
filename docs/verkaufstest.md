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

> **Korrektur vom 24.09.2026.** Die erste Fassung dieses Abschnitts nannte
> „81 Testphasen" und „68 abgelaufene Testphasen, daraus 0 Abos". Das war
> falsch: 69 dieser Zeilen gehören **Kinderkonten**, die bei der Anmeldung
> automatisch eine Abo-Zeile bekommen. Ein Kind hat keine Testphase, die es
> bezahlen könnte. Nachgerechnet nur über `profiles.role = 'parent'` ergibt
> sich das Bild unten. Die Schlussfolgerungen in Abschnitt 3 ändern sich
> dadurch — zum Besseren, nicht zum Schlechteren.

> **Einordnung vorweg:** Die bestehenden Konten sind der Betreiber und interne
> Tester. Sie sind **kein Marktsignal** und werden hier nicht als solches
> verwendet. Was sie zeigen, ist etwas anderes: ob die Maschine funktioniert
> und wo sie klemmt.

### 2.1 Der Eltern-Trichter, vollständig

| Stufe | Konten |
|---|---|
| Elternkonten insgesamt | **19** |
| davon mit verknüpftem Kind | **7** |
| davon Kind hat tatsächlich gelernt | **7** |
| Testphase läuft noch | 3 |
| Testphase abgelaufen | 9 |
| gekündigt | 5 |
| **zahlend** | **1** |

Zwei Dinge springen heraus.

**Erstens: Zwölf von neunzehn Eltern haben nie ein Kind verknüpft.** Sie haben
sich registriert und danach nie erlebt, wofür das Produkt da ist — kein Kind,
keine Aufgabe, keine verdiente Minute. Über einen Kauf konnten sie gar nicht
nachdenken.

**Zweitens: Wer es einrichtet, benutzt es auch.** Alle 7, die ein Kind
verknüpft haben, haben auch gelernt. Der Bruch liegt nicht im Produkt, er
liegt **davor** — in der Einrichtung.

Das ist für einen Werbetest die wichtigste Zahl des ganzen Dokuments. Jeder
Euro, der Eltern bringt, die an der Verknüpfung scheitern, ist verbrannt,
bevor irgendetwas gemessen werden kann.

### 2.2 Der Zahlweg ist so gut wie unerprobt

| | |
|---|---|
| Eltern-Zeilen mit Status `trialing` | 12 |
| davon mit einer Stripe-Kundennummer | **0** |
| Zeilen mit Status `active` | **1**, vom 14.02.2026 |
| ist das der Betreiber? | nein, andere E-Mail als das Betreiberkonto |
| Ereignis `checkout_started`, jemals ausgelöst | **0-mal** |

In sieben Monaten ist genau ein Stripe-Checkout durchgelaufen, und seit das
Ereignis-Protokoll existiert, hat **niemand** den Bezahlvorgang auch nur
begonnen. Die Testphase berührt Stripe nie — die Zielseite verspricht
„4 Wochen alle Funktionen kostenlos – keine Zahlungsdaten nötig", und genau so
verhält sich das Produkt.

Der Weg von der Bezahlschranke zu Stripe ist damit in echtem Betrieb
**unbewiesen**. Nicht „schwach" — unbewiesen.

### 2.3 Was 250 € unter diesen Bedingungen leisten können

Rechne es mit realistischen deutschen Meta-Werten durch:

```
250 €  bei 0,50–1,50 € je Klick        →    170–500 Klicks
       bei 15 % Registrierungsquote    →     25–75 Elternkonten
       bei 37 % Verknüpfungsquote *    →      9–28 eingerichtete Familien
       bei 14 % Zahlerquote *          →       1–4 zahlende Kunden
                                              …frühestens nach 30 Tagen

* die beiden Sternchen-Quoten stammen aus 19 bzw. 7 Konten von Testern.
  Sie sind Rechenannahmen, keine Messwerte.
```

Die Zahlerzahl am Ende ist zu klein, um daraus ein Ja oder Nein zu lesen. Die
**mittlere** Zeile ist es nicht: 9 bis 28 eingerichtete Familien sind genug,
um „Kosten je eingerichteter Familie" belastbar zu messen — und das schon
nach 14 Tagen, nicht nach sechs Wochen.

Darauf baut Phase 2 jetzt auf.

### 2.4 Die Preisrechnung bleibt, wie sie ist

2,99 € im Monat. Bei sechs Monaten Verweildauer sind das **18 €** Umsatz je
Kunde, das Jahresabo bringt 29,99 €. Ein Kunde darf in der Anschaffung also
höchstens etwa 6 bis 10 € kosten.

Du hast entschieden, beim Preis zu bleiben. Das ist notiert und wird nicht
erneut aufgemacht — aber die Zahl gehört sichtbar ins Dokument, weil das
Ergebnis von Phase 2 an ihr gemessen wird. Kommt die eingerichtete Familie auf
25 € und zahlt davon jede siebte, kostet ein Kunde 175 €. Dann ist nicht die
Anzeige das Problem.

---

## 3. Der Vorschlag — drei Phasen

### Phase 1 — diese Woche, ohne einen Euro Werbebudget

Deine Entscheidungen vom 24.09.2026 sind eingearbeitet: **Preis bleibt bei
2,99 €/29,99 €**, **keine Zahlungsdaten zu Beginn der Testphase**. Damit fällt
die Zahlungsentscheidung weiterhin am Tag 30. Phase 1 zieht deshalb das
Messbare nach vorn, statt am Preis oder an der Karte zu drehen.

| | Maßnahme | Warum |
|---|---|---|
| 1.1 | **Die Verknüpfung Eltern–Kind reparieren.** 12 von 19 Eltern kommen hier nicht durch. Zuerst nachvollziehen, wo genau es hakt — Einladungscode, zweites Gerät, unklare Anleitung. | Der größte Leck im Trichter, und er sitzt vor allem anderen. Jeder Werbe-Euro, der hier versickert, ist doppelt verloren: kein Kunde und keine Erkenntnis. |
| 1.2 | **Selbst einmal komplett kaufen** — fremde Karte, nicht das Betreiberkonto, bis zur Abbuchung und zurück bis zur Kündigung. Dabei prüfen, ob `checkout_started` und `sign_up_completed` im Ereignis-Protokoll ankommen. | Genau ein Mensch hat je gekauft, im Februar. `checkout_started` ist nie ausgelöst worden. Bevor 250 € auf diesen Weg zeigen, muss er nachweislich tragen. |
| 1.3 | **Zählbericht bauen:** je Tag neue Elternkonten, verknüpfte Kinder, erste Lernsitzung, begonnene Bezahlvorgänge, Abos. | Damit du den Test selbst liest, ohne mich zu fragen — und zwar täglich, nicht am Ende. |
| 1.4 | **Frühindikator festlegen.** Weil die Zahlung erst am Tag 30 kommt, wird in Phase 2 primär die **eingerichtete Familie** gezählt: Elternkonto + verknüpftes Kind + mindestens eine Lernsitzung. | Diese Zahl steht nach 14 Tagen fest und ist der beste verfügbare Vorbote der Zahlung. |

Nichts davon ändert das Produktversprechen, den Preis oder den App-Store-Text.

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
| Hauptkennzahl | **Kosten je eingerichteter Familie** (Elternkonto + Kind verknüpft + erste Lernsitzung) |
| Nebenkennzahl | begonnene Bezahlvorgänge, Abos — abgelesen an Tag 45 |

**Vorher festlegen, was ein Ja ist.** Nachher festgelegte Schwellen sind keine
Schwellen.

| Ergebnis nach 14 Tagen | Lesart |
|---|---|
| Eingerichtete Familie unter 10 € | Trägt. Anzeigen laufen lassen, an Tag 45 die Zahlerquote ablesen. |
| 10–25 € | Grenzfall. Bei 2,99 € muss dann mindestens jede dritte Familie zahlen — unwahrscheinlich. Preis oder Zielseite. |
| über 25 € | Über bezahlte Anzeigen nicht verkaufbar. Anderer Kanal oder anderer Preis. |
| unter 20 Registrierungen insgesamt | Die Anzeige greift nicht. Das Produkt wurde noch gar nicht getestet — neue Motive, nicht aufgeben. |
| viele Registrierungen, kaum Einrichtungen | Das Leck aus 1.1 ist nicht behoben. Kein Urteil über den Markt. |

Die letzten beiden Zeilen sind wichtig: Ein schwaches Ergebnis kann an der
Anzeige oder an der Einrichtung liegen und nicht am Produkt. Deshalb fünf
Varianten — und deshalb Phase 1.1 zuerst.

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

## 6. Entschieden — und was noch offen ist

**Entschieden am 24.09.2026:**

| | Entscheidung |
|---|---|
| Preis | bleibt bei 2,99 €/Monat und 29,99 €/Jahr |
| Zahlungsdaten zu Beginn der Testphase | nein, bleibt ohne Karte |

Beides ist eingearbeitet. Die Folge steht in 2.4 und in Phase 2: Die
Zahlungszahl kommt erst an Tag 45, gemessen wird bis dahin die eingerichtete
Familie.

**Noch offen:**

1. **Meta-Werbekonto.** Muss von dir angelegt werden, mit Zahlungsmittel und
   verifizierter Seite. Ich lege keine Konten an — das ist deine Regel und sie
   ist richtig.
2. **Freigabe der fünf Motive** aus Abschnitt 4.3, gern mit Änderungen.
3. **Phase 1.1:** Wo genau scheitert die Verknüpfung Eltern–Kind? Dafür brauche
   ich einmal deine Beobachtung aus der Praxis — 12 von 19 Konten sind hier
   hängengeblieben, aber die Datenbank sagt nicht, warum.

---

## 7. Was dieses Dokument bewusst nicht behauptet

* Nicht, dass das Produkt sich verkaufen lässt. Das ist die offene Frage.
* Nicht, dass es sich nicht verkaufen lässt. Die bestehenden Zahlen stammen
  vom Betreiber und von Testern und sagen über den Markt nichts.
* Nicht, dass 250 € reichen, um ein Geschäft zu beweisen. Sie reichen, um zu
  messen, was ein Kunde kostet — und das genügt für die Entscheidung.

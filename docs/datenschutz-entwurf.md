# Entwurf: Datenschutzerklärung für bezahlte Werbung

**Status: ENTWURF. Nicht veröffentlichen ohne anwaltliche Prüfung.**

Ich bin kein Anwalt und darf keine Rechtsberatung geben. Was hier steht, ist
eine technisch belastbare Vorlage: Sie beschreibt genau das, was die Software
nach der Umstellung tatsächlich tun wird — nicht mehr und nicht weniger. Ein
Anwalt kann daran Formulierungen prüfen; er kann nicht wissen, was der Code
macht. Diese Hälfte liefere ich.

**Bezug:** `src/pages/Datenschutz.tsx`, Stand 08.09.2026, 235 Zeilen.
**Auslöser:** geplante Anzeigen bei Google und Meta für die App.
**Fassung 3 (20.09.2026):** nach Empfehlung der Kanzlei zusätzlich reduziert —
**keine Übermittlung gehashter E-Mail-Adressen**, und gespeichert wird erst
bei der Eltern-Registrierung. Siehe Abschnitt 0.

---

## 0. Die Architekturentscheidung, die alles andere vereinfacht

Die Kanzlei fragte, ob die Messung auf einen ausdrücklich für Erwachsene
bestimmten Bereich beschränkt werden kann, während öffentliche Seiten und
Kinderbereiche ohne Werbe-Tags bleiben.

**Nach Adressen lässt sich das nicht trennen.** Unter `/` liegt beides: die
Marketingseite, solange niemand angemeldet ist, und die App nach dem Anmelden
— einschließlich der Kinderansicht. Dazu gibt es einen Demo-Modus, in dem ein
Kind Aufgaben löst, ohne Konto, auf derselben Adresse.

**Deshalb der weitergehende Weg: gar keine Werbe-Skripte, auf keiner Seite.**

| | |
|---|---|
| Woher die Zuordnung kommt | Aus dem Klick-Parameter in der Adresse (`gclid`, `gbraid`, `wbraid`, `fbclid`), den unser eigener Code liest |
| Wie die Conversion gemeldet wird | Server-zu-Server aus unserer Infrastruktur, **ausschließlich mit der Klick-Kennung**. Keine E-Mail-Adresse, auch nicht gehasht. Keine sonstigen Nutzerdaten. |
| Wann überhaupt etwas gespeichert wird | **Erst bei der Registrierung eines Elternkontos**, nach Einwilligung. Bis dahin liegt die Klick-Kennung nur im Arbeitsspeicher der geöffneten Seite. |
| Was im Browser eines blossen Besuchers passiert | **Nichts.** Kein fremdes Skript, kein Pixel, kein Werbe-Cookie, kein Eintrag im lokalen Speicher. |
| Wie das technisch abgesichert ist | Die Content-Security-Policy in `index.html` erlaubt Skripte ausschließlich von `'self'`. Ein Google- oder Meta-Skript würde vom Browser blockiert. Es einzubinden erforderte eine ausdrückliche Änderung dieser Zeile. |

**Der „abgegrenzte Erwachsenenbereich" ist kein Seitenbereich, sondern ein
Vorgang.** Nach Adressen liesse er sich nicht abgrenzen (siehe oben). Über den
Zeitpunkt schon: Gespeichert wird ausschliesslich, wenn sich ein Erwachsener
als Elternteil registriert. Wer nur schaut, hinterlässt nichts. Wer sich als
Kind registriert, ebenfalls nicht.

**Was dadurch entfällt:** Google Analytics 4, das Meta-Pixel und die
Übermittlung gehashter E-Mail-Adressen. Metas Zuordnung wird dadurch deutlich
ungenauer, und eine geräteübergreifende Zuordnung gibt es nicht mehr — das ist
der bewusst gezahlte Preis.

**Was erhalten bleibt:** Die Zuordnung bei Google über die Klick-Kennung, und
die vollständige eigene Auswertung in unserer Datenbank in der EU. Was wir an
Google und Meta senden, ist beschränkt; was wir selbst über die Wirksamkeit
einer Anzeige wissen, nicht.

**Was dadurch an die Stelle von Consent Mode v2 tritt:** Der Einwilligungs-
status wird nicht im Browser an ein Google-Skript signalisiert, sondern mit
jeder Conversion serverseitig mitübertragen.

---

## 1. Was sich nicht ändert — und warum das der Kern ist

In der Datenschutzerklärung stehen zwei Dinge, die beide „Werbung" heißen und
nichts miteinander zu tun haben:

| | |
|---|---|
| Werbung **in** der App | Anzeigen, die Kindern eingeblendet werden. Gibt es nicht, soll es nicht geben. |
| Werbung **für** die App | Anzeigen bei Google und Meta, die Eltern auf lernzeit.app führen. |

Die Zusagen gegenüber Apples Kids-Category betreffen ausschließlich das erste.
**Diese Sätze bleiben wörtlich stehen**, weil sie wahr bleiben:

- § 5: „In LernZeit wird weder personalisierte noch kontextbezogene Werbung
  Dritter ausgespielt. Es sind keine Werbe-SDKs (z. B. AdMob, Meta Audience
  Network) integriert."
- § 5: „Daten von Kindern werden nicht für Marketing-, Profiling- oder
  Analysezwecke Dritter verwendet oder verkauft."
- § 5: „ohne Werbe-Identifier (IDFA/AAID) und ohne personenbezogene
  Profilbildung"

Damit sie wahr bleiben, muss eine technische Bedingung eingehalten werden, und
sie ist nicht verhandelbar:

> **Das gesamte Werbe-Tracking findet auf der Website lernzeit.app statt.
> In die native App kommt kein Werbe-SDK, kein Pixel und keine Werbe-ID.**

Das ist keine Einschränkung, die etwas kostet — der Trichter beginnt ohnehin
im Web: Anzeige → lernzeit.app → Anmeldung als Elternteil. Es schließt
lediglich App-Install-Kampagnen aus, die ohne SDK in der App nicht messbar
wären.

---

## 2. Die vier Änderungen im Einzelnen

### Änderung 1 — § 5, ein fehlendes Wort

**Fundstelle:** `Datenschutz.tsx:110`

**Heute:**
> Es werden keine Daten an Dritte zu Werbezwecken weitergegeben

**Neu:**
> Es werden keine Daten von Kindern an Dritte zu Werbezwecken weitergegeben

**Begründung:** Der Satz steht in der Aufzählung zu Kinderdaten und ist so
gemeint, aber ohne Einschränkung formuliert. Eine Aufsichtsbehörde liest ihn,
wie er dasteht. Das eingefügte Wort macht ihn präzise, nicht schwächer — die
Zusage für Kinder bleibt vollständig.

---

### Änderung 2 — § 5, der Tracking-Satz

**Fundstelle:** `Datenschutz.tsx:124`

**Heute:**
> **Kein Tracking & keine Profilbildung:** Wir nutzen keine
> Tracking-Technologien geräte- oder app-übergreifend. Die App fragt unter
> iOS daher auch keine „App Tracking Transparency"-Erlaubnis (ATT) ab.

**Neu:**
> **Kein Tracking in der App:** In der LernZeit-App findet kein Tracking und
> keine Profilbildung statt. Wir nutzen dort keine geräte- oder
> app-übergreifenden Tracking-Technologien und keine Werbe-Identifier. Die App
> fragt unter iOS daher auch keine „App Tracking Transparency"-Erlaubnis (ATT)
> ab. Auch auf unserer Website binden wir keine Skripte von Google oder Meta
> ein. Kommen Sie über eine unserer Anzeigen, speichern wir — **nur mit Ihrer
> Einwilligung** — die Kennung dieses Klicks, um die Wirksamkeit der Anzeige
> zu messen; Einzelheiten in § 8a. Für Kinderkonten findet das nicht statt:
> Wählt jemand bei der Registrierung „Ich bin Kind" oder ist ein Kinderkonto
> angemeldet, werden keine Daten an Werbeplattformen übermittelt.

**Begründung:** Dies ist die einzige Stelle, an der die heutige Zusage
tatsächlich bricht. Ein Google-Ads-Tag ist eine seitenübergreifende
Tracking-Technologie. Der ATT-Satz bleibt richtig, weil die App weiterhin nicht
trackt.

---

### Änderung 3 — § 6a, die Dienstleisterliste

**Fundstelle:** `Datenschutz.tsx:172–184`

**Ergänzung der Liste um zwei Einträge:**
> - **Google Ireland Limited** — Auslieferung und Messung unserer Werbung
>   (Google Ads). Nur bei erteilter Einwilligung.
> - **Meta Platforms Ireland Limited** — Auslieferung und Messung unserer
>   Werbung. Nur bei erteilter Einwilligung.

**Heute lautet der Absatz darunter:**
> Diese Dienste werden ausschließlich zum Betrieb der App eingesetzt und nicht
> für Werbezwecke.

**Neu:**
> Die vorstehend genannten Dienste werden zum Betrieb von App und Website
> eingesetzt. Google Ads und Meta setzen wir ausschließlich für die Bewerbung
> unseres Angebots gegenüber Erwachsenen ein und ausschließlich auf unserer
> Website — nicht in der App und nicht mit Daten von Kindern.

Der Folgesatz zu Drittlandübermittlungen (Standardvertragsklauseln, EU-US Data
Privacy Framework) bleibt unverändert und gilt für die neuen Empfänger mit.

---

### Änderung 4 — § 8, Cookies

**Fundstelle:** `Datenschutz.tsx:200–206`

**Heute:**
> Wir verwenden technisch notwendige Cookies und lokale Speicherung
> (localStorage) ausschließlich für die Authentifizierung und die Speicherung
> von Einstellungen. Es werden keine Tracking-Cookies oder Cookies für
> Werbezwecke verwendet.

**Neu:**
> In der App verwenden wir ausschließlich technisch notwendige Speicherung für
> Authentifizierung und Einstellungen.
>
> **Wir verwenden keine Werbe-Cookies und keine Cookies Dritter.**
>
> Kommen Sie über eine unserer Anzeigen auf unsere Website, speichern wir die
> Kennung dieses Klicks im lokalen Speicher Ihres Browsers (`localStorage`) —
> **ausschließlich, wenn Sie darin eingewilligt haben.** Ohne Ihre
> Einwilligung wird nichts gespeichert und nichts an Google oder Meta
> übermittelt. Ihre Einwilligung können Sie jederzeit über den Link
> „Cookie-Einstellungen" im Seitenfuß mit Wirkung für die Zukunft widerrufen.

**Hinweis zur Formulierung:** Der heutige Satz „Es werden keine
Tracking-Cookies oder Cookies für Werbezwecke verwendet" bleibt damit
**wahr** — wir setzen tatsächlich keine. Die Speicherung erfolgt im lokalen
Speicher, der rechtlich aber gleich zu behandeln ist (§ 25 TDDDG). Der neue
Text sagt beides, statt sich auf die Cookie-Aussage zurückzuziehen.

---

## 3. Neuer Abschnitt § 8a — Werbung für unser Angebot

Dieser Abschnitt ist neu. Er beschreibt genau das, was die Technik tun wird.

> ### 8a. Werbung für unser Angebot
>
> Wir bewerben LernZeit bei Google und Meta. Diese Werbung richtet sich
> ausschließlich an Erwachsene. Kinder werden weder angesprochen noch als
> Zielgruppe verwendet.
>
> **Was das für Sie bedeutet, wenn Sie über eine Anzeige zu uns kommen:**
>
> **Wir binden für diese Messung keine Skripte von Google oder Meta in unsere
> Website ein.** Es werden weder ein Werbe-Pixel noch Google Analytics noch
> ein vergleichbarer Dienst geladen — auf keiner Seite unseres Angebots.
>
> Klicken Sie auf eine unserer Anzeigen, hängt an der Adresse unserer Website
> eine Kennung, an der die werbende Plattform den Klick wiedererkennt (bei
> Google `gclid`, `gbraid` oder `wbraid`, bei Meta `fbclid`).
>
> **Solange Sie sich nur umsehen, wird diese Kennung nirgends gespeichert** —
> weder auf Ihrem Gerät noch bei uns. Sie besteht nur, solange die Seite
> geöffnet ist, und verschwindet, wenn Sie sie schliessen.
>
> Registrieren Sie sich anschließend als Elternteil, übermitteln wir an die
> betreffende Plattform ausschließlich diese Kennung zusammen mit der
> Information, dass eine Registrierung stattgefunden hat. **Wir übermitteln
> dabei keine E-Mail-Adresse — weder im Klartext noch verschlüsselt oder als
> Hashwert — und keine sonstigen Angaben zu Ihrer Person.**
>
> **Was wir nicht tun:**
>
> - Wir übermitteln keinerlei Daten von Kindern — weder Namen, Klassenstufe,
>   Lernergebnisse noch die Tatsache, dass ein Kinderprofil besteht.
> - Wir bilden keine Zielgruppen aus Kinderdaten.
> - Wir setzen weder in der App noch auf der Website ein Werbe-SDK, ein Pixel
>   oder einen Werbe-Identifier ein.
> - Wir übermitteln keine E-Mail-Adressen an Werbeplattformen, auch nicht in
>   verschlüsselter oder gehashter Form.
> - Wir speichern nichts auf Ihrem Gerät, solange Sie sich kein Elternkonto
>   anlegen.
> - Wir verkaufen keine Daten.
>
> **Rechtsgrundlage:** Ihre Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO
> sowie § 25 Abs. 1 TDDDG. Ohne Einwilligung findet nichts von alledem statt:
> Sie können unsere Website und unser Angebot vollständig nutzen, ohne
> einzuwilligen.
>
> **Widerruf:** jederzeit über „Cookie-Einstellungen" im Seitenfuß, mit
> Wirkung für die Zukunft.
>
> **Speicherdauer:** Die Klick-Kennung löschen wir spätestens 90 Tage nach
> Erhebung, sofern es nicht zu einer Anmeldung gekommen ist. Bei einer
> Anmeldung bewahren wir die Zuordnung so lange auf, wie wir die Wirksamkeit
> der Werbemaßnahme auswerten, längstens 13 Monate.
>
> **Empfänger:** Google Ireland Limited, Meta Platforms Ireland Limited. Eine
> Übermittlung in die USA erfolgt auf Grundlage der Standardvertragsklauseln
> und, soweit einschlägig, des EU-US Data Privacy Framework.

**Diese Zusagen sind technisch bindend — und seit dem 14.09.2026 gedeckt.**
Die Speicherfristen stehen nicht mehr nur hier, sondern in der Tabelle
`ad_attribution`: Jede Zeile trägt eine Spalte `delete_after` (90 Tage beim
Anlegen, 13 Monate ab einer Anmeldung), und der tägliche Auftrag
`ad-attribution-retention` löscht, was abgelaufen ist. Geprüft: Von zwei
Testzeilen wurde genau die abgelaufene entfernt.

Ändert jemand die Fristen im Text, müssen die Vorgabewerte der Spalte
mitgeändert werden — sonst sagt dieser Abschnitt wieder etwas anderes als die
Datenbank tut.

---

## 4. Was zusätzlich gebaut werden muss

Die Datenschutzerklärung beschreibt Verhalten. Dieses Verhalten muss es geben.

| | Muss existieren, bevor § 8a veröffentlicht wird |
|---|---|
| 1 | **Einwilligungsbanner (CMP).** Vor der Einwilligung lädt kein Werbe-Tag. Nicht vorausgewählt, Ablehnen genauso leicht wie Zustimmen. |
| 2 | **Einwilligungsstatus bei der Conversion.** Da kein Google-Skript im Browser laeuft, tritt an die Stelle von Consent Mode v2 die Uebertragung des Einwilligungsstatus mit jeder einzelnen serverseitig gemeldeten Conversion. |
| 3 | **Widerruf im Seitenfuß.** Ein Link „Cookie-Einstellungen", der die Auswahl erneut öffnet. |
| ~~4~~ | ~~Automatische Löschung nach 90 Tagen beziehungsweise 13 Monaten~~ — **erledigt**, Spalte `delete_after` und Auftrag `ad-attribution-retention`. |
| ~~5~~ | ~~Hashing serverseitig~~ — **entfällt.** Auf Empfehlung der Kanzlei werden gar keine E-Mail-Adressen übermittelt. Das bereits gebaute Modul dafür ist entfernt. |
| ~~6~~ | ~~Filter auf Elternkonten~~ — **erledigt**, zweifach: `analytics.ts` im Browser und `link_ad_attribution` in der Datenbank. |
| 7 | **Werbe-Tags aus, sobald ein Kinderkonto angemeldet ist.** Siehe Abschnitt 7 — dies ist der offene Punkt mit den größten Folgen. |

---

## 5. Fragen für die anwaltliche Prüfung

Diese Punkte kann ich nicht beantworten. Sie gehören in die Prüfung:

1. Reicht die Trennung „Werbung in der App" gegen „Werbung für die App", um
   die Kids-Category-Zusagen gegenüber Apple unberührt zu lassen?
2. Ist die Einwilligung eines Elternteils als betroffene Person ausreichend,
   wenn die Website ausschließlich von Erwachsenen genutzt wird — und wie ist
   das zu belegen?
3. Sind 13 Monate für die Attributionsdaten angemessen, oder ist kürzer
   geboten?
4. ~~Genügt der SHA-256-Hashwert der E-Mail-Adresse als Maßnahme?~~
   **Erledigt durch die Empfehlung der Kanzlei:** Es werden gar keine
   E-Mail-Adressen übermittelt. Offen bleibt die Anschlussfrage: Fällt auch
   die blosse Klick-Kennung (`gclid`) unter die Einschränkung? Falls ja, wäre
   bei Google keine Conversion-Messung mehr möglich, und das Vorhaben wäre
   grundsätzlich neu zu bewerten.
5. Muss das Verzeichnis von Verarbeitungstätigkeiten ergänzt werden, und ist
   eine Datenschutz-Folgenabschätzung nötig, weil das Angebot Kinder betrifft?
6. Sind Auftragsverarbeitungs- beziehungsweise Joint-Controller-Verträge mit
   Google und Meta abzuschließen, und wer schließt sie?
7. Ein Kind kann lernzeit.app besuchen, ohne angemeldet zu sein — vor der
   Anmeldung lässt sich technisch niemand unterscheiden. Durch die
   Entscheidung aus Abschnitt 0 wird dabei **kein fremdes Skript geladen und
   nichts an Dritte übermittelt**; gespeichert würde allenfalls die Kennung
   eines Anzeigenklicks im lokalen Speicher, und auch das nur nach
   Einwilligung. Genügt das bei einem Angebot, das sich auch an Kinder
   richtet?

---

## 6. Reihenfolge der Umsetzung

```
1. Anwaltliche Prüfung dieses Entwurfs
2. Attributionstabelle inkl. automatischer Löschung
3. CMP mit Consent Mode v2 und Widerruf im Seitenfuß
4. Datenschutzerklärung veröffentlichen
5. Werbe-Tags scharfschalten
6. Erst danach: erstes Budget
```

Schritt 4 vor Schritt 2 wäre eine Zusage über etwas, das es nicht gibt.
Schritt 5 vor Schritt 3 wäre der Verstoß selbst.


---

## 7. Kinder auf der Website — entschieden und umgesetzt

Beim Prüfen des Entwurfs war aufgefallen, dass die Trennung „App für Kinder,
Website für Eltern" nicht trägt: In `src/components/auth/AuthForm.tsx:831`
steht die Schaltfläche „Ich bin Kind" ohne jede Bedingung. Ein Kind kann sich
über lernzeit.app registrieren und anmelden.

**Entscheidung vom 09.09.2026:** Der Anmeldeweg bleibt, wie er ist — er ist
gewollt (siehe Positionierung, Abschnitt 7.1: Kinder probieren die App aus und
bitten danach die Eltern um Verknüpfung). Stattdessen wird die **Messung**
ausgeschlossen.

**Umgesetzt in `src/lib/analytics.ts`:**

| | |
|---|---|
| Wo die Sperre sitzt | In `track()` — der einzigen Funktion, die nach `window.dataLayer` schreibt, und der dataLayer ist der einzige Weg zu GA4 und Google Ads. |
| Wann sie greift | Wenn das Ereignis `role: 'child'` trägt (schon bei der Registrierung, bevor ein Profil existiert) **oder** die angemeldete Person ein Kinderprofil hat. |
| Was bei Unklarheit passiert | Gesperrt. Eine verlorene Conversion kostet Messgenauigkeit; ein gemeldetes Kind kostet eine Zusage. |
| Kontowechsel | Der Merkposten hängt an der Nutzer-ID. Meldet sich nach einem Kind ein Elternteil im selben Browser an, wird neu ermittelt statt fälschlich gesperrt. |
| Nachprüfbar | `node scripts/test-analytics.mjs` — acht Fälle, alle bestanden am 09.09.2026 |

**Warum die Sperre in `track()` sitzt und nicht beim Aufrufer:** Eine Regel,
die an dreißig Aufrufstellen eingehalten werden muss, wird irgendwann
gebrochen — von jemandem, der sie nicht kennt. An einer Stelle, durch die
alles hindurchmuss, kann sie nicht vergessen werden.

**Was bleibt und bewusst bleibt:** Ereignisse von Kindern werden weiterhin in
`analytics_events` (Supabase, EU) geschrieben. Das ist erste Partei — die
Daten verlassen die eigene Infrastruktur nicht. Ohne sie gäbe es keinen
eigenen Funnel-Bericht, weil Verknüpfung und erste Lernsitzung nun einmal auf
der Kinderseite stattfinden. Wenn auch das entfallen soll, ist es eine
Zeile — dann fehlen aber Z5 und Z6 aus der Positionierung.

**Ein Rest bleibt offen und gehört in die anwaltliche Prüfung:** Besucht ein
Kind lernzeit.app, ohne angemeldet zu sein, ist es für die Messung ein
anonymer Besucher wie jeder andere. Technisch lässt sich das nicht
unterscheiden — niemand weiß vor der Anmeldung, wer da liest. Ob das bei einem
Angebot, das sich auch an Kinder richtet, ausreicht, kann ich nicht
beurteilen; es ist Frage 7 in Abschnitt 5.

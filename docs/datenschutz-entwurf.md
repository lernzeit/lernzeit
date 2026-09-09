# Entwurf: Datenschutzerklärung für bezahlte Werbung

**Status: ENTWURF. Nicht veröffentlichen ohne anwaltliche Prüfung.**

Ich bin kein Anwalt und darf keine Rechtsberatung geben. Was hier steht, ist
eine technisch belastbare Vorlage: Sie beschreibt genau das, was die Software
nach der Umstellung tatsächlich tun wird — nicht mehr und nicht weniger. Ein
Anwalt kann daran Formulierungen prüfen; er kann nicht wissen, was der Code
macht. Diese Hälfte liefere ich.

**Bezug:** `src/pages/Datenschutz.tsx`, Stand 08.09.2026, 235 Zeilen.
**Auslöser:** geplante Anzeigen bei Google und Meta für die App.

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
> ab. Auf unserer Website lernzeit.app setzen wir — **nur mit Ihrer
> Einwilligung** — Reichweiten- und Werbemessung ein; Einzelheiten in § 8a.
> Für Kinderkonten findet diese Messung nicht statt: Wählt jemand bei der
> Registrierung „Ich bin Kind" oder ist ein Kinderkonto angemeldet, werden
> keine Daten an Werbeplattformen übermittelt.

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
> Auf unserer Website lernzeit.app verwenden wir darüber hinaus Cookies zur
> Werbemessung — **ausschließlich, wenn Sie darin eingewilligt haben.** Ohne
> Ihre Einwilligung werden keine solchen Cookies gesetzt und keine Daten an
> Google oder Meta übermittelt. Ihre Einwilligung können Sie jederzeit über
> den Link „Cookie-Einstellungen" im Seitenfuß mit Wirkung für die Zukunft
> widerrufen.

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
> Klicken Sie auf eine unserer Anzeigen, hängt an der Adresse unserer Website
> eine Kennung, an der die werbende Plattform den Klick wiedererkennt (bei
> Google `gclid`, `gbraid` oder `wbraid`, bei Meta `fbclid`). Wir speichern
> diese Kennung zusammen mit dem Zeitpunkt, damit wir nachvollziehen können,
> welche Anzeige zu einer Anmeldung geführt hat.
>
> Melden Sie sich anschließend an, übermitteln wir an die betreffende
> Plattform die Information, dass eine Anmeldung stattgefunden hat. Dabei
> übertragen wir Ihre E-Mail-Adresse **niemals im Klartext**, sondern
> ausschließlich als nicht umkehrbaren kryptografischen Hashwert (SHA-256).
> Die Plattform kann damit prüfen, ob es sich um eine ihr bereits bekannte
> Person handelt, sie kann daraus aber nicht auf Ihre E-Mail-Adresse
> zurückschließen.
>
> **Was wir nicht tun:**
>
> - Wir übermitteln keinerlei Daten von Kindern — weder Namen, Klassenstufe,
>   Lernergebnisse noch die Tatsache, dass ein Kinderprofil besteht.
> - Wir bilden keine Zielgruppen aus Kinderdaten.
> - Wir setzen in der App kein Werbe-SDK und keinen Werbe-Identifier ein.
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

**Achtung, diese Zusagen sind technisch bindend.** Die Speicherfristen von 90
Tagen und 13 Monaten stehen bisher **nirgends im Code**. Sie werden mit dem
Aufbau der Attributionstabelle als automatische Löschung umgesetzt. Wird der
Abschnitt veröffentlicht, bevor die Löschung existiert, ist er eine
unzutreffende Angabe. **Reihenfolge: erst Löschjob, dann Veröffentlichung.**

---

## 4. Was zusätzlich gebaut werden muss

Die Datenschutzerklärung beschreibt Verhalten. Dieses Verhalten muss es geben.

| | Muss existieren, bevor § 8a veröffentlicht wird |
|---|---|
| 1 | **Einwilligungsbanner (CMP).** Vor der Einwilligung lädt kein Werbe-Tag. Nicht vorausgewählt, Ablehnen genauso leicht wie Zustimmen. |
| 2 | **Consent Mode v2.** Ohne ihn nimmt Google Conversions aus der EU ohnehin nicht an — das Banner ist also nicht nur Pflicht, sondern Voraussetzung dafür, dass die Messung funktioniert. |
| 3 | **Widerruf im Seitenfuß.** Ein Link „Cookie-Einstellungen", der die Auswahl erneut öffnet. |
| 4 | **Automatische Löschung** nach 90 Tagen beziehungsweise 13 Monaten in der Attributionstabelle. |
| 5 | **Hashing serverseitig.** Die E-Mail wird in der Edge Function zu SHA-256 verarbeitet und verlässt die Datenbank nie im Klartext Richtung Google oder Meta. |
| 6 | **Filter auf Elternkonten.** Eine Conversion wird ausschließlich für `role = 'parent'` gemeldet. Technisch erzwungen, nicht per Konvention. |
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
4. Genügt der SHA-256-Hashwert der E-Mail-Adresse als Maßnahme, oder bleibt
   die Übermittlung auch dann eine Übermittlung personenbezogener Daten mit
   allen Folgepflichten? (Meine Annahme: sie bleibt es — der Hash ist eine
   Schutzmaßnahme, keine Anonymisierung. Der Entwurf ist entsprechend
   formuliert.)
5. Muss das Verzeichnis von Verarbeitungstätigkeiten ergänzt werden, und ist
   eine Datenschutz-Folgenabschätzung nötig, weil das Angebot Kinder betrifft?
6. Sind Auftragsverarbeitungs- beziehungsweise Joint-Controller-Verträge mit
   Google und Meta abzuschließen, und wer schließt sie?
7. Ein Kind kann lernzeit.app besuchen, ohne angemeldet zu sein — für die
   Messung ist es dann ein anonymer Besucher wie jeder andere, weil sich vor
   der Anmeldung technisch niemand unterscheiden lässt. Genügt das bei einem
   Angebot, das sich auch an Kinder richtet? Siehe Abschnitt 7.

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
| Nachprüfbar | `node scripts/test-analytics-audience.mjs` — acht Fälle, alle bestanden am 09.09.2026 |

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

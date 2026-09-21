# Nachlieferung an die Kanzlei — Stand 21.09.2026

Antwort auf die Prüfung vom 21.09.2026. Sie nennen drei Dinge, die Ihnen für
eine veröffentlichungsfertige Gesamtfassung fehlen. Zwei davon stehen hier.
Das dritte gibt es noch nicht, und das sagen wir lieber, als es zu behaupten.

| Was Sie brauchen | Stand |
|---|---|
| Google-Uploadweg samt bereinigtem Beispiel-Payload | **Abschnitt 2.** Noch nicht gebaut — hier steht der beabsichtigte Weg samt Payload, nicht ein laufender. |
| Konkrete Usercentrics-Einbindung | **fehlt.** Es gibt noch kein Konto und damit keine Settings-ID. |
| Bestätigung der geänderten Erfassungs- und Löschregeln | **Abschnitt 1.** Umgesetzt und geprüft. |

Dazu in Abschnitt 3 drei Rückfragen, von denen eine darüber entscheidet, ob
der Google-Weg überhaupt etwas misst.

---

## 1. Erfassungs- und Löschregeln — umgesetzt und geprüft

### 1.1 Keine Werbe-Zwischenablage mehr, auch nicht im Arbeitsspeicher

Ihre Vorgabe aus Punkt 2 ist umgesetzt. Dabei ist ein Fund aufgetreten, der
über den von Ihnen benannten Fall hinausgeht:

Die Klick-Kennung wurde nicht nur im Arbeitsspeicher gehalten. Eine ältere
Funktion legte `gclid` beim **ersten Seitenaufruf im `localStorage`** ab
(Schlüssel `lernzeit_attribution`), zusammen mit den UTM-Parametern, und
schrieb sie anschließend in jedes gespeicherte Ereignis. Das lief bei jedem
Besucher, ohne Einwilligung, und hat den Tab überlebt. Das war uns nicht
bewusst; es stammt nicht aus dem Werbe-Umbau, sondern stand schon vorher im
Code.

Beides ist entfernt. Der Ablauf ist jetzt:

1. Beim Ankommen passiert **nichts** — keine Ablage, kein Merkposten, keine
   Variable.
2. Registriert sich jemand als Elternteil **und** liegt die Einwilligung vor,
   wird in diesem Moment `window.location.search` gelesen.
3. Steht die Kennung dort nicht mehr, ist sie verloren. Es wird nichts
   rekonstruiert.

Die Reihenfolge im Code ist bewusst: erst Rolle und Einwilligung prüfen, dann
die Adresse ansehen. Andersherum hätte die Funktion die Kennung eines Kindes
kurz in der Hand gehabt.

Geprüft durch `npm run test:analytics` (18 Fälle), darunter ausdrücklich:

* „Die Klick-Kennung landet nirgends im Gerätespeicher"
* „Ist die Kennung aus der Adresse verschwunden, wird nichts verbucht"
* „Kinderkonto: nichts gespeichert, auch mit Einwilligung"

Gegengeprüft mit einem absichtlich wieder eingebauten Fehler: Die Prüfung
schlägt dann an, sie ist also nicht wirkungslos.

### 1.2 Meta ist abgeschaltet — auch in der Erhebung

Ihr Punkt 4 ist übernommen. `fbclid` wird nicht mehr aus der Adresse gelesen
und nicht mehr gespeichert. Ein Klick, der **nur** eine Meta-Kennung trägt,
erzeugt überhaupt keine Zeile.

Die Spalten `fbclid`, `fbp` und `fbc` stehen weiter in der Tabelle, bleiben
aber leer — für den Fall, dass die von Ihnen vorbereitete
Erweiterungsvariante später zum Zug kommt.

### 1.3 Löschung — mit einer Korrektur an unserer eigenen Angabe

Am 21.09.2026 in der Produktionsdatenbank nachgesehen:

| | |
|---|---|
| Vorgabewert `ad_attribution.delete_after` | `now() + interval '13 months'` |
| Täglicher Auftrag | `ad-attribution-retention`, Zeitplan `30 3 * * *` |
| Was er tut | `delete from ad_attribution where delete_after < now()` |
| Zeilen derzeit | 0 |

**Korrektur:** Unser Entwurf nannte bis heute „90 Tage beim Anlegen, 13 Monate
ab einer Anmeldung". Die kurze Frist ist am 20.09.2026 entfallen und war im
Text liegen geblieben. Sie galt für Klicks **ohne** Anmeldung — und die
werden seitdem gar nicht mehr gespeichert, weil eine Zeile erst bei der
Eltern-Registrierung entsteht. Es gibt also nur noch eine Frist: 13 Monate.
Der Entwurf ist entsprechend geändert.

**Rückfrage dazu in Abschnitt 3.3:** Ihr Schreiben spricht von „den
vorgeschlagenen höchstens 30 Tagen eigener Attributionsspeicherung". Diese
Zahl finden wir bei uns nirgends — weder im Text noch in der Datenbank.

---

## 2. Der Google-Uploadweg

**Vorab, damit hier keine Bestätigung entsteht, die es nicht gibt: Dieser Weg
ist nicht gebaut.** Es gibt keine Verbindung zu Google, keine Zugangsdaten,
kein Konto, keinen einzigen übermittelten Datensatz. Was folgt, ist der
beabsichtigte Weg — damit Sie ihn prüfen können, *bevor* er entsteht.

### 2.1 Aufbau

Kein Google-Skript im Browser. Kein Tag, kein Pixel, kein Consent Mode v2 —
weil es nichts gibt, dem ein Zustimmungssignal mitgeteilt werden müsste.

Die Übermittlung läuft serverseitig, geplant über die Data Manager API
(`developers.google.com/data-manager`, von Ihnen verlinkt), aus einer
Supabase Edge Function in der EU-Region. Ausgelöst wird sie zeitgesteuert,
nicht durch eine Nutzerhandlung: Ein täglicher Auftrag liest die Zeilen, bei
denen `converted_at` gesetzt und `reported_at` leer ist, meldet sie und setzt
`reported_at`.

### 2.2 Was übermittelt würde

| Feld | Herkunft | Anmerkung |
|---|---|---|
| Klick-Kennung (`gclid`, `gbraid` oder `wbraid`) | Adresszeile im Moment der Einwilligung | genau eine davon, nie mehrere |
| Zeitpunkt der Conversion | `ad_attribution.converted_at` | Ihr Punkt 3 |
| Conversion-Aktion | fester Wert der Kampagne | technische Angabe, kein Personenbezug |
| Einwilligungsstatus | Feld `consent` der API | tritt an die Stelle von Consent Mode v2 |

Nicht übermittelt: E-Mail-Adresse, auch nicht als Hashwert. Keine
Telefonnummer, kein Name, keine Adresse. Keine Nutzer-ID aus unserem System.
Kein Betrag. Kein User-Agent, keine Ereignis-URL, keine IP-Adresse.

### 2.3 Bereinigter Beispiel-Payload

Erfundene Werte, Aufbau wie beabsichtigt:

```json
{
  "destinations": [
    { "operatingAccount": { "product": "GOOGLE_ADS", "accountId": "<Kundennummer>" } }
  ],
  "events": [
    {
      "destinationReferences": ["lernzeit_registrierung_eltern"],
      "transactionId": "3f7c1e90-0000-4000-8000-000000000001",
      "eventTimestamp": "2026-09-21T09:14:22Z",
      "lastUpdatedTimestamp": "2026-09-21T09:14:22Z",
      "adIdentifiers": { "gclid": "Cj0KCQjw_BEISPIEL_NICHT_ECHT" },
      "consent": { "adUserData": "CONSENT_GRANTED", "adPersonalization": "CONSENT_DENIED" },
      "userData": null
    }
  ]
}
```

`userData` steht ausdrücklich auf `null`: Das ist das Feld, in dem bei
Enhanced Conversions die gehashten Kundendaten stünden. Die von Ihnen in
Punkt 3 gezogene Trennung ist damit im Aufbau sichtbar, nicht nur in der
Absicht.

`transactionId` ist die ID unserer eigenen Zeile in `ad_attribution`. Sie
dient der Doppelmeldungs-Sperre und lässt bei Google keinen Rückschluss auf
eine Person zu.

### 2.4 Was vor der ersten Übermittlung steht

Nichts davon läuft, bevor Sie es freigegeben haben. Konkret fehlen: das
Google-Konto samt Auftragsverarbeitung, die CMP, und Ihre Bestätigung zu
diesem Payload.

---

## 3. Rückfragen

### 3.1 Darf die Kennung in der Adresse mitwandern? (entscheidend)

Ihre Vorgabe lautet, nach der Zustimmung „die noch vorhandene Kennung aus der
aktuellen Browseradresse" zu übernehmen. Bei uns ist sie zu diesem Zeitpunkt
regelmäßig **nicht mehr vorhanden**, und zwar aus einem rein technischen
Grund:

* Die Anzeige führt auf `lernzeit.app/start?gclid=…`
* Die Registrierung liegt auf `/`
* Unser eigener Verweis `/auth` leitet per Weiterleitung auf `/?auth=true` um
  und lässt die Abfrage dabei fallen

Damit misst der Weg in der Praxis nichts — nicht wenig, sondern nichts.

**Frage:** Dürfen wir die Kennung bei diesen Wechseln **in der Adresszeile**
mitführen, sodass sie im Moment der Einwilligung noch dort steht? Sie bliebe
durchgehend Teil der Adresse; eine eigene Ablage entstünde nicht, und der
Nutzer sähe sie die ganze Zeit.

Falls nein, ist der Google-Weg aus unserer Sicht nicht wirtschaftlich
sinnvoll, und wir würden ihn nicht weiterverfolgen. Das wäre eine
akzeptable Antwort — wir brauchen nur die Klarheit vor dem Aufwand.

### 3.2 Gelten dieselben Maßstäbe für UTM-Parameter und unsere eigene Kennung?

Zwei Dinge liegen weiterhin im `localStorage`, beide ohne Einwilligung:

* die UTM-Parameter samt `referrer` (Schlüssel `lernzeit_attribution`)
* eine selbst erzeugte Zufallskennung für unsere eigene Auswertung
  (`lernzeit_anonymous_id`), die weder an Google noch an sonst jemanden geht

Wir haben beides bewusst nicht angefasst, weil Ihre Vorgabe die Klick-Kennung
betrifft und wir nicht über Ihr Mandat hinaus entscheiden wollten.

**Frage:** Fällt eines von beiden ebenfalls unter § 25 TDDDG, sodass es vor
der Einwilligung zu unterbleiben hat?

### 3.3 Woher kommen die 30 Tage?

Ihr Schreiben nennt „die vorgeschlagenen höchstens 30 Tage eigene
Attributionsspeicherung". Diese Zahl steht bei uns nirgends: Der Entwurf
nannte 90 Tage und 13 Monate, die Datenbank sagt 13 Monate. 30 Tage ist bei
uns die Dauer der kostenlosen Testphase — möglicherweise eine Verwechslung.

**Frage:** Welche Frist sollen wir setzen? Wir ändern den Vorgabewert der
Spalte auf die Zahl, die Sie nennen; Text und Datenbank müssen dieselbe
Zahl tragen.

---

## 4. Was wir von Ihnen noch brauchen

Die drei Dateien aus Ihrer Nachricht liegen auf dem Rechner des Auftraggebers
(`C:/Users/tbroe/Downloads/Datenschutz/`) und sind hier nicht lesbar.
Gebraucht werden daraus vor allem:

* der **Formulartext für die Einwilligung** im Eltern-Formular — wir setzen
  keine selbst geschriebene Einwilligungsformulierung ein
* die **Ersatzformulierungen** einschließlich § 8a für die
  Datenschutzerklärung
* die **Usercentrics-Vorgaben**, sobald das Konto besteht

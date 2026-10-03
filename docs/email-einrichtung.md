# E-Mail-Versand über OneSignal einrichten (Übergabe an eine Browser-Sitzung)

Stand 03.10.2026. Entscheidungen des Betreibers:

- Versand über **OneSignal** (dieselbe App wie Push), Absender-Domain **`post.lernzeit.app`**
- Absender: **LernZeit `<hallo@post.lernzeit.app>`**, Antworten an **`info@lernzeit.app`**

> **Planänderung 03.10.2026:** Zuerst war `mail.lernzeit.app` vorgesehen. Die alten
> OneSignal-DKIM-Einträge darunter gehören bei IONOS zu einem verknüpften
> „Third Party Service“ – zusammen mit den A-Einträgen `@` und `www` der Website. Sie
> lassen sich nicht löschen, und beim Ändern deaktiviert IONOS den ganzen Service samt
> Website. Deshalb eine neue, unbelastete Subdomain **`post`**. Unter `mail` bleibt alles,
> wie es ist (Ausnahme: die bereits gelöschten Lovable-NS- und Resend/SES-Einträge).
- Nur **Service-Mails** (Hilfe beim Einrichten, Testphase endet bald) – keine Werbung,
  keine Feedback-Anfragen per Mail

Diese Datei ist der Auftrag für eine Claude-Sitzung mit Browser (Claude Desktop). Die
Cloud-Sitzung, die den Versand programmiert, hat keinen Browser und kommt nicht an IONOS.

## Regeln für die Browser-Sitzung

1. **Vor jedem Speichern** (OneSignal und IONOS) dem Betreiber zeigen, was eingetragen
   wird, und auf seine Bestätigung warten.
2. In OneSignal **nur** den Bereich E-Mail anfassen. Push, iOS/APNs, Android/FCM,
   Segmente, Nachrichten, Abrechnung: nicht ändern.
3. Bei IONOS **keinen bestehenden Eintrag für `lernzeit.app` selbst ändern oder löschen**
   (A, AAAA, MX, TXT/SPF, `_lovable`, `www`) und **nichts an einem verknüpften
   „Third Party Service“ ändern** – IONOS deaktiviert sonst die ganze Gruppe samt Website – sie tragen Website und Postfach; ein Fehler
   dort legt beides lahm. Ausnahmen, jeweils erst nach Bestätigung des Betreibers:
   die Altlasten unter `mail.lernzeit.app` (Schritt 0) und der DMARC-Eintrag (Schritt 2.3).
4. Keine Schlüssel, Passwörter oder API-Keys in den Chat kopieren oder irgendwo notieren.
5. Nichts kaufen, keinen Tarif ändern.

## Schritt 0 – Altlasten unter `mail.lernzeit.app` entfernen (IONOS)

Befund 03.10.2026 (Lovable selbst und eigene Prüfung): `mail.lernzeit.app` ist per
**NS-Einträgen an Lovables Nameserver delegiert** (`ns3.lovable.cloud`, `ns4.lovable.cloud`).
Die Mail-Einrichtung von Lovable dahinter ist abgelaufen und wird nicht genutzt; die
Login-Mails laufen über IONOS-SMTP von `noreply@lernzeit.app` und sind davon nicht
betroffen. Solange die Delegation steht, kann OneSignal die Subdomain nicht prüfen.

1. ionos.de → Domains & SSL → **lernzeit.app** → **DNS**.
2. Alle Einträge auflisten, deren Name `mail` ist oder auf `.mail` endet (NS, CNAME, TXT,
   MX – auch alte Resend-, SES- oder OneSignal-Einträge aus dem März). Liste dem Betreiber
   zeigen.
3. Nach seiner Bestätigung **nur diese Einträge** löschen. Nichts anderes.
4. Ist `mail.lernzeit.app` bei IONOS als eigene Subdomain mit eigener DNS-Verwaltung
   angelegt, dort entsprechend vorgehen.

## Schritt 1 – OneSignal

1. dashboard.onesignal.com → App **LernZeit** (App-ID `84cb5453-b878-47ca-aa31-1ec1405bdd5d`)
   → **Settings** → **Email** (je nach Oberfläche auch unter „Platforms“ oder „Channels“).
2. E-Mail einrichten mit dem **eingebauten Versand von OneSignal** (nicht Mailgun,
   SendGrid o. Ä.).
3. Sending domain: `post.lernzeit.app` (falls `mail.lernzeit.app` dort schon angelegt ist: entfernen oder ungenutzt lassen)
4. Default from name: `LernZeit` · from address: `hallo@post.lernzeit.app` ·
   reply-to: `info@lernzeit.app`
5. OneSignal zeigt danach die nötigen DNS-Einträge (typisch: TXT für SPF, CNAME für DKIM,
   MX für Rückläufer, evtl. CNAME für Link-Tracking). Die Liste vollständig abschreiben
   (Typ, Name/Host, Wert) – sie wird in Schritt 2 gebraucht.

## Schritt 2 – IONOS

1. ionos.de → Domains & SSL → **lernzeit.app** → **DNS**.
2. Für jeden Eintrag aus Schritt 1: **Eintrag hinzufügen** → Typ wählen → bei
   Hostname **nur den Teil vor `.lernzeit.app`** eintragen (IONOS hängt die Domain selbst
   an; aus `os1._domainkey.post.lernzeit.app` wird `os1._domainkey.post`) → Wert exakt
   übernehmen → TTL Standard → speichern.
3. **DMARC:** Der TXT-Eintrag `_dmarc.lernzeit.app` schickt die Berichte heute an
   `dmarcreports@lovable.dev`. Nach Bestätigung des Betreibers **nur die Berichtsadresse**
   ändern: `rua=mailto:info@lernzeit.app`; alle anderen Teile (z. B. `p=`) unverändert lassen.
   Gibt es keinen Eintrag, anlegen: Host `_dmarc`, Wert
   `v=DMARC1; p=none; rua=mailto:info@lernzeit.app`.
4. Zeigt IONOS einen Konflikt (Eintrag existiert schon mit anderem Wert): nicht
   überschreiben, dem Betreiber melden.

## Schritt 3 – Prüfen und zurückmelden

1. In OneSignal „Verify“ bzw. „Check DNS“ auslösen. DNS kann Minuten bis Stunden brauchen;
   nicht wiederholt neu anlegen.
2. Dem Betreiber eine kurze Liste geben: welche Einträge angelegt wurden (Typ, Host, Wert
   gekürzt), was OneSignal als bestätigt anzeigt, was noch fehlt, und ob es schon einen
   DMARC-Eintrag gab.
3. Der Betreiber gibt „fertig“ an die Cloud-Sitzung weiter; die prüft über den
   OneSignal-Connector (`get_email_domains`) und baut den Versand fertig.

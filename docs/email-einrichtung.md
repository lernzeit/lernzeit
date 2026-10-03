# E-Mail-Versand über OneSignal einrichten (Übergabe an eine Browser-Sitzung)

Stand 03.10.2026. Entscheidungen des Betreibers:

- Versand über **OneSignal** (dieselbe App wie Push), Absender-Domain **`mail.lernzeit.app`**
- Absender: **LernZeit `<hallo@mail.lernzeit.app>`**, Antworten an **`info@lernzeit.app`**
- Nur **Service-Mails** (Hilfe beim Einrichten, Testphase endet bald) – keine Werbung,
  keine Feedback-Anfragen per Mail

Diese Datei ist der Auftrag für eine Claude-Sitzung mit Browser (Claude Desktop). Die
Cloud-Sitzung, die den Versand programmiert, hat keinen Browser und kommt nicht an IONOS.

## Regeln für die Browser-Sitzung

1. **Vor jedem Speichern** (OneSignal und IONOS) dem Betreiber zeigen, was eingetragen
   wird, und auf seine Bestätigung warten.
2. In OneSignal **nur** den Bereich E-Mail anfassen. Push, iOS/APNs, Android/FCM,
   Segmente, Nachrichten, Abrechnung: nicht ändern.
3. Bei IONOS **keinen bestehenden Eintrag ändern oder löschen** – nur neue Einträge für
   `mail.lernzeit.app` anlegen. Einträge für `lernzeit.app` selbst (A, AAAA, MX, TXT/SPF,
   `www`) tragen Website und Postfach; ein Fehler dort legt beides lahm.
   Einzige Ausnahme: DMARC, siehe unten.
4. Keine Schlüssel, Passwörter oder API-Keys in den Chat kopieren oder irgendwo notieren.
5. Nichts kaufen, keinen Tarif ändern.

## Schritt 1 – OneSignal

1. dashboard.onesignal.com → App **LernZeit** (App-ID `84cb5453-b878-47ca-aa31-1ec1405bdd5d`)
   → **Settings** → **Email** (je nach Oberfläche auch unter „Platforms“ oder „Channels“).
2. E-Mail einrichten mit dem **eingebauten Versand von OneSignal** (nicht Mailgun,
   SendGrid o. Ä.).
3. Sending domain: `mail.lernzeit.app`
4. Default from name: `LernZeit` · from address: `hallo@mail.lernzeit.app` ·
   reply-to: `info@lernzeit.app`
5. OneSignal zeigt danach die nötigen DNS-Einträge (typisch: TXT für SPF, CNAME für DKIM,
   MX für Rückläufer, evtl. CNAME für Link-Tracking). Die Liste vollständig abschreiben
   (Typ, Name/Host, Wert) – sie wird in Schritt 2 gebraucht.

## Schritt 2 – IONOS

1. ionos.de → Domains & SSL → **lernzeit.app** → **DNS**.
2. Für jeden Eintrag aus Schritt 1: **Eintrag hinzufügen** → Typ wählen → bei
   Hostname **nur den Teil vor `.lernzeit.app`** eintragen (IONOS hängt die Domain selbst
   an; aus `s1._domainkey.mail.lernzeit.app` wird `s1._domainkey.mail`) → Wert exakt
   übernehmen → TTL Standard → speichern.
3. **DMARC:** Gibt es für `_dmarc.lernzeit.app` noch keinen TXT-Eintrag, einen anlegen:
   Host `_dmarc`, Wert `v=DMARC1; p=none; rua=mailto:info@lernzeit.app`.
   Gibt es schon einen: **nicht ändern**, nur notieren, was drinsteht.
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

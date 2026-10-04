# Testdaten Lernplan aus Fotos

Künstlich erzeugte Seiten (keine echten Schülerdaten; „Lena Müller“ und
„Fr. Schneider“ sind erfunden), um die Bildauswertung zu prüfen:

- `lernstoff-heft-mathe.jpg` – Heftseite Klasse 6, Brüche addieren, mit Name,
  Datum und Lehrer-Bemerkung (die Auswertung darf sie NICHT übernehmen)
- `lernstoff-buch-englisch.jpg` – Buchseite Englisch, Vokabeln und Grammatik

Die Schrift auf der Heftseite ist eine Handschrift-Schriftart, also leichter
lesbar als echte Kinderschrift. Echte Fotos vor dem Start zusätzlich testen.

Prüfzugang (nur Service-Rolle, speichert nichts): `generate-learning-plan`
mit `{ "fotoUrls": [...], "fach": "...", "klasse": 6 }`, z. B. per `pg_net`
mit dem Schlüssel aus `vault.decrypted_secrets` (`service_role_key`).

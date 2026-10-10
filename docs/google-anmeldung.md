# Anmeldung mit Google direkt bei Google (06.10.2026)

Bisher lief „Mit Google“ über Supabase. Google zeigte dabei „Weiter zu
fsmgynpdfxkaiiuguqyr.supabase.co“, und seit dem 29.09. kam aus den Apps keine einzige
Google-Anmeldung durch. Neu meldet sich der Nutzer direkt bei Google an. Google zeigt
dann „lernzeit.app“ (Website) bzw. „LernZeit“ (Apps), und Supabase bekommt nur noch
Googles ID-Token.

Code: `src/services/googleAnmeldung.ts`, `public/google-rueckkehr.html`,
Schalter in `src/config/google.ts`. Solange ein Schalter aus ist, gilt auf der
jeweiligen Plattform der bisherige Weg. Im Facebook- und Instagram-Browser lässt Google
gar keine Anmeldung zu; dort steht statt des Knopfs ein Hinweis (gilt sofort).

## Einstellungen im Browser (Betreiber oder Claude im Browser)

Alles im Google-Cloud-Projekt, zu dem der Web-Client
`249121461672-1jjba17n9sagviqjani0jj3h4cj94jef.apps.googleusercontent.com` gehört.
Bestehende Einträge nicht löschen.

1. **Web-Client ergänzen** – Google Cloud Console → APIs & Dienste → Anmeldedaten →
   OAuth-2.0-Client-IDs → diesen Web-Client öffnen:
   - Autorisierte JavaScript-Quellen: `https://lernzeit.app` und `https://www.lernzeit.app`
   - Autorisierte Weiterleitungs-URIs: `https://lernzeit.app/google-rueckkehr.html` und
     `https://www.lernzeit.app/google-rueckkehr.html`
     (die vorhandene `https://fsmgynpdfxkaiiuguqyr.supabase.co/auth/v1/callback` bleibt)
   - Speichern.
2. **Branding prüfen** – Google Auth Platform → Branding: App-Name „LernZeit“, Logo,
   Startseite `https://lernzeit.app`, Datenschutz `https://lernzeit.app/datenschutz`,
   Nutzungsbedingungen `https://lernzeit.app/nutzungsbedingungen`, autorisierte Domain
   `lernzeit.app` (zusätzlich zu `supabase.co`).
3. **Zielgruppe** – Google Auth Platform → Zielgruppe: Status „In Produktion“. Bei „Test“
   kommen nur eingetragene Testnutzer durch.
4. **iOS-Client anlegen** – Anmeldedaten → Anmeldedaten erstellen → OAuth-Client-ID →
   Typ „iOS“: Bundle-ID `de.lernzeit.app`, App-Store-ID `6789603688`, Team-ID aus dem
   Apple-Developer-Konto. Die neue Client-ID notieren.
5. **Android-Clients anlegen** – je ein OAuth-Client vom Typ „Android“ mit Paketname
   `de.lernzeit.app` und dem SHA-1-Fingerabdruck aus der Play Console → Testen und
   veröffentlichen → App-Integrität:
   - „Zertifikat des App-Signaturschlüssels“ (für Installationen aus dem Play Store)
   - „Zertifikat des Uploadschlüssels“ (für eigene Testbuilds aus Android Studio)
6. **Supabase** – Dashboard → Authentication → Sign In / Providers → Google → Feld
   „Client IDs“: Web-Client-ID und die neue iOS-Client-ID, mit Komma getrennt.
   „Skip nonce checks“ bleibt aus. Client Secret nicht ändern.
7. **Prüfen, dass die Rücksprungseite live ist**: `https://lernzeit.app/google-rueckkehr.html`
   aufrufen. Erwartet: kurz „Einen Moment …“, dann die Anmeldeseite.

## Stand prüfen

`bash scripts/pruefe-google-rueckkehr.sh` – fragt Google ohne Anmeldung, ob die
Rücksprungadressen aus Schritt 1 eingetragen sind (seit 10.10.2026: ja, Website umgestellt).

Stand 10.10.2026: Schritt 1 erledigt, iOS-Client `249121461672-okt1ljt5guu46pr5hlv8seveue1ffena`
angelegt und im Code eingetragen (wirkt ab dem nächsten iOS-Build). Offen: Schritt 3
(Google meldete noch „auf Testnutzer beschränkt“), 5 (Android) und die Prüfung von 6.

## Danach (Claude im Code)

- Nach 1, 3 und 7: `GOOGLE_WEB_BEREIT = true` → Website nutzt den direkten Weg.
- Nach 4 und 6: `GOOGLE_IOS_CLIENT_ID = '<iOS-Client-ID>'` → nächster iOS-Build
  (codemagic.yaml trägt das URL-Schema automatisch ein).
- Nach 5: `GOOGLE_ANDROID_BEREIT = true` → nächster Android-Build (`git pull`,
  `npm install`, `npm run build`, `npx cap sync android`).

Google übernimmt Änderungen an Clients teils erst nach einigen Minuten, bei Android
manchmal nach Stunden.

## Fehlersuche

- Website, „redirect_uri_mismatch“: Schritt 1 fehlt oder ist nicht gespeichert.
- iOS/Android, Supabase meldet „audience“/„Unacceptable audience“: Schritt 6 fehlt.
- Android „[28444] Developer console is not set up correctly“: SHA-1 aus Schritt 5
  passt nicht zum installierten Build.
- Supabase-Protokoll: `grant_type=id_token` mit `provider=google`.

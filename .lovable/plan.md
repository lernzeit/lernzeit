

## Sicherheitsverbesserungen: CSP + DSGVO-Consent-Flow

### Übersicht

Drei Änderungen: Meta-CSP-Tag, E-Mail-Bestätigungsprüfung vor Code-Generierung, und Consent-Checkbox mit Datenbankprotokollierung.

### 1. `index.html` — Meta-CSP-Tag

Ein `<meta http-equiv="Content-Security-Policy">` Tag im `<head>` hinzufügen mit allen benötigten Quellen (Supabase, Google OAuth, Lovable AI Gateway).

### 2. Datenbank — Consent-Spalte

Migration: Neue Spalte `consent_given_at` (timestamp, nullable) zur Tabelle `invitation_codes` hinzufügen. Speichert den genauen Zeitpunkt der DSGVO-Einwilligung bei Code-Generierung.

### 3. `ParentDashboard.tsx` und `ParentSettingsMenu.tsx` — Consent-Flow

Beide Dateien haben identische Code-Generierungs-UIs. Änderungen:

- **E-Mail-Bestätigungsprüfung**: Vor der Code-Generierung wird über `supabase.auth.getUser()` geprüft, ob `email_confirmed_at` gesetzt ist. Falls nicht, wird eine Fehlermeldung angezeigt: "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse."
- **Consent-Checkbox**: Eine Pflicht-Checkbox mit dem Text: *"Ich stimme den [Nutzungsbedingungen](/nutzungsbedingungen) zu und erteile als Erziehungsberechtigte/r die Einwilligung zur Datenverarbeitung für mein Kind gemäß Art. 8 DSGVO ([Datenschutzerklärung](/datenschutz))."*
- **Button-Sperre**: Der "Code erstellen"-Button ist deaktiviert, solange die Checkbox nicht angehakt ist.
- **Zeitstempel speichern**: `handleGenerateCode` übergibt den Consent-Zeitstempel an `generateInvitationCode`.

### 4. `useFamilyLinking.ts` — Consent-Zeitstempel speichern

`generateInvitationCode` erhält einen optionalen Parameter `consentGivenAt`. Beim Insert in `invitation_codes` wird `consent_given_at` mitgespeichert.

### Betroffene Dateien
- `index.html` — Meta-CSP
- `src/components/ParentDashboard.tsx` — Checkbox + E-Mail-Check
- `src/components/ParentSettingsMenu.tsx` — Checkbox + E-Mail-Check
- `src/hooks/useFamilyLinking.ts` — consent_given_at Parameter
- Neue Migration — `consent_given_at` Spalte


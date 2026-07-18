# E2E-Tests: Auth & Onboarding

Diese Suite deckt den kompletten Registrierungs- und Login-Flow ab:

- Empfehlungslink (`/start?ref=CODE`) — URL-Erkennung, Prefill, localStorage-Cache
- Signup-UI — OAuth-Buttons (Google/Apple) oberhalb des E-Mail-Formulars, Divider
- Rollen-abhängige Sichtbarkeit — Empfehlungs-Code + Einladungs-Banner nur bei Rolle "Elternteil"
- Kind-Konto ohne E-Mail (Username-Flow)
- Login bestehender Testnutzer (Elternteil per E-Mail, Kind per Username)
- Datenbank-Synchronisation via Supabase-JS (Profile-Rolle, Klassenstufe, referral_codes)
- Fehlermeldungen auf Deutsch (falsche Zugangsdaten)

## Voraussetzungen

- Vite-Dev-Server läuft auf `http://localhost:8080` (im Lovable-Sandbox bereits automatisch).
- Test-Accounts existieren in Supabase:
  - Elternteil: `apple.review.parent@lernzeit.app` / `AppleReview!2026`
  - Kind (Username-Login): `applereviewkind` / `AppleReview!2026`

## Ausführen

```bash
bunx playwright test
# einzelne Suite:
bunx playwright test e2e/auth-flow.spec.ts
# im UI-Modus (lokal):
bunx playwright test --ui
```

Die Tests verwenden ausschließlich bereits existierende Nutzer und erstellen
keine neuen Konten, damit die Produktions-Datenbank sauber bleibt.
Der Signup-Flow wird auf UI-Ebene (ohne finales Submit) validiert.
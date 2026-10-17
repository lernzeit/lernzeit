-- Alter Tester-Code aus der Testphase (Mai 2026) deaktiviert (17.10.2026, Apple 2.5.19):
-- Er schaltete über das Feld „Empfehlungs-Code“ unsichtbar „Familie der ersten
-- Stunde“ und 3 Monate Premium ohne Kauf frei. Nie benutzt (uses = 0).
update public.tester_codes set is_active = false where code = 'LERNZEIT2026';

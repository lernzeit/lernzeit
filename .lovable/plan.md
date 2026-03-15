

## Account-Löschung implementieren

### Übersicht
Eine "Account löschen"-Funktion mit doppelter Bestätigung wird an zwei Stellen eingefügt:
- **Eltern**: Im `ParentDashboard` unter dem Tab "Konto", nach der Passwort-Änderung
- **Kinder**: Im `ChildSettingsMenu` unter "Mein Profil", nach den Profilinformationen

### Technische Umsetzung

**1. Edge Function `delete-account/index.ts`**
- Authentifiziert den User via JWT
- Prüft ob ein aktives Stripe-Abo existiert und gibt ggf. Fehler zurück ("Bitte kündige zuerst dein Abo")
- Löscht folgende Daten (via service_role client):
  - `parent_child_relationships` (parent_id OR child_id)
  - `child_settings` (parent_id OR child_id)
  - `child_subject_visibility` (parent_id OR child_id)
  - `invitation_codes` (parent_id)
  - `screen_time_requests` (child_id OR parent_id)
  - `daily_request_summary` (user_id)
  - `game_sessions` (user_id)
  - `learning_sessions` (user_id)
  - `learning_plans` (parent_id OR child_id)
  - `user_achievements` (user_id)
  - `user_difficulty_profiles` (user_id)
  - `user_earned_minutes` (user_id)
  - `daily_challenges` (user_id)
  - `review_queue` (user_id)
  - `subscriptions` (user_id)
  - `profiles` (id)
  - `user_roles` (user_id)
- **Behält**: `question_feedback` (wichtig für App-Verbesserung)
- Löscht zuletzt den Auth-User via `supabase.auth.admin.deleteUser(userId)`
- Config: `verify_jwt = false` in config.toml, manuelle JWT-Validierung

**2. Shared `AccountDeleteSection` Komponente**
- Zeigt einen roten "Account löschen" Button
- Erster Klick: AlertDialog mit Warnung + Premium-Hinweis (falls `isPremium`)
- Zweiter Klick: Textfeld zur Eingabe von "LÖSCHEN" als Bestätigung
- Ruft `supabase.functions.invoke('delete-account')` auf
- Nach Erfolg: Sign-out und Redirect

**3. Integration**
- `ParentDashboard.tsx`: Neue Card nach "Passwort ändern" im Tab "account"
- `ChildSettingsMenu.tsx`: Neue Card nach den Profilinformationen im Abschnitt "profile"

### Zu löschende/erstellende Dateien
- `supabase/functions/delete-account/index.ts` (neu)
- `supabase/config.toml` (Eintrag ergänzen)
- `src/components/AccountDeleteSection.tsx` (neu)
- `src/components/ParentDashboard.tsx` (erweitern)
- `src/components/ChildSettingsMenu.tsx` (erweitern)


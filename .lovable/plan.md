

## Plan: Kinder-Registrierung ohne E-Mail (Benutzername + Passwort + Code)

### Zusammenfassung

Kinder konnen sich mit einem selbst gewahlten **Benutzernamen**, einem **Passwort** und dem **Einladungscode** der Eltern registrieren. Im Hintergrund wird eine Pseudo-E-Mail generiert (z.B. `max2015@lernzeit.internal`). Beim Login gibt das Kind seinen Benutzernamen + Passwort ein.

### Ablauf

```text
Registrierung (Kind ohne E-Mail):
┌──────────────────────────────────┐
│ 1. Kind wahlt "Ohne E-Mail"     │
│ 2. Benutzername eingeben         │
│ 3. Passwort eingeben             │
│ 4. Einladungscode eingeben       │
│ 5. Klassenstufe wahlen           │
│ 6. → Pseudo-E-Mail generiert     │
│ 7. → supabase.auth.signUp(...)   │
│ 8. → claim_invitation_code(...)  │
│ 9. → Direkt eingeloggt (kein     │
│      E-Mail-Bestatigung notig)   │
└──────────────────────────────────┘

Login (Kind mit Benutzername):
┌──────────────────────────────────┐
│ 1. Benutzername eingeben         │
│ 2. Passwort eingeben             │
│ 3. → Lookup: username → email    │
│ 4. → signInWithPassword(email)   │
└──────────────────────────────────┘
```

### Technische Details

#### 1. Datenbank: `username`-Spalte in `profiles` hinzufugen

Migration:
- `ALTER TABLE profiles ADD COLUMN username text UNIQUE`
- Index auf `username` fur schnelle Lookups
- Neue DB-Funktion `get_email_by_username(p_username text)` als `SECURITY DEFINER` die die Pseudo-E-Mail aus `auth.users` anhand des username-Lookups zuruckgibt (wird vom Login benotigt)
- RLS-Policy: Offentlicher SELECT auf `username`-Spalte fur Login-Lookup

#### 2. Supabase Auth: E-Mail-Bestatigung umgehen

Das Kind registriert sich mit einer generierten Pseudo-E-Mail (`{username}_{random}@lernzeit.internal`). Da diese E-Mail nicht erreichbar ist, muss die E-Mail-Bestatigung umgangen werden:
- Option A: `autoconfirm` per Supabase-Einstellung (betrifft ALLE Nutzer)
- Option B: Edge Function die nach Signup den User uber Service Role bestatigt
- **Empfehlung: Option B** -- eine neue Edge Function `confirm-child-account` die mit dem Service Role Key den User bestatigt, nur wenn die E-Mail auf `@lernzeit.internal` endet

#### 3. AuthForm.tsx: Kinder-Registrierung erweitern

- Wenn `role === 'child'`: Toggle-Button "Ohne E-Mail registrieren" / "Mit E-Mail registrieren"
- Ohne-E-Mail-Modus zeigt:
  - Benutzername-Feld (alphanumerisch, 3-20 Zeichen, Eindeutigkeit prufen)
  - Passwort-Feld
  - Einladungscode-Feld (6-stellig, Pflicht)
  - Klassenstufe-Auswahl
- Bei Submit:
  1. Benutzername-Verfugbarkeit prufen (`profiles` WHERE `username = ...`)
  2. Pseudo-E-Mail generieren: `{username}_{4-char-random}@lernzeit.internal`
  3. `signUp()` mit Pseudo-E-Mail, Passwort, metadata `{name, role: 'child', grade, username}`
  4. Edge Function `confirm-child-account` aufrufen (bestatigt die E-Mail automatisch)
  5. `claim_invitation_code()` aufrufen (verknupft mit Eltern)
  6. Direkt eingeloggt -- kein Umweg uber E-Mail-Bestatigung

#### 4. AuthForm.tsx: Login mit Benutzername

- Im Login-Tab: Erkennung ob Eingabe ein Benutzername oder eine E-Mail ist (enthalt `@` → E-Mail, sonst → Benutzername)
- Bei Benutzername: RPC `get_email_by_username(username)` aufrufen, dann `signInWithPassword(email, password)`
- Label andern: "E-Mail oder Benutzername"

#### 5. Edge Function: `confirm-child-account`

- Nimmt `user_id` entgegen
- Pruft ob die E-Mail auf `@lernzeit.internal` endet
- Bestatigt den User uber Supabase Admin API (`auth.admin.updateUserById(id, { email_confirm: true })`)
- Nur aufrufbar mit gultigem Auth-Token

#### 6. `handle_new_user` Trigger anpassen

- Speichert `username` aus `raw_user_meta_data` in `profiles.username`

#### 7. Profil/Einstellungen: Benutzername anzeigen

- Im Kinderprofil den Benutzernamen anzeigen ("Dein Benutzername: max2015")
- Hinweis: "Merke dir deinen Benutzernamen fur die Anmeldung"

### Dateien die geandert/erstellt werden

| Datei | Anderung |
|---|---|
| Migration (SQL) | `username`-Spalte, Index, `get_email_by_username` RPC, Trigger-Update |
| `supabase/functions/confirm-child-account/index.ts` | Neue Edge Function |
| `src/components/auth/AuthForm.tsx` | Ohne-E-Mail-Registrierung + Benutzername-Login |
| `src/components/auth/UserProfile.tsx` | Benutzername im Profil anzeigen |
| `src/components/ProfileEdit.tsx` | Benutzername anzeigen (read-only) |

### Sicherheit

- Benutzernamen sind offentlich sichtbar (nur fur Login-Lookup), keine sensiblen Daten
- Pseudo-E-Mail-Domain `@lernzeit.internal` wird nie fur echten E-Mail-Versand genutzt
- `confirm-child-account` validiert die Domain vor der Bestatigung
- Einladungscode wird bei Registrierung validiert -- ohne gultigen Code kein Konto


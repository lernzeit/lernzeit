## Phasenplan: Tester-Belohnung + Empfehlungsprogramm

Umsetzung in 3 Phasen, Maximalkosten gedeckelt bei **6 Monaten Premium pro Werber** (≈ 9 €).

---

### Phase 1 — Tester-Belohnung & „LernZeit-Familie"-Badge

**Datenmodell**

- `profiles`: Spalten `is_founding_family boolean default false`, `founding_family_at timestamptz`.
- `premium_grants` (neue Tabelle): `id, user_id, months int, reason text, created_at, source_ref uuid`. RLS: User SELECT own, service_role ALL. Grund-Werte: `signup_trial`, `tester_feedback`, `referral_referee`, `referral_active`, `referral_paying`, `milestone_3`, `milestone_5`.
- `tester_codes` (neue Tabelle): `code text PK`, `is_active boolean`, `max_uses int`, `uses int`, `created_at`. Seed: `LERNZEIT2026`.

**Signup-Flow erweitern**

- `AuthForm` Signup: optionales Feld „Tester-Code (optional)". Bei gültigem Code → `user_metadata.tester_code = 'LERNZEIT2026'`.
- `handle_new_user` Trigger erweitern: Wenn Tester-Code im Metadata → setze `profiles.is_founding_family=true`, increment `tester_codes.uses`.

**Feedback-Trigger für 3 Monate Premium**

- Erweitere `parent_feedback`: Neue Spalte `is_tester_feedback boolean`. Nach Submit prüft Frontend `is_founding_family`; falls true und noch keine `tester_feedback`-Gutschrift existiert → Edge Function `grant-tester-reward` ruft auf:
  - Insert in `premium_grants` (3 Monate, reason=`tester_feedback`)
  - Verlängert `subscriptions.current_period_end` um 3 Monate (additiv, nie ersetzen).
- Dialog: Nach erfolgreichem Tester-Feedback: „Danke, dass du LernZeit von Anfang an mitgestaltest! Du hast 3 Monate Premium und dein LernZeit-Familie-Abzeichen erhalten. 🚀"

**UI**

- Badge „LernZeit-Familie🚀" prominent im `ParentDashboard` (Header neben Name).
- Im `FeedbackInbox` (Admin): Filter „Nur Gründungsfamilien".

---

### Phase 2 — Empfehlungs-Basismechanik

**Belohnungslogik (final, gedeckelt)**


| Rolle                | Belohnung                           | Trigger                                           |
| -------------------- | ----------------------------------- | ------------------------------------------------- |
| Geworbener (neu)     | **+1 Monat extra** (2 Mon. statt 1) | Sofort bei Signup mit gültigem Code               |
| Werber (Aktivierung) | **+1 Monat**                        | Geworbener: 7 Tage aktiv ODER ≥20 Aufgaben gelöst |
| Werber (Conversion)  | **+1 Monat**                        | Geworbener wird zahlender Kunde                   |


**Meilensteine (kumulativ, einmalig)**

- 3 aktivierte Empfehlungen → **+1 Monat** Bonus (Gesamt-Cap pro Werber bei 5 erfolgreichen Conversions ≈ 6 Monate)
- 5 aktivierte Empfehlungen → **+1 Monat** Bonus

**Datenmodell**

- `referral_codes`: `user_id PK, code text UNIQUE, created_at`. Code = 6 alphanumerische Zeichen.
- `referrals`: `id, referrer_id, referee_id UNIQUE, status (invited|active|paying), created_at, activated_at, paid_at, blocked_reason text NULL`.
- `referral_milestones`: `user_id, milestone int (3|5), reached_at` — Idempotenz.

**Attribution-Flow**

1. `?ref=ABC123` auf Landing → in `localStorage.referral_code` speichern (TTL 30 Tage).
2. `AuthForm` Signup liest LocalStorage → `user_metadata.referral_code`.
3. `handle_new_user`: Validiert Code, schreibt `referrals` (status=`invited`), verlängert Trial des Geworbenen um 30 Tage (28 → 58).
4. Missbrauchsschutz im Trigger: Self-Referral (gleiche E-Mail-Domain bei `@lernzeit.internal` → blockieren), gleiche IP-Hash (optional), bereits existierende `referee_id` → ignorieren.

**Aktivierungs-Tracker (Edge Function `check-referral-activation`)**

- Wird via Cron täglich + nach jeder `learning_sessions`-Insert (DB-Trigger → http_post) ausgelöst für betroffenen User.
- Prüft für jeden offenen `referrals.status='invited'` mit `referee_id=X`:
  - 7+ Tage seit Signup mit ≥1 Session/Tag **ODER** ≥20 korrekte Antworten gesamt
  - Wenn ja: status→`active`, insert `premium_grants` (1 Monat, reason=`referral_active`) für Werber, verlängert Sub, Push.
- Conversion: bei `check-subscription`-Lauf vergleicht plan→paid: status→`paying`, +1 Monat für Werber.
- Nach jedem Werber-Grant: Check Meilensteine 3/5.

**UI — neuer Tab „Premium verschenken" im `ParentSettingsMenu**`

- Card mit Code + Link `https://lernzeit.app/?ref=ABC123`
- Share-Buttons: WhatsApp (`wa.me/?text=…`), Native Share API, Copy.
- Status-Liste: Eingeladene Familien mit Badge `Eingeladen` / `Aktiv 🎉` / `Premium ⭐` (anonymisiert: nur Initialen + Datum, kein Name aus DSGVO-Gründen).
- Fortschrittsbalken: „2 von 3 aktiven Familien bis zum nächsten Bonus".
- CI: Akzent `#22d3ee`, Du-Ansprache.
- Texte 1:1 aus Spec.

---

### Phase 3 — Admin-Tracking

- Neuer Tab „Empfehlungen" im `AdminDashboard`:
  - KPIs: Empfehlungen total / aktiv / zahlend, Conversion-Rate, verschenkte Premium-Monate (Σ `premium_grants.months` Filter referral_*).
  - Top-Werber-Liste (Anzahl `paying`-Referrals).
- View `v_referral_stats` als SECURITY DEFINER Function (admin-only).

---

### Technische Bausteine

```text
Tabellen (neu):       premium_grants, tester_codes, referral_codes,
                      referrals, referral_milestones
Profile-Spalten:      is_founding_family, founding_family_at
Edge Functions (neu): grant-tester-reward, check-referral-activation,
                      apply-premium-grant (zentrale Verlängerungs-Logik)
Trigger-Erweiterung:  handle_new_user (Tester-Flag + Referral-Attribution
                      + Trial-Verlängerung)
RLS:                  User sieht eigene grants/referrals; service_role schreibt
GRANTs:               SELECT für authenticated, ALL für service_role
```

**Zentrale Funktion `apply_premium_grant(user_id, months, reason)**` (SECURITY DEFINER):

- Insert in `premium_grants`
- UPDATE `subscriptions`: `current_period_end = GREATEST(current_period_end, now()) + interval 'X months'`
- Falls plan=`free` → plan=`premium`, status=`trialing`/`active`
- Garantiert additiv, nie ersetzend.

---

### Reihenfolge & Abnahme

1. **Phase 1**: Migration + AuthForm-Feld + Badge + Feedback-Hook. Abnahme: Code-Signup setzt Flag, Feedback gibt 3 Monate.
2. **Phase 2**: Migration + Edge Functions + Settings-Tab + Cron. Abnahme: E2E mit zwei Test-Accounts (Werber + Geworbener), Aktivierung nach 20 Antworten korrekt erkannt.
3. **Phase 3**: Admin-Tab + Stats-View.

Soll ich mit **Phase 1** starten?
## Phase 2 — Empfehlungs-Basismechanik

Gedeckelt bei **max. 6 Monaten Premium pro Werber**. CI: Akzent `#22d3ee`, Du-Ansprache.

### Belohnungslogik (final)

| Rolle | Belohnung | Trigger |
|---|---|---|
| Geworbener | +1 Monat extra (28 Tage Trial → +30 Tage Bonus = ~58 Tage) | Signup mit gültigem Code |
| Werber (Aktivierung) | +1 Monat | Geworbener: 7 Tage aktiv ODER ≥20 korrekte Antworten |
| Werber (Conversion) | +1 Monat | Geworbener wird zahlender Kunde |
| Meilenstein 3 | +1 Monat Bonus | 3 aktivierte Empfehlungen (einmalig) |
| Meilenstein 5 | +1 Monat Bonus | 5 aktivierte Empfehlungen (einmalig) |

Max-Cap pro Werber: 6 Monate (5 Conversions × 2 + 2 Meilensteine = exakt 12, daher Hard-Cap in `apply_premium_grant` per `reason LIKE 'referral_%'`-Summe ≤ 6).

### 1. Datenmodell (Migration)

```sql
referral_codes (user_id PK, code text UNIQUE, created_at)
referrals (id, referrer_id, referee_id UNIQUE, status enum, 
           created_at, activated_at, paid_at, blocked_reason)
referral_milestones (user_id, milestone int CHECK 3|5, reached_at, PK(user_id,milestone))
```

- RLS: User SELECT own (als Werber UND als Geworbener), service_role ALL.
- GRANTs: `authenticated` SELECT, `service_role` ALL.
- Trigger `handle_new_user` erweitern:
  - Liest `user_meta_data.referral_code`
  - Validiert: existiert, nicht self-referral (gleicher `referrer_id` ≠ NEW.id), `referee_id` nicht bereits in `referrals`
  - Insert `referrals` (status=`invited`)
  - Verlängert Trial: `subscriptions.trial_end + 30 days`
- Helper-Funktion `cap_referral_grants(user_id, months)` (SECURITY DEFINER): Prüft Summe aller `premium_grants` mit `reason LIKE 'referral_%' OR reason LIKE 'milestone_%'`, gibt zurück wieviele Monate noch im Cap (6) erlaubt sind. Wird in den Edge Functions vor `apply_premium_grant` aufgerufen.
- RPC `generate_referral_code()`: 6-stelliger alphanumerischer Code, kollisionssicher per Retry. Wird lazy beim ersten Besuch des Tabs erstellt.

### 2. Attribution-Flow (Frontend)

- **Landing-Page** (`Start.tsx` / `Index.tsx`): Parse `?ref=ABC123` → `localStorage.setItem('referral_code', code)` mit TTL 30 Tage (JSON {code, expires}).
- **AuthForm.tsx**: Beim Parent-Signup `referral_code` aus localStorage in `user_metadata` mitgeben. Nach erfolgreichem Signup: localStorage cleanup.
- Hinweis-Banner im AuthForm: „🎉 Du wurdest eingeladen — 2 Monate Premium statt 1!" wenn Code vorhanden.

### 3. Edge Functions

**`check-referral-activation`** (NEU)
- Trigger: (a) Cron täglich um 03:00 via pg_cron, (b) nach Insert in `learning_sessions` per DB-Trigger `notify_referral_check` (http_post mit child user_id).
- Body: `{ user_id }` oder `{ all: true }` (Cron).
- Logik pro offenem `referrals` (status='invited'):
  - Aktivierungs-Kriterien prüfen (7+ Tage seit `created_at` mit ≥1 Session ODER `SUM(correct_answers) ≥ 20`)
  - Wenn erfüllt: status→`active`, `activated_at=now()`, `apply_premium_grant(referrer_id, capped(1), 'referral_active', referrals.id)`
  - Meilensteine prüfen: `COUNT(status IN ('active','paying'))` für referrer → bei 3 oder 5 und nicht in `referral_milestones`: Insert + `apply_premium_grant(referrer_id, capped(1), 'milestone_3'|'milestone_5')`
  - Push an Werber via send-push.

**`check-subscription`** (BESTEHEND erweitern)
- Nach Erkennung Plan=paid: Suche `referrals WHERE referee_id=user.id AND status='active'` → status→`paying`, `paid_at=now()`, `apply_premium_grant(referrer_id, capped(1), 'referral_paying', referrals.id)`.

### 4. UI — Neue Komponente `ReferralCard.tsx`

Integration: Neuer Tab/Section „Premium verschenken 🎁" im `ParentSettingsMenu.tsx`.

Aufbau:
- **Hero**: „Schenk Freunden 2 Monate Premium — und sichere dir bis zu 6 Monate für dich."
- **Code-Card**: Großer Code (e.g. `LZ-AB12CD`), Copy-Button, Share-URL `https://lernzeit.app/?ref=AB12CD`.
- **Share-Buttons**: WhatsApp (`wa.me/?text=...`), Native Share API (`navigator.share`), Copy-Link.
- **Status-Liste**: Eingeladene Familien anonymisiert (Initialen + Datum + Badge):
  - `Eingeladen` (grau) / `Aktiv 🎉` (cyan) / `Premium ⭐` (gold)
- **Fortschritt**: Progress-Balken „2 von 3 aktiven Familien bis zum nächsten Bonus" + verbleibende Cap-Anzeige „Du hast 3 von 6 Bonus-Monaten freigeschaltet".
- Hook `useReferral.ts`: Lädt/erstellt Code, fetched referrals + milestones.

### 5. Admin (Phase 3 vorgezogen-Stub)

Nur Daten-Erfassung jetzt; sichtbarer Admin-Tab folgt in Phase 3.

### 6. Reihenfolge

1. Migration (Tabellen, RLS, GRANTs, `handle_new_user` Erweiterung, `cap_referral_grants`, `generate_referral_code`, pg_cron Job).
2. Edge Function `check-referral-activation` + DB-Trigger auf `learning_sessions`.
3. `check-subscription` erweitern um Conversion-Logik.
4. Frontend: Landing-Parser, AuthForm-Banner+Metadata, `ReferralCard` + Tab in `ParentSettingsMenu`.

### Abnahme

- E2E mit zwei Test-Accounts: Werber generiert Code → Geworbener registriert über Link → Trial = 58 Tage → nach 20 korrekten Antworten: Werber bekommt +1 Monat, Status `Aktiv 🎉`. Nach Stripe-Zahlung: Status `Premium ⭐`, Werber +1 Monat. Cap bei 6 greift.

Soll ich so umsetzen?

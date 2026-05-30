
# Plan: Eltern-Feedback-System (validiert)

Referral wird verschoben. Wir bauen ausschließlich das Feedback-Modul.

---

## Teil A — Feedback-Formular (immer verfügbar)

### Datenbank
Neue Tabelle `parent_feedback`:
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null` (= `auth.uid()`)
- `category text not null` — einer von `bug | wish | praise | other`
- `message text not null` (1–1000 Zeichen, Validierungs-Trigger)
- `contact_email text null` (max 255, Format-Check Trigger)
- `app_version text null`
- `platform text null` — `web | ios | android`
- `status text not null default 'open'` — `open | read | done`
- `admin_note text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Reihenfolge in der Migration (Pflicht):
1. `CREATE TABLE public.parent_feedback (...)`
2. GRANTs:
   ```sql
   GRANT SELECT, INSERT ON public.parent_feedback TO authenticated;
   GRANT UPDATE (status, admin_note) ON public.parent_feedback TO authenticated;
   GRANT ALL ON public.parent_feedback TO service_role;
   ```
3. `ENABLE ROW LEVEL SECURITY`
4. Policies:
   - INSERT: `auth.uid() = user_id`
   - SELECT own: `auth.uid() = user_id`
   - SELECT all (Admin): `has_role(auth.uid(), 'admin')`
   - UPDATE (Admin only, nur status/admin_note): `has_role(auth.uid(), 'admin')`
5. Validierungs-Trigger (statt CHECK, weil flexibler):
   - `category IN ('bug','wish','praise','other')`
   - `length(message) BETWEEN 1 AND 1000`
   - `platform IN ('web','ios','android') OR platform IS NULL`
6. `touch_updated_at`-Trigger (Funktion existiert bereits).
7. Index: `(status, created_at desc)` für Admin-Ansicht.

### Frontend

**Neue Komponente:** `src/components/parent/ParentFeedbackDialog.tsx`
- shadcn `Dialog` mit Zod-Schema:
  ```ts
  z.object({
    category: z.enum(['bug','wish','praise','other']),
    message: z.string().trim().min(1).max(1000),
    contact_email: z.string().trim().email().max(255).optional().or(z.literal('')),
  })
  ```
- Felder: RadioGroup Kategorie, Textarea (mit Live-Zähler `x/1000`), optionales E-Mail-Feld (vorausgefüllt aus `auth.user.email`).
- Submit: insert mit `user_id = auth.uid()`, `app_version` aus `import.meta.env.VITE_APP_VERSION` (Fallback `'unknown'`), `platform` via Capacitor (`Capacitor.getPlatform()` → web/ios/android).
- Erfolg: Toast „Danke für dein Feedback!" (top-center, gemäß Memory), Dialog schließt.

**Integration:** in `ParentSettingsMenu` neuer Eintrag „Feedback senden" (Icon `MessageSquareHeart`) im Tab „Konto" oder eigenem kleinen Block am Ende der Liste.

---

## Teil B — App-Store-Rating-Prompt (gelegentlich)

### Trigger-Logik
Hook `useRatingPrompt()` (läuft beim Mount der Eltern-Hauptansicht):
- Zeigen wenn ALLE wahr:
  1. Profil-Rolle = `parent`
  2. `profile.created_at` ≥ 14 Tage alt
  3. Mind. 5 Kind-Lernsessions (`learning_sessions` joined über `parent_child_relationships`, count >= 5) — gecached in `localStorage` mit 24h-TTL, damit kein Query bei jedem Mount
  4. `localStorage.rating_prompt_cooldown_until` < now()
  5. `profile.last_rating_prompt_at` älter als 90 Tage (oder null)

### Speicherung des Status
Neue Spalte in `profiles`:
- `last_rating_prompt_at timestamptz null`
- `rating_prompt_response text null` — `rated | later | dismissed`

(Profiles-Tabelle existiert bereits, Migration nur ALTER.)

### Komponente
`src/components/parent/RatingPromptDialog.tsx` — Dialog mit Text „Magst du LernZeit? Eine Bewertung hilft uns sehr."
Drei Buttons:
- **„Jetzt bewerten"**: Capacitor-Plattform-Check
  - iOS: `https://apps.apple.com/app/idXXXXXXX?action=write-review` (App-Store-ID muss konfiguriert werden — Platzhalter `VITE_APPSTORE_ID`, Web-Fallback öffnet App-Store-Web-URL)
  - Android: `market://details?id=app.lernzeit` → Fallback `https://play.google.com/store/apps/details?id=app.lernzeit`
  - Web: Play Store Web-Link (oder beide nebeneinander)
  - Setzt `response='rated'`, kein weiterer Prompt (Cooldown 365 Tage).
- **„Später"**: 14 Tage Cooldown, `response='later'`.
- **„Nein danke"**: 365 Tage Cooldown, `response='dismissed'`.

Update sowohl `localStorage` (sofort) als auch `profiles.last_rating_prompt_at` (async, kein Block).

---

## Teil C — Admin-Sichtung

Neuer Tab `„Feedback"` in `AdminDashboard`:
- Komponente `src/components/admin/FeedbackInbox.tsx`
- Liste sortiert nach `created_at desc`, Filter Kategorie + Status
- Pro Zeile: Kategorie-Badge, Datum, gekürzte Message, Status-Dropdown (open/read/done), Detail-Sheet mit voller Message, contact_email, platform, app_version, user_id (mit Copy-Button)
- Pagination 50/Seite

---

## Validierungs-Check ✔

| Punkt | Status |
|---|---|
| Migration enthält CREATE → GRANT → RLS → POLICY in dieser Reihenfolge | ✔ |
| Keine CHECK-Constraints für mutable Logik, sondern Validierungs-Trigger | ✔ |
| RLS deckt INSERT (own), SELECT (own + admin), UPDATE (admin only) ab | ✔ |
| Admin-Rolle via existierender `has_role()` SECURITY DEFINER Funktion — keine Rolle in `profiles` | ✔ |
| Frontend-Validierung mit Zod (trim, max, email) | ✔ |
| Keine Secrets/PII im Code, `contact_email` ist optional | ✔ |
| Toast top-center (Memory-konform) | ✔ |
| Capacitor-Plattformerkennung für Store-Link, Web-Fallback vorhanden | ✔ |
| `last_rating_prompt_at` als ALTER auf existierender `profiles`-Tabelle — keine neuen Policies nötig (bestehende erlauben `auth.uid()=id` Update) | ✔ |
| 90/14/365-Tage-Cooldowns getrennt von Sessions-Schwelle | ✔ |

## Reihenfolge der Umsetzung
1. Migration `parent_feedback` + Trigger + Index + ALTER `profiles`
2. `ParentFeedbackDialog` + Integration in `ParentSettingsMenu`
3. `useRatingPrompt` Hook + `RatingPromptDialog` + Einbindung in Eltern-Layout
4. `FeedbackInbox` + neuer Tab in `AdminDashboard`

## Offene Konfig-Werte (nach Build vom Nutzer zu setzen)
- `VITE_APPSTORE_ID` (Apple App-Store ID, sobald App live)
- Play-Store Package-Name (vermutlich `app.lernzeit` — bitte bestätigen, falls anders)

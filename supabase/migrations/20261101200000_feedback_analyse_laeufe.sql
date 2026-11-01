-- Feedback-Analyse (01.11.2026): Läufe laufen im Hintergrund und stehen in einer
-- Tabelle, damit das Admin-Panel den Stand auch nach Neuladen oder App-Wechsel zeigt.
-- Von Hand bearbeitete Regeln (manuell) fasst die automatische Analyse nicht an.

alter table public.prompt_rules
  add column if not exists manuell boolean not null default false,
  add column if not exists deaktiviert_grund text;

create table if not exists public.feedback_analyse_laeufe (
  id uuid primary key default gen_random_uuid(),
  gestartet_am timestamptz not null default now(),
  beendet_am timestamptz,
  status text not null default 'laeuft' check (status in ('laeuft', 'fertig', 'fehler', 'uebersprungen')),
  ausloeser text not null default 'admin',
  feedback_anzahl integer not null default 0,
  regeln_vorher integer,
  regeln_nachher integer,
  neu integer not null default 0,
  geaendert integer not null default 0,
  deaktiviert integer not null default 0,
  meldung text
);

alter table public.feedback_analyse_laeufe enable row level security;

create policy "Admins lesen Feedback-Analysen"
  on public.feedback_analyse_laeufe for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

grant select on public.feedback_analyse_laeufe to authenticated;
grant all on public.feedback_analyse_laeufe to service_role;

-- Wöchentlich montags 04:17 UTC; die Funktion läuft nur bei mindestens 10 neuen
-- auswertbaren Meldungen (ein KI-Aufruf je Lauf).
select cron.schedule(
  'feedback-analyse-woechentlich',
  '17 4 * * 1',
  $$
  select net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/analyze-feedback',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1), '')
    ),
    body := '{"ausloeser":"cron"}'::jsonb
  );
  $$
);

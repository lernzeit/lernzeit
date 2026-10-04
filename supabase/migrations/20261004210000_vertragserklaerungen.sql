-- Kuendigungen (§ 312k BGB) und Widerrufe (§ 356a BGB), die ueber die Seiten
-- /kuendigen und /widerruf eingehen (04.10.2026). Nur die Edge Function
-- vertragserklaerung schreibt (Service-Rolle); keine Policies, also kein
-- Zugriff fuer angemeldete oder anonyme Nutzer.
create table if not exists public.vertragserklaerungen (
  id uuid primary key default gen_random_uuid(),
  eingegangen_am timestamptz not null default now(),
  erklaerung text not null check (erklaerung in ('kuendigung', 'widerruf')),
  name text not null,
  email text not null,
  vertrag text not null check (vertrag in ('web_monat', 'web_jahr', 'app_store', 'google_play', 'unbekannt')),
  kuendigungsart text check (kuendigungsart in ('ordentlich', 'ausserordentlich')),
  grund text,
  zum text,
  nutzer_id uuid,
  bestaetigung_gesendet_am timestamptz,
  bestaetigung_fehler text,
  bearbeitet_am timestamptz,
  notiz text
);

create index if not exists vertragserklaerungen_email_idx on public.vertragserklaerungen (lower(email), eingegangen_am desc);

alter table public.vertragserklaerungen enable row level security;

comment on table public.vertragserklaerungen is
  'Kuendigungen (§ 312k BGB) und Widerrufe (§ 356a BGB) von /kuendigen und /widerruf. Bearbeitung von Hand: bearbeitet_am und notiz setzen.';

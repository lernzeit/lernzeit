-- Knöpfe an Mitteilungen für Eltern (29.10.2026): „Genehmigen“/„Ablehnen“ an der
-- Anfrage, „15 Min.“/„30 Min.“ an „Eltern fragen“ – auch auf der Apple Watch.
-- Jede Mitteilung trägt einen eigenen Schlüssel (nur sein SHA-256 steht hier).
-- Er gilt für genau diese Anfrage bzw. dieses Kind, nur für diesen Elternteil,
-- nur einmal und nur bis gueltig_bis. Funktion `mitteilung-antwort` prüft ihn.
create table if not exists public.mitteilung_schluessel (
  schluessel_hash text primary key,
  parent_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references auth.users(id) on delete cascade,
  art text not null check (art in ('anfrage', 'eltern_fragen')),
  request_id uuid references public.screen_time_requests(id) on delete cascade,
  gueltig_bis timestamptz not null,
  benutzt_am timestamptz,
  aktion text,
  created_at timestamptz not null default now()
);
create index if not exists mitteilung_schluessel_created_at on public.mitteilung_schluessel (created_at);

-- Nur die Service-Rolle (send-push, mitteilung-antwort). Keine Policies.
alter table public.mitteilung_schluessel enable row level security;
revoke all on table public.mitteilung_schluessel from public, anon, authenticated;
grant select, insert, update, delete on table public.mitteilung_schluessel to service_role;

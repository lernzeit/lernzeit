-- „Eltern fragen“ direkt vom Sperrbildschirm (20.10.2026, Build danach).
-- Die ShieldAction-Erweiterung hat keine Anmeldung. Sie schickt einen
-- geheimen Schlüssel je Kind an die Funktion `eltern-fragen`; LernZeit legt
-- ihn beim Start in der App Group ab (`sperre_anfrage_schluessel_holen`).
-- Niemand liest die Tabelle direkt.

create table if not exists public.sperre_anfrage_schluessel (
  child_id uuid primary key references auth.users(id) on delete cascade,
  schluessel text not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  created_at timestamptz not null default now()
);
alter table public.sperre_anfrage_schluessel enable row level security;

create or replace function public.sperre_anfrage_schluessel_holen()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  kind uuid := auth.uid();
  s text;
begin
  if kind is null then
    raise exception 'nicht angemeldet';
  end if;
  insert into sperre_anfrage_schluessel (child_id) values (kind) on conflict do nothing;
  select schluessel into s from sperre_anfrage_schluessel where child_id = kind;
  return s;
end;
$$;
revoke execute on function public.sperre_anfrage_schluessel_holen() from public, anon;
grant execute on function public.sperre_anfrage_schluessel_holen() to authenticated;

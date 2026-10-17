-- Handysperre „Tagesbudget wie Apple“ (17.10.2026, docs/handysperre-konzept-2026-10-17.md)
--
-- 1. Freiminuten am Wochenende (null = wie werktags)
-- 2. Extra-Zeit vom Elternteil („heute 15 Min. extra“, „heute ohne Limit“)
-- 3. Stand der Nutzung, vom Kinder-Handy gemeldet, für die Eltern
-- 4. Eltern-Notfallcode: 6 Ziffern, 30 Minuten je Schritt, prüfbar ohne Internet
-- 5. Protokoll jeder Notentsperrung, mit Push an die Eltern
--
-- claim_base_time() bleibt für ältere App-Versionen bestehen.

alter table public.child_settings
  add column if not exists freiminuten_wochenende smallint
    check (freiminuten_wochenende between 0 and 1440);

-- ── 2. Extra-Zeit ─────────────────────────────────────────────────────────
create table if not exists public.handyzeit_extra (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references auth.users(id) on delete cascade,
  minuten smallint not null check (minuten between 1 and 1440),
  gegeben_von uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists handyzeit_extra_kind_zeit on public.handyzeit_extra (child_id, created_at desc);
alter table public.handyzeit_extra enable row level security;
create policy handyzeit_extra_lesen on public.handyzeit_extra for select to authenticated
  using (auth.uid() = child_id or exists (
    select 1 from public.parent_child_relationships r
    where r.parent_id = auth.uid() and r.child_id = handyzeit_extra.child_id));

create or replace function public.extrazeit_geben(p_child uuid, p_minuten integer)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  neue_id uuid;
begin
  if not exists (select 1 from parent_child_relationships
                 where parent_id = auth.uid() and child_id = p_child) then
    raise exception 'nicht verknüpft';
  end if;
  if p_minuten is null or p_minuten < 1 or p_minuten > 1440 then
    raise exception 'ungültige Minuten';
  end if;
  if (select count(*) from handyzeit_extra
      where child_id = p_child and created_at > now() - interval '1 day') >= 20 then
    raise exception 'zu viele';
  end if;
  insert into handyzeit_extra (child_id, minuten, gegeben_von)
  values (p_child, p_minuten, auth.uid())
  returning id into neue_id;
  return neue_id;
end;
$$;
revoke execute on function public.extrazeit_geben(uuid, integer) from public, anon;
grant execute on function public.extrazeit_geben(uuid, integer) to authenticated;

-- ── 3. Stand der Nutzung ──────────────────────────────────────────────────
-- Eine Zeile je Kind, wird überschrieben (kein Verlauf).
create table if not exists public.handyzeit_stand (
  child_id uuid primary key references auth.users(id) on delete cascade,
  tag date not null,
  genutzt smallint not null default 0,
  budget smallint,
  aufgebraucht boolean not null default false,
  aktualisiert timestamptz not null default now()
);
alter table public.handyzeit_stand enable row level security;
create policy handyzeit_stand_lesen on public.handyzeit_stand for select to authenticated
  using (auth.uid() = child_id or exists (
    select 1 from public.parent_child_relationships r
    where r.parent_id = auth.uid() and r.child_id = handyzeit_stand.child_id));

create or replace function public.handyzeit_stand_melden(
  p_tag date, p_genutzt integer, p_budget integer, p_aufgebraucht boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'nicht angemeldet';
  end if;
  if p_tag is null or p_tag < current_date - 2 or p_tag > current_date + 2 then
    raise exception 'ungültiger Tag';
  end if;
  insert into handyzeit_stand (child_id, tag, genutzt, budget, aufgebraucht, aktualisiert)
  values (auth.uid(), p_tag, least(greatest(coalesce(p_genutzt, 0), 0), 1440),
          case when p_budget is null then null else least(greatest(p_budget, 0), 32767) end,
          coalesce(p_aufgebraucht, false), now())
  on conflict (child_id) do update
    set tag = excluded.tag, genutzt = excluded.genutzt, budget = excluded.budget,
        aufgebraucht = excluded.aufgebraucht, aktualisiert = now();
end;
$$;
revoke execute on function public.handyzeit_stand_melden(date, integer, integer, boolean) from public, anon;
grant execute on function public.handyzeit_stand_melden(date, integer, integer, boolean) to authenticated;

-- ── 4. Notfallcode ────────────────────────────────────────────────────────
-- Verfahren wie bei Zwei-Faktor-Apps (HOTP/RFC 4226 mit SHA-256), Zähler =
-- Unix-Zeit / 1800. Das Kinder-Handy prüft mit demselben Schlüssel
-- (src/lib/notfallcode.ts) und nimmt Zähler -1, 0, +1 an: Ein Code gilt
-- also mindestens 30 Minuten. Niemand liest die Tabelle direkt.
create table if not exists public.notfall_schluessel (
  child_id uuid primary key references auth.users(id) on delete cascade,
  schluessel bytea not null default extensions.gen_random_bytes(20),
  ausgeliefert_am timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notfall_schluessel enable row level security;

create or replace function public.notfallcode_berechnen(p_schluessel bytea, p_zaehler bigint)
returns text
language plpgsql
immutable
set search_path = public, extensions
as $$
declare
  h bytea;
  o integer;
  zahl bigint;
begin
  h := extensions.hmac(int8send(p_zaehler), p_schluessel, 'sha256');
  o := get_byte(h, 31) & 15;
  zahl := ((get_byte(h, o) & 127)::bigint << 24)
        | (get_byte(h, o + 1)::bigint << 16)
        | (get_byte(h, o + 2)::bigint << 8)
        | get_byte(h, o + 3)::bigint;
  return lpad((zahl % 1000000)::text, 6, '0');
end;
$$;
revoke execute on function public.notfallcode_berechnen(bytea, bigint) from public, anon, authenticated;

-- Eltern: aktueller Code und bis wann er sicher gilt.
create or replace function public.notfallcode_anzeigen(p_child uuid)
returns table(code text, gueltig_bis timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  s bytea;
  z bigint;
begin
  if not exists (select 1 from parent_child_relationships
                 where parent_id = auth.uid() and child_id = p_child) then
    raise exception 'nicht verknüpft';
  end if;
  insert into notfall_schluessel (child_id) values (p_child) on conflict do nothing;
  select n.schluessel into s from notfall_schluessel n where n.child_id = p_child;
  z := floor(extract(epoch from now()) / 1800)::bigint;
  return query select notfallcode_berechnen(s, z), to_timestamp((z + 2) * 1800);
end;
$$;
revoke execute on function public.notfallcode_anzeigen(uuid) from public, anon;
grant execute on function public.notfallcode_anzeigen(uuid) to authenticated;

-- Kinder-Handy: Schlüssel einmal abholen (beim Einrichten). Danach nur noch
-- nach „Erlauben“ auf dem Eltern-Handy in den letzten 15 Minuten — sonst
-- könnte sich ein Kind den Schlüssel selbst holen und Codes ausrechnen.
create or replace function public.notfall_schluessel_holen()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  kind uuid := auth.uid();
  zeile notfall_schluessel%rowtype;
begin
  if kind is null then
    raise exception 'nicht angemeldet';
  end if;
  if not exists (select 1 from parent_child_relationships where child_id = kind) then
    raise exception 'kein Elternteil verknüpft';
  end if;
  insert into notfall_schluessel (child_id) values (kind) on conflict do nothing;
  select * into zeile from notfall_schluessel where child_id = kind for update;
  if zeile.ausgeliefert_am is not null and not exists (
    select 1 from geraet_freigaben
    where child_id = kind and status = 'erlaubt'
      and beantwortet_am > now() - interval '15 minutes') then
    return null;
  end if;
  update notfall_schluessel set ausgeliefert_am = now() where child_id = kind;
  return encode(zeile.schluessel, 'hex');
end;
$$;
revoke execute on function public.notfall_schluessel_holen() from public, anon;
grant execute on function public.notfall_schluessel_holen() to authenticated;

-- ── 5. Protokoll der Notentsperrungen ─────────────────────────────────────
create table if not exists public.notfall_entsperrungen (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references auth.users(id) on delete cascade,
  minuten smallint check (minuten between 1 and 240),
  zweck text not null check (zweck in ('pause', 'ausnahmen', 'aufheben', 'zaehlen')),
  genutzt_am timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists notfall_entsperrungen_kind_zeit on public.notfall_entsperrungen (child_id, genutzt_am desc);
alter table public.notfall_entsperrungen enable row level security;
create policy notfall_entsperrungen_lesen on public.notfall_entsperrungen for select to authenticated
  using (auth.uid() = child_id or exists (
    select 1 from public.parent_child_relationships r
    where r.parent_id = auth.uid() and r.child_id = notfall_entsperrungen.child_id));

create or replace function public.notfall_melden(p_zweck text, p_minuten integer, p_genutzt_am timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'nicht angemeldet';
  end if;
  if (select count(*) from notfall_entsperrungen
      where child_id = auth.uid() and created_at > now() - interval '1 day') >= 30 then
    return;
  end if;
  insert into notfall_entsperrungen (child_id, minuten, zweck, genutzt_am)
  values (auth.uid(), p_minuten, p_zweck,
          least(greatest(coalesce(p_genutzt_am, now()), now() - interval '7 days'), now()));
end;
$$;
revoke execute on function public.notfall_melden(text, integer, timestamptz) from public, anon;
grant execute on function public.notfall_melden(text, integer, timestamptz) to authenticated;

-- ── Push: Notentsperrung an die Eltern, Extra-Zeit an das Kind ────────────
create or replace function public.notify_handysperre()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  service_key text;
  nutzlast jsonb;
begin
  select decrypted_secret into service_key
  from vault.decrypted_secrets where name = 'service_role_key' limit 1;
  if service_key is null or service_key = '' then
    raise log 'notify_handysperre: service_role_key fehlt im Vault';
    return new;
  end if;

  if tg_table_name = 'notfall_entsperrungen' then
    nutzlast := jsonb_build_object('event', 'notfall_genutzt', 'child_id', new.child_id,
      'zweck', new.zweck, 'minuten', new.minuten, 'eintrag_id', new.id);
  else
    nutzlast := jsonb_build_object('event', 'extrazeit', 'child_id', new.child_id,
      'minuten', new.minuten, 'eintrag_id', new.id);
  end if;

  perform net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'Authorization', 'Bearer ' || service_key),
    body := nutzlast
  );
  return new;
exception when others then
  raise log 'notify_handysperre failed: %', sqlerrm;
  return new;
end;
$$;
revoke execute on function public.notify_handysperre() from public, anon, authenticated;

create trigger notfall_entsperrung_push after insert on public.notfall_entsperrungen
  for each row execute function public.notify_handysperre();
create trigger handyzeit_extra_push after insert on public.handyzeit_extra
  for each row execute function public.notify_handysperre();

alter publication supabase_realtime add table public.handyzeit_extra;

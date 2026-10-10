-- Eltern erlauben Änderungen an der Handysperre auf IHREM Handy (10.10.2026).
--
-- Bisher verlangte das Kinder-Handy E-Mail und Passwort eines Elternteils
-- (ParentGate). Auf Klaras Handy scheiterte das: Eltern mit Google-/Apple-
-- Anmeldung haben kein Passwort, das Apple-ID-Passwort vom ersten Einrichten
-- wird leicht verwechselt, und das signOut() danach meldete das Elternteil
-- überall ab. Neu fragt das Kinder-Handy an, das Elternteil bekommt einen
-- Push und tippt auf „Erlauben“. Das Kinder-Handy wartet auf die Antwort.
--
-- Schreiben nur über die beiden RPCs: Das Kind darf anfragen, aber nie selbst
-- erlauben.
create table if not exists public.geraet_freigaben (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references auth.users(id) on delete cascade,
  zweck text not null check (zweck in ('ausnahmen', 'aufheben', 'zaehlen')),
  status text not null default 'offen' check (status in ('offen', 'erlaubt', 'abgelehnt', 'verfallen')),
  beantwortet_von uuid references auth.users(id) on delete set null,
  beantwortet_am timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists geraet_freigaben_kind_idx on public.geraet_freigaben (child_id, created_at desc);

alter table public.geraet_freigaben enable row level security;

create policy geraet_freigaben_lesen on public.geraet_freigaben
  for select using (
    auth.uid() = child_id
    or exists (
      select 1 from public.parent_child_relationships r
      where r.parent_id = auth.uid() and r.child_id = geraet_freigaben.child_id
    )
  );

grant select on public.geraet_freigaben to authenticated;

-- ── Kind fragt an ─────────────────────────────────────────────────────────
create or replace function public.geraet_freigabe_anfragen(p_zweck text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  kind uuid := auth.uid();
  neue_id uuid;
begin
  if kind is null then
    raise exception 'nicht angemeldet';
  end if;
  if p_zweck not in ('ausnahmen', 'aufheben', 'zaehlen') then
    raise exception 'unbekannter Zweck';
  end if;
  if not exists (select 1 from parent_child_relationships where child_id = kind) then
    raise exception 'kein Elternteil verknüpft';
  end if;
  -- Kein Push-Sturm: höchstens 6 Anfragen in 10 Minuten.
  if (select count(*) from geraet_freigaben
      where child_id = kind and created_at > now() - interval '10 minutes') >= 6 then
    raise exception 'zu viele Anfragen';
  end if;

  update geraet_freigaben set status = 'verfallen'
  where child_id = kind and status = 'offen';

  insert into geraet_freigaben (child_id, zweck) values (kind, p_zweck)
  returning id into neue_id;
  return neue_id;
end;
$fn$;

-- ── Elternteil antwortet ──────────────────────────────────────────────────
create or replace function public.geraet_freigabe_beantworten(p_id uuid, p_erlauben boolean)
returns text
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  zeile geraet_freigaben%rowtype;
begin
  select * into zeile from geraet_freigaben where id = p_id for update;
  if not found or not exists (
    select 1 from parent_child_relationships
    where parent_id = auth.uid() and child_id = zeile.child_id
  ) then
    raise exception 'nicht gefunden';
  end if;
  if zeile.status <> 'offen' then
    return zeile.status;
  end if;
  if zeile.created_at < now() - interval '15 minutes' then
    update geraet_freigaben set status = 'verfallen' where id = p_id;
    return 'verfallen';
  end if;

  update geraet_freigaben
  set status = case when p_erlauben then 'erlaubt' else 'abgelehnt' end,
      beantwortet_von = auth.uid(),
      beantwortet_am = now()
  where id = p_id;
  return case when p_erlauben then 'erlaubt' else 'abgelehnt' end;
end;
$fn$;

revoke execute on function public.geraet_freigabe_anfragen(text) from public, anon;
revoke execute on function public.geraet_freigabe_beantworten(uuid, boolean) from public, anon;
grant execute on function public.geraet_freigabe_anfragen(text) to authenticated;
grant execute on function public.geraet_freigabe_beantworten(uuid, boolean) to authenticated;

-- ── Push an die Eltern ────────────────────────────────────────────────────
create or replace function public.notify_geraet_freigabe()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  service_key text;
begin
  select decrypted_secret into service_key
  from vault.decrypted_secrets where name = 'service_role_key' limit 1;

  if service_key is null or service_key = '' then
    raise log 'notify_geraet_freigabe: service_role_key fehlt im Vault';
    return new;
  end if;

  perform net.http_post(
    url := 'https://fsmgynpdfxkaiiuguqyr.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'event', 'geraet_freigabe_neu',
      'freigabe_id', new.id,
      'child_id', new.child_id,
      'zweck', new.zweck
    )
  );
  return new;
exception when others then
  raise log 'notify_geraet_freigabe failed: %', sqlerrm;
  return new;
end;
$fn$;

revoke execute on function public.notify_geraet_freigabe() from public, anon, authenticated;

create trigger geraet_freigabe_push
  after insert on public.geraet_freigaben
  for each row execute function public.notify_geraet_freigabe();

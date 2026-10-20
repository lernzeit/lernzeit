-- Vorlesen mit KI-Stimme (20.10.2026, Funktion `vorlesen`).
-- Privater Bucket für die erzeugten MP3 (Zwischenspeicher je Text, nur
-- Service-Rolle), Zähler je Nutzer und Tag als Kostenbremse.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vorlesen', 'vorlesen', false, 2097152, array['audio/mpeg'])
on conflict (id) do nothing;

create table if not exists public.vorlesen_tag (
  user_id uuid not null references auth.users(id) on delete cascade,
  tag date not null,
  anzahl integer not null default 0,
  primary key (user_id, tag)
);
alter table public.vorlesen_tag enable row level security;

-- true = darf noch (und zählt mit), false = Grenze erreicht
create or replace function public.vorlesen_zaehlen(p_user uuid, p_grenze integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into vorlesen_tag (user_id, tag, anzahl) values (p_user, current_date, 1)
  on conflict (user_id, tag) do update set anzahl = vorlesen_tag.anzahl + 1
  returning anzahl into n;
  return n <= p_grenze;
end;
$$;
revoke execute on function public.vorlesen_zaehlen(uuid, integer) from public, anon, authenticated;

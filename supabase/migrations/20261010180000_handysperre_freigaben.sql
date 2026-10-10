-- LernZeit-Handysperre nur für freigeschaltete Kinder (10.10.2026).
--
-- Die eigene Sperre (Apple ManagedSettings) ist noch nicht fertig: Zeit läuft
-- nach Uhr statt nach Nutzung, kein Ruhezeit-Fenster, keine App-Limits. Bis
-- dahin sehen alle anderen nur den Weg über Apples Bildschirmzeit; getestet
-- wird mit Klaras Store-App (kein TestFlight möglich). Deshalb ein
-- Datenbank-Schalter statt einer Build-Variable.
--
-- Freischalten/entfernen nur im Dashboard bzw. mit Service-Rolle; Kind und
-- Eltern dürfen nur lesen.
create table if not exists public.handysperre_freigaben (
  child_id uuid primary key references auth.users(id) on delete cascade,
  notiz text,
  created_at timestamptz not null default now()
);

alter table public.handysperre_freigaben enable row level security;

create policy handysperre_freigaben_lesen on public.handysperre_freigaben
  for select using (
    auth.uid() = child_id
    or exists (
      select 1 from public.parent_child_relationships r
      where r.parent_id = auth.uid() and r.child_id = handysperre_freigaben.child_id
    )
  );

grant select on public.handysperre_freigaben to authenticated;

-- Klara (klathinka@gmail.com), Testgerät des Betreibers
insert into public.handysperre_freigaben (child_id, notiz)
select id, 'Testgeraet Klara, 10.10.2026' from auth.users where email = 'klathinka@gmail.com'
on conflict (child_id) do nothing;

-- 56 statt 24 Sticker zur Auswahl (Wunsch des Betreibers 05.10.2026: mindestens 50).
-- Nur sticker_waehlen(); sticker_vergeben() (aeltere App-Versionen) bleibt bei
-- den ersten 24, weil diese Apps neue Kennungen nicht anzeigen koennen.
-- Katalog muss mit STICKER in src/lib/hefte.ts uebereinstimmen.
create or replace function public.sticker_waehlen(p_sticker text)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_kind uuid := auth.uid();
  v_sitzung uuid;
  v_katalog text[] := array['fuchs','panda','einhorn','schildkroete','krake','eule','biene','schmetterling','regenbogen','stern','rakete','ballon','erdbeere','pizza','gitarre','fussball','pokal','diamant','sonnenblume','kleeblatt','delfin','dino','farben','puzzle','katze','hund','hase','loewe','tiger','koala','pinguin','frosch','elefant','giraffe','igel','krabbe','wal','marienkaefer','baer','schwein','drache','eis','donut','wassermelone','kuchen','sonne','mond','krone','roboter','ufo','basketball','fahrrad','pilz','kaktus','geschenk','schneemann'];
begin
  if v_kind is null or p_sticker is null or not (p_sticker = any (v_katalog)) then
    return null;
  end if;

  v_sitzung := public.sticker_sitzung();
  if v_sitzung is null then
    return null;
  end if;

  insert into public.kind_sticker (child_id, sticker, quelle, sitzung_id)
  values (v_kind, p_sticker, 'alles_richtig', v_sitzung)
  on conflict do nothing;

  if not found then
    return null;
  end if;
  return p_sticker;
end;
$fn$;

revoke all on function public.sticker_waehlen(text) from public, anon;
grant execute on function public.sticker_waehlen(text) to authenticated;

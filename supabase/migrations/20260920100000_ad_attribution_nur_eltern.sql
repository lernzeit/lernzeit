-- Werbemessung erst bei der Eltern-Registrierung.
--
-- Empfehlung der Kanzlei vom 20.09.2026: Werbemessung nur in einem
-- abgegrenzten Erwachsenenbereich nach Einwilligung; oeffentliche Seiten und
-- Kinderbereiche bleiben frei davon.
--
-- Nach Adressen laesst sich das nicht trennen: Unter "/" liegen
-- Marketingseite, App und Kinderansicht, dazu ein Demo-Modus ohne Konto.
-- Abgegrenzt wird deshalb ueber den ZEITPUNKT — geschrieben wird erst, wenn
-- sich jemand als Elternteil registriert.
--
-- Folge fuer diese Tabelle: Es gibt keine anonyme Vorstufe mehr. Jede Zeile
-- entsteht bereits mit user_id. Das macht mehrere Dinge ueberfluessig, die
-- eine Woche alt sind — besser jetzt entfernen als als Blindgaenger stehen
-- lassen.

-- 1) Keine anonyme Kennung mehr. Die Spalte bleibt fuer den Fall, dass die
--    Kanzlei die Konstruktion doch anders beurteilt, wird aber nicht mehr
--    befuellt.
alter table public.ad_attribution alter column anonymous_id drop not null;
comment on column public.ad_attribution.anonymous_id is
  'Nicht mehr befuellt. Seit 20.09.2026 entsteht jede Zeile direkt mit user_id.';

-- 2) Die kurze Frist entfaellt: Sie galt fuer Klicks ohne Anmeldung, und die
--    werden nicht mehr gespeichert. Jede Zeile gehoert ab sofort zu einer
--    Registrierung — also die lange Frist aus § 8a.
alter table public.ad_attribution alter column delete_after
  set default (now() + interval '13 months');

-- 3) Schreiben darf nur noch ein angemeldetes Konto, und nur fuer sich
--    selbst. Vorher war anonymes Schreiben erlaubt und user_id musste leer
--    sein — genau umgekehrt.
drop policy if exists "Anyone can insert ad attribution" on public.ad_attribution;

create policy "Parents can record their own ad click"
  on public.ad_attribution for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and reported_at is null
    -- Zweite Sperre neben der im Browser: Ein Kinderkonto kann hier nichts
    -- eintragen, auch wenn jemand die erste umgeht.
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'parent'
    )
  );

-- 4) link_ad_attribution verband eine anonyme Zeile nachtraeglich mit einem
--    Konto. Solche Zeilen entstehen nicht mehr.
drop function if exists public.link_ad_attribution(text);

-- 5) forget_ad_attribution hing an der anonymen Kennung. Es wird zum
--    Widerruf: Die angemeldete Person loescht ihre eigenen Zeilen.
drop function if exists public.forget_ad_attribution(text);

create or replace function public.forget_ad_attribution()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anzahl integer;
begin
  if auth.uid() is null then
    return 0;
  end if;
  delete from public.ad_attribution where user_id = auth.uid();
  get diagnostics v_anzahl = row_count;
  return v_anzahl;
end;
$$;

comment on function public.forget_ad_attribution() is
  'Widerruf der Einwilligung: loescht die Werbe-Zuordnung des angemeldeten Kontos.';

revoke all on function public.forget_ad_attribution() from public;
grant execute on function public.forget_ad_attribution() to authenticated;

-- 6) ads_klicks_offen zaehlte Klicks, aus denen keine Anmeldung wurde. Die
--    werden nicht mehr gespeichert, die Sicht waere dauerhaft leer und damit
--    irrefuehrend. Die Zahl der Klicks steht kuenftig im Google-Ads-Konto —
--    das ist ohnehin die Quelle, gegen die Z2 und Z3 gemessen werden.
drop view if exists public.ads_klicks_offen;

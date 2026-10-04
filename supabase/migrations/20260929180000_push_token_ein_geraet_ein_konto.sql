-- Ein Geraet gehoert immer nur dem Konto, das gerade darauf angemeldet ist.
--
-- push_tokens ist eindeutig auf (user_id, player_id). Meldete sich auf einem
-- Telefon erst ein Elternteil und dann das Kind an (oder umgekehrt), blieben
-- beide Zeilen stehen. send-push schickte dann Eltern-Meldungen
-- ("Neue Bildschirmzeit-Anfrage") auf das Kinder-Handy und Lern-Erinnerungen
-- an das Eltern-Handy. Am 29.09.2026 betraf das 17 Geraete (42 Zeilen).
--
-- OneSignal selbst ordnet ein Abo per OneSignal.login() immer nur einer
-- external_id zu. Der Trigger bildet das hier nach: Wer eine player_id
-- eintraegt oder auffrischt, uebernimmt sie, alle anderen Konten verlieren sie.
-- security definer, weil RLS dem Client nur die eigenen Zeilen zeigt.

create or replace function public.push_token_uebernehmen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.push_tokens
   where player_id = new.player_id
     and user_id <> new.user_id;
  return new;
end;
$$;

revoke all on function public.push_token_uebernehmen() from public, anon, authenticated;

drop trigger if exists push_token_uebernehmen on public.push_tokens;
create trigger push_token_uebernehmen
  after insert or update of player_id, user_id, updated_at on public.push_tokens
  for each row execute function public.push_token_uebernehmen();

-- Altbestand: pro Geraet bleibt das Konto, das es zuletzt gemeldet hat. Die App
-- meldet bei jedem Start neu (upsert → updated_at), das ist also das Konto,
-- das gerade angemeldet ist.
delete from public.push_tokens t
 using public.push_tokens neuer
 where neuer.player_id = t.player_id
   and neuer.user_id <> t.user_id
   and (neuer.updated_at, neuer.id) > (t.updated_at, t.id);

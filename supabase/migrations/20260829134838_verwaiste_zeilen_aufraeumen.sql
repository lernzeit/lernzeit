-- Verwaiste Zeilen und ihre Ursache.
--
-- Gefunden: 7 Zeilen in push_tokens (1 Android, 6 iOS) und 2 in
-- user_streak_states, deren user_id auf kein auth.users-Konto mehr zeigt. Es
-- sind Reste geloeschter Konten.
--
-- Zwei Ursachen, beide hier behoben:
--
--   1. delete-account raeumt 17 Tabellen ab, aber weder push_tokens noch
--      user_streak_states. (Der zweite Teil steckt im Frontend-Commit.)
--
--   2. Auf keiner der beiden Tabellen liegt ein Fremdschluessel auf
--      auth.users. Wird ein Konto geloescht, bleibt die Zeile stehen — auch
--      dann, wenn die Loeschung ueber die Admin-API statt ueber
--      delete-account laeuft.
--
-- push_tokens ist dabei nicht bloss unordentlich: Die Zeile haelt eine
-- OneSignal-player_id. Bleibt sie stehen, kann ein Geraet weiter
-- Benachrichtigungen zu einem Konto bekommen, das es nicht mehr gibt. Wer
-- "Konto loeschen" drueckt, erwartet das Gegenteil.
--
-- Reihenfolge ist wichtig: erst die Altlasten weg, sonst scheitert der
-- Fremdschluessel an genau diesen Zeilen.

DELETE FROM public.push_tokens t
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.user_id);

DELETE FROM public.user_streak_states s
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = s.user_id);

ALTER TABLE public.push_tokens
  ADD CONSTRAINT push_tokens_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_streak_states
  ADD CONSTRAINT user_streak_states_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

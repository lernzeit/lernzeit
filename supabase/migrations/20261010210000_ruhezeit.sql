-- Ruhezeit der LernZeit-Handysperre (10.10.2026): tägliches Zeitfenster, in
-- dem alles gesperrt ist außer „Immer erlaubt“ – auch mit freier Zeit.
-- Minuten nach Mitternacht (Ortszeit des Kinder-Handys), beide null = aus.
-- Eltern stellen es ein (bestehende Policies), das Kinder-Handy liest es beim
-- Öffnen und gibt es an Apple weiter (useRuhezeitAbgleich).
alter table public.child_settings
  add column if not exists ruhezeit_von smallint check (ruhezeit_von between 0 and 1439),
  add column if not exists ruhezeit_bis smallint check (ruhezeit_bis between 0 and 1439);

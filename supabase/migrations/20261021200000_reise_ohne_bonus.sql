-- Keine Extra-Minuten mehr für fertige Reise-Seiten (21.10.2026, Wunsch des
-- Betreibers). Die Einstellung für Eltern ist aus der App entfernt; mit 0
-- vergibt runde_belohnen() keinen Bonus mehr. Schon vergebene Seiten bleiben.
update public.child_settings set reise_bonus_minuten = 0 where reise_bonus_minuten <> 0;

-- 50 weitere Figuren gegen Tinte und hoehere Preise (22.10.2026).
--
-- Kinder sollen laenger sammeln: Bisher reichten ~2–3 Tage fuer die Krone
-- (Klara: ~60 Tinte am Tag). Neue Preise 150–1500, die bisherigen etwa mal 3.
-- Wer eine Figur schon hat, behaelt sie. Gleich halten mit AVATAR_PREIS in
-- src/lib/federmaeppchen.ts (npm run test:reise prueft das).
create or replace function public.avatar_preis(p_avatar text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case p_avatar
    when 'cat' then 0
    when 'dog' then 0
    when 'bear' then 0
    when 'fox' then 0
    when 'rabbit' then 0
    when 'panda' then 0
    when 'happy' then 0
    when 'smart' then 0
    when 'lion' then 150
    when 'monkey' then 150
    when 'star' then 200
    when 'sun' then 200
    when 'flower' then 200
    when 'tree' then 200
    when 'wink' then 200
    when 'cool' then 250
    when 'moon' then 250
    when 'star_eyes' then 300
    when 'angel' then 300
    when 'robot' then 350
    when 'rainbow' then 350
    when 'pirate' then 400
    when 'unicorn' then 500
    when 'wizard' then 600
    when 'superhero' then 600
    when 'crown' then 1000
    when 'rentier' then 150
    when 'schneemann' then 150
    when 'elf' then 200
    when 'weihnachtsmann' then 300
    when 'tannenbaum' then 300
    when 'tiger' then 200
    when 'koala' then 200
    when 'frog' then 200
    when 'penguin' then 250
    when 'owl' then 250
    when 'turtle' then 250
    when 'hedgehog' then 300
    when 'dolphin' then 300
    when 'octopus' then 350
    when 'giraffe' then 350
    when 'elephant' then 400
    when 'zebra' then 400
    when 'butterfly' then 450
    when 'parrot' then 500
    when 'otter' then 600
    when 'sloth' then 700
    when 'party' then 200
    when 'thinking' then 250
    when 'hug' then 300
    when 'laugh' then 350
    when 'ghost' then 300
    when 'alien' then 400
    when 'rocket' then 450
    when 'ufo' then 500
    when 'crystal_ball' then 550
    when 'magic_wand' then 600
    when 'fairy' then 700
    when 'mermaid' then 800
    when 'ninja' then 900
    when 'astronaut' then 1000
    when 'dino' then 1200
    when 'dragon' then 1500
    when 'soccer' then 200
    when 'basketball' then 200
    when 'tennis' then 250
    when 'kite' then 300
    when 'puzzle' then 300
    when 'palette' then 350
    when 'skateboard' then 400
    when 'drum' then 450
    when 'guitar' then 500
    when 'trophy' then 800
    when 'cactus' then 200
    when 'sunflower' then 250
    when 'mushroom' then 300
    when 'snowflake' then 350
    when 'lightning' then 400
    when 'earth' then 500
    when 'comet' then 600
    when 'volcano' then 700
    else null
  end;
$$;

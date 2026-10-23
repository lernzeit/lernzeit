-- Neue Figurenpreise erst ab Montag, 26.10.2026 (Betreiber, 23.10.2026).
--
-- Die App-Fassung im Store zeigt noch die alten Preise, die Datenbank verlangte
-- seit 22.10. schon die neuen. Bis Sonntag gelten deshalb die alten Preise fuer
-- die alten Figuren; die 50 neuen Figuren (nur in der neuen App) haben von Anfang
-- an ihren Preis. Ab 26.10. (Berliner Zeit) gelten die neuen Preise.
-- `stable` statt `immutable`, weil das Ergebnis vom Datum abhaengt.
-- npm run test:reise vergleicht den Teil nach „-- ab 26.10.2026“ mit lib/federmaeppchen.ts.
create or replace function public.avatar_preis(p_avatar text)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(
    case when public.heute_berlin() < date '2026-10-26' then
      case p_avatar
    -- bis 25.10.2026
    when 'cat' then 0 when 'dog' then 0 when 'bear' then 0 when 'fox' then 0
    when 'rabbit' then 0 when 'panda' then 0 when 'happy' then 0 when 'smart' then 0
    when 'lion' then 40 when 'monkey' then 40
    when 'star' then 50 when 'sun' then 50 when 'flower' then 50 when 'tree' then 50 when 'wink' then 50
    when 'cool' then 60 when 'moon' then 60
    when 'star_eyes' then 70 when 'angel' then 70
    when 'robot' then 80 when 'rainbow' then 80
    when 'pirate' then 90 when 'unicorn' then 100
    when 'wizard' then 120 when 'superhero' then 120
    when 'crown' then 150
    -- Weihnachten
    when 'rentier' then 40 when 'schneemann' then 40 when 'elf' then 50
    when 'weihnachtsmann' then 60 when 'tannenbaum' then 60
        else null
      end
    end,
    case p_avatar
    -- ab 26.10.2026
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
    end);
$$;

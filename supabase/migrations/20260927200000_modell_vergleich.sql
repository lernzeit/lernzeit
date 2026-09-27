-- Modellvergleich fuer den Vorrat-Generator (cache-prefill).
--
-- Jede Zeile ist eine Frage, die ein Modell fuer eine feste Vorgabe (slot)
-- erzeugt hat — mit exakt dem Prompt des Vorrat-Generators. Daneben stehen
-- Tokens, echte Kosten laut OpenRouter, Dauer und das Urteil der bestehenden
-- Qualitaetspruefung. Befuellt nur von der Edge Function `modell-vergleich`.
--
-- Die Fragen landen bewusst NICHT in ai_question_cache: Sie sind Testmaterial
-- und sollen erst nach der Bewertung entscheiden, welches Modell kuenftig
-- Fragen fuer Kinder schreibt.

create table if not exists public.modell_vergleich (
  id uuid primary key default gen_random_uuid(),
  lauf text not null,
  slot int not null,
  modell text not null,
  grade int not null,
  subject text not null,
  question_type text not null,
  difficulty text not null,
  category text not null,
  user_prompt text,
  roh text,
  frage jsonb,
  gueltig boolean,
  fehler text,
  prompt_tokens int,
  completion_tokens int,
  reasoning_tokens int,
  kosten_usd numeric,
  dauer_ms int,
  anbieter text,
  pruef_ok boolean,
  pruef_grund text,
  pruef_modell text,
  created_at timestamptz not null default now(),
  unique (lauf, slot, modell)
);

-- Nur die Service-Rolle (Edge Function) liest und schreibt.
alter table public.modell_vergleich enable row level security;

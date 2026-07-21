
-- Klasse 6 Mathe: entferne zu einfache Cache-Einträge (Klasse-2/3-Niveau),
-- die den Cache-First-Pfad wiederholt mit banalen Aufgaben füllen.
DELETE FROM public.ai_question_cache
WHERE grade = 6
  AND subject = 'math'
  AND (
    -- reine Bäcker/Brötchen-Grundrechen-Muster im ZR 100
    question_text ~* 'Bäcker.*(Brötchen|Muffins|Kuchen).*(verkauft|gebacken)' OR
    -- "N Bleche mit jeweils M" (kleines Einmaleins)
    question_text ~* '\d+\s*Bleche.*jeweils\s*\d+' OR
    -- ganz einfache Zweiterme im ZR 100 wie "25 - 13" / "3 · 12" ohne weiteren Kontext
    (char_length(question_text) < 90 AND question_text ~ '^\s*\d{1,2}\s*[+\-·*×]\s*\d{1,2}\s*=?')
  );

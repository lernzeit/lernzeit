-- Lernplan aus Fotos (04.10.2026): Text, den die KI aus hochgeladenen Fotos von
-- Heft, Buch oder Arbeitsblatt ausgelesen hat. Die Fotos selbst werden nicht
-- gespeichert. Genutzt fuer den Plan und fuer die Fragen im Spiel
-- (ai-question-generator, nur mit learningPlanId des eigenen Plans).
alter table public.learning_plans add column if not exists lernstoff text;
comment on column public.learning_plans.lernstoff is
  'Aus Fotos ausgelesener Unterrichtsstoff (ohne Fotos, ohne Personendaten). Nur fuer diesen Plan.';

-- Lösche alle hardcodierten Templates aus der Datenbank
-- Nur Templates mit is_parametrized = false oder NULL werden gelöscht

DO $$
DECLARE
  hardcoded_count INTEGER;
BEGIN
  -- Zähle hardcodierte Templates
  SELECT COUNT(*) INTO hardcoded_count
  FROM public.templates
  WHERE is_parametrized IS FALSE OR is_parametrized IS NULL;
  
  -- Lösche hardcodierte Templates
  DELETE FROM public.templates
  WHERE is_parametrized IS FALSE OR is_parametrized IS NULL;
  
  RAISE NOTICE 'Deleted % hardcoded templates', hardcoded_count;
END $$;
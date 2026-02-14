
-- Fix: Remove overly permissive ALL policy on scenario_families
-- Keep public read access (SELECT) but remove unrestricted write access
DROP POLICY IF EXISTS "System can manage scenario families" ON public.scenario_families;

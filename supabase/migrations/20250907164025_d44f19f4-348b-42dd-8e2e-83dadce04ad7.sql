-- Fix Security Definer View für template_scores - ohne RLS für Views
-- Das Problem: Views mit SECURITY DEFINER sind ein Sicherheitsrisiko
-- Lösung: Entferne SECURITY DEFINER und verwende normale View (Views können kein RLS haben)

-- Zuerst prüfen, ob die View existiert und sie löschen falls vorhanden
DROP VIEW IF EXISTS public.template_scores;

-- Neue sichere View ohne SECURITY DEFINER erstellen
CREATE VIEW public.template_scores AS
SELECT 
  t.id,
  t.student_prompt,
  t.correct,
  t.plays,
  t.rating_count,
  t.rating_sum,
  CASE 
    WHEN t.plays > 0 THEN ROUND((t.correct::numeric / t.plays::numeric) * 100, 2)
    ELSE 0
  END as success_rate,
  CASE 
    WHEN t.rating_count > 0 THEN ROUND(t.rating_sum::numeric / t.rating_count::numeric, 2)
    ELSE 0
  END as average_rating,
  t.grade,
  t.quarter_app,
  t.domain,
  t.subcategory,
  t.difficulty,
  t.created_at
FROM public.templates t
WHERE t.status = 'ACTIVE';
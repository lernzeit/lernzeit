-- Protokoll des Support-Postfachs info@lernzeit.app (Funktion support-postfach).
-- Jede Mail wird genau einmal bearbeitet: Antwort, Entwurf oder ohne Antwort
-- erledigt. Enthaelt Kundentexte; nur service_role, keine Policies.
CREATE TABLE IF NOT EXISTS public.support_postfach_protokoll (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL,
  uid integer,
  aktion text NOT NULL CHECK (aktion IN ('antwort', 'entwurf', 'erledigt')),
  an text,
  betreff text,
  text text,
  gesendet_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_postfach_protokoll_message_id_idx ON public.support_postfach_protokoll (message_id);
ALTER TABLE public.support_postfach_protokoll ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_postfach_protokoll FROM anon, authenticated;
COMMENT ON TABLE public.support_postfach_protokoll IS
  'Was mit jeder Mail an info@lernzeit.app geschah (antwort/entwurf/erledigt). Nur service_role.';

-- Die Bruecke zwischen "Eltern haben genehmigt" und "das Handy geht auf".
--
-- Bis hierher endete die Kette bei screen_time_requests.status = 'approved'.
-- Das Kindgeraet erfuhr davon nichts: Es gab keine Zeile, an der es haette
-- ablesen koennen, dass es entsperren darf, und keinen Weg, eine einmal
-- eingeloeste Genehmigung als verbraucht zu markieren. Die Sperre konnte
-- zugehen, aber nicht wieder auf.
--
-- screen_time_unlocks war dafuer schon vorgesehen (Migration vom 30.08.2026),
-- wurde aber von niemandem geschrieben. Diese Migration macht die Tabelle
-- benutzbar:
--
--   1. Eine Genehmigung laesst sich genau EINMAL einloesen.
--   2. Die Spalte screen_time_unlock_mode haelt fest, dass es nur noch einen
--      Modus gibt.

-- ── Einmal einloesen, nicht mehrmals ──────────────────────────────────────
--
-- Ohne diesen Index koennte ein Kind dieselbe Genehmigung mehrfach einloesen:
-- Die Freigabe VERLAENGERT eine laufende (das ist Absicht, siehe
-- ScreenTimePlugin.releaseFor), aus 15 genehmigten Minuten wuerden bei fuenf
-- Aufrufen 75. Der eindeutige Index macht den zweiten Versuch zu einem
-- Konflikt, den die Edge Function als "schon eingeloest" beantwortet.
--
-- Teilindex, weil request_id fuer die Auto-Freigabe leer bleibt: Ohne
-- Elternentscheid gibt es keine Anfrage, auf die er sich beziehen koennte.
CREATE UNIQUE INDEX IF NOT EXISTS idx_screen_time_unlocks_request_einmalig
  ON public.screen_time_unlocks (request_id)
  WHERE request_id IS NOT NULL;

COMMENT ON TABLE public.screen_time_unlocks IS
  'Erteilte Geraetefreigaben. Geschrieben ausschliesslich serverseitig durch '
  'die Edge Function screen-time-request; das Kindgeraet liest sie und hebt '
  'die Sperre fuer die Dauer auf. Eine Zeile je eingeloester Genehmigung — '
  'der eindeutige Index auf request_id verhindert das Doppelte.';

-- ── Nur noch ein Modus ────────────────────────────────────────────────────
--
-- 'selected' haette das Kind beim Einloesen eine einzelne App waehlen lassen.
-- Die Entscheidung dagegen kam aus der Benutzung: Wer 15 Minuten verdient
-- hat, will 15 Minuten — und nicht vorher eine Liste durchgehen.
--
-- Der Wert wird nicht nur nicht mehr gesetzt, er ist ab jetzt auch nicht mehr
-- erlaubt. Eine Pruefung, die einen Zustand zulaesst, den kein Code mehr
-- bedienen kann, ist eine Falle fuer den naechsten, der hier liest.
-- Geprueft vor dem Schreiben dieser Migration: keine Zeile steht auf
-- 'selected'.
ALTER TABLE public.child_settings
  DROP CONSTRAINT IF EXISTS child_settings_unlock_mode_check;

ALTER TABLE public.child_settings
  ADD CONSTRAINT child_settings_unlock_mode_check
  CHECK (screen_time_unlock_mode = 'all');

COMMENT ON COLUMN public.child_settings.screen_time_unlock_mode IS
  'Steht dauerhaft auf ''all'': Eine Freigabe gilt fuer alles, was gesperrt '
  'ist. Der fruehere Wert ''selected'' ist am 20.09.2026 entfallen, die '
  'Spalte bleibt als Platz fuer einen kuenftigen zweiten Modus.';

COMMENT ON COLUMN public.child_settings.screen_time_managed IS
  'true, sobald auf dem Kindgeraet tatsaechlich gesperrt wird. Gesetzt vom '
  'Geraet selbst — der Server kann es nicht wissen, die Sperre lebt in einer '
  'App Group auf dem Telefon.';

-- ── Das Kindgeraet meldet zurueck, dass es sperrt ─────────────────────────
--
-- Ohne diese Rueckmeldung sehen Eltern nirgends, ob die Einrichtung auf dem
-- Telefon tatsaechlich geklappt hat. Genau daran ist der erste Anlauf
-- gescheitert: Die Sperre war gebaut, aber niemand konnte erkennen, ob sie
-- steht.
--
-- Warum eine Funktion und keine RLS-Regel: Eine UPDATE-Regel fuer das Kind
-- wuerde die GANZE Zeile freigeben — auch die Minuten je Aufgabe und die
-- Tagesgrenzen. Ein Kind koennte sich dann selbst mehr Zeit einstellen. RLS
-- kennt keine Einschraenkung auf einzelne Spalten; eine Funktion schon.
CREATE OR REPLACE FUNCTION public.set_screen_time_managed(ist_verwaltet boolean)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.child_settings
     SET screen_time_managed = ist_verwaltet,
         updated_at = now()
   WHERE child_id = auth.uid();
$$;

COMMENT ON FUNCTION public.set_screen_time_managed(boolean) IS
  'Das Kindgeraet meldet, ob es gerade sperrt. Setzt ausschliesslich das eine '
  'Kennzeichen in der eigenen Zeile — bewusst nicht ueber eine RLS-Regel, die '
  'auch die Zeitvorgaben zum Schreiben freigeben wuerde.';

-- Auch von anon: Supabase vergibt EXECUTE in public per Vorgabe an beide
-- Rollen, und ein REVOKE von PUBLIC nimmt einen direkten Grant nicht zurueck.
-- Ohne Anmeldung ist auth.uid() zwar leer und die Funktion trifft keine
-- Zeile — aber eine Berechtigung, die niemand braucht, gehoert weg.
REVOKE ALL ON FUNCTION public.set_screen_time_managed(boolean) FROM public;
REVOKE ALL ON FUNCTION public.set_screen_time_managed(boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_screen_time_managed(boolean) TO authenticated;

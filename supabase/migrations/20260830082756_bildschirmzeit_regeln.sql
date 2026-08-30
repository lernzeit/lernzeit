-- Regelwerk fuer die geraeteseitige Bildschirmzeit-Freigabe (iOS Family Controls).
--
-- Aufgabenteilung, die sich aus Apples API ergibt:
--
--   Auf dem KINDGERAET liegt die Auswahl der gesperrten Apps. Ein
--   ApplicationToken ist geraetegebunden und opak — es laesst sich weder auf
--   ein anderes Geraet uebertragen noch in eine Bundle-ID aufloesen. Die
--   Auswahl gehoert deshalb in eine App Group auf dem Geraet und NICHT hierher.
--
--   Auf dem SERVER liegt nur die Regel und die Freigabe: In welchem Modus
--   arbeitet das Geraet, muss ein Elternteil zustimmen, und wie viele Minuten
--   sind bis wann freigegeben.
--
-- Damit erfaehrt der Server auch im Modus 'selected' nie, welche App das Kind
-- gewaehlt hat.

-- ── Regel je Kind ─────────────────────────────────────────────────────────
ALTER TABLE public.child_settings
  -- Erst true, wenn auf dem Kindgeraet tatsaechlich eingerichtet wurde. Bis
  -- dahin verhaelt sich alles wie bisher: Eltern geben von Hand frei.
  ADD COLUMN IF NOT EXISTS screen_time_managed boolean NOT NULL DEFAULT false,

  -- 'all'      — verdiente Zeit hebt die Sperre fuer ALLE gesperrten Apps auf
  -- 'selected' — das Kind waehlt beim Einloesen eine App aus der Sperrliste
  ADD COLUMN IF NOT EXISTS screen_time_unlock_mode text NOT NULL DEFAULT 'all',

  -- false: die verdiente Zeit wird beantragt und vom Elternteil bestaetigt
  --        (der bestehende Weg ueber screen_time_requests)
  -- true:  das Geraet gibt selbst frei, sobald Zeit verdient wurde
  ADD COLUMN IF NOT EXISTS screen_time_auto_release boolean NOT NULL DEFAULT false;

ALTER TABLE public.child_settings
  DROP CONSTRAINT IF EXISTS child_settings_unlock_mode_check;

ALTER TABLE public.child_settings
  ADD CONSTRAINT child_settings_unlock_mode_check
  CHECK (screen_time_unlock_mode IN ('all', 'selected'));

-- ── Erteilte Freigaben ────────────────────────────────────────────────────
--
-- Eine Zeile beantwortet dem Kindgeraet genau eine Frage: "Darf ich gerade
-- entsperren, und bis wann?" Ableiten liesse sich das theoretisch aus
-- screen_time_requests — aber eine genehmigte Anfrage sagt nicht, WANN die
-- Zeit zu laufen beginnt. Das Kind ist beim Genehmigen oft nicht am Geraet.
-- Deshalb eine eigene Zeile mit klarem Anfang und Ende; sie ist zugleich der
-- Nachweis, warum eine App zu einem bestimmten Zeitpunkt offen war.
CREATE TABLE IF NOT EXISTS public.screen_time_unlocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  minutes integer NOT NULL CHECK (minutes > 0),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  -- Woher die Freigabe stammt: vom Geraet selbst (Auto-Freigabe) oder aus der
  -- Zustimmung eines Elternteils.
  source text NOT NULL CHECK (source IN ('auto', 'parent_approval')),
  request_id uuid REFERENCES public.screen_time_requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_screen_time_unlocks_child_expires
  ON public.screen_time_unlocks (child_id, expires_at DESC);

ALTER TABLE public.screen_time_unlocks ENABLE ROW LEVEL SECURITY;

-- Das Kind sieht seine eigenen Freigaben — das Geraet fragt genau danach.
CREATE POLICY "Kinder sehen ihre eigenen Freigaben"
  ON public.screen_time_unlocks FOR SELECT TO authenticated
  USING (auth.uid() = child_id);

-- Eltern sehen die Freigaben ihrer verknuepften Kinder.
CREATE POLICY "Eltern sehen die Freigaben ihrer Kinder"
  ON public.screen_time_unlocks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.parent_child_relationships r
    WHERE r.child_id = screen_time_unlocks.child_id
      AND r.parent_id = auth.uid()
  ));

-- Geschrieben wird ausschliesslich serverseitig. Duerfte das Kind selbst
-- schreiben, waere die ganze Sperre eine Empfehlung.
GRANT SELECT ON public.screen_time_unlocks TO authenticated;
GRANT ALL ON public.screen_time_unlocks TO service_role;

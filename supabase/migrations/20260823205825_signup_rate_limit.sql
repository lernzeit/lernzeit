-- Missbrauchsbremse fuer die code-lose Kinder-Registrierung.
--
-- Produktentscheidung: Kinder duerfen sich ohne E-Mail-Adresse UND ohne
-- Einladungscode registrieren. Damit entfaellt die einzige Berechtigung, die
-- confirm-child-account bisher pruefen konnte - die Funktion legt Konten sonst
-- fuer jeden an, der den oeffentlichen anon-Schluessel kennt (er steckt in jedem
-- ausgelieferten App-Bundle). Sie nutzt die Admin-API mit email_confirm=true und
-- umgeht damit auch die Ratenbegrenzung von Supabase Auth.
--
-- Diese Tabelle traegt die Bremse: hoechstens eine begrenzte Zahl Konten je
-- Herkunft und Stunde.
--
-- Es wird KEINE IP-Adresse gespeichert, sondern nur ein HMAC davon. Der
-- Schluessel bleibt serverseitig; aus dem gespeicherten Wert laesst sich die
-- Adresse nicht zurueckrechnen. Fuer eine App mit Kindern als Nutzern ist das
-- die angemessene Sparsamkeit - gezaehlt werden muss, wiedererkannt nicht.

CREATE TABLE IF NOT EXISTS public.signup_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.signup_attempts IS
  'Zaehlwerk gegen Massenanlage von Kinderkonten. Enthaelt nur HMAC-Werte, keine IP-Adressen.';
COMMENT ON COLUMN public.signup_attempts.origin_hash IS
  'HMAC-SHA256 der Herkunftsadresse. Nicht umkehrbar, dient ausschliesslich dem Zaehlen.';

CREATE INDEX IF NOT EXISTS idx_signup_attempts_origin_time
  ON public.signup_attempts (origin_hash, created_at DESC);

-- Fuer das Aufraeumen alter Zeilen.
CREATE INDEX IF NOT EXISTS idx_signup_attempts_created
  ON public.signup_attempts (created_at);

ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;

-- Kein Lesezugriff fuer Nutzer. Schreiben und Zaehlen ausschliesslich in der
-- Edge Function mit Service-Role.
DROP POLICY IF EXISTS "Service role manages signup attempts" ON public.signup_attempts;
CREATE POLICY "Service role manages signup attempts"
  ON public.signup_attempts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

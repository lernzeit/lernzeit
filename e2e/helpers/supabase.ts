import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://fsmgynpdfxkaiiuguqyr.supabase.co';
const anon =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWd5bnBkZnhrYWlpdWd1cXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTg4ODYsImV4cCI6MjA2ODI3NDg4Nn0.unk2ST0Wcsw7RJz-BGrCqQpXSgLJQpAQPgJ-ImGCv-Q';

/** Fresh anon client per call — avoids leaking sessions between tests. */
export const makeSupabase = () =>
  createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

// Zugangsdaten nur aus der Umgebung (05.10.2026): Sie standen hier im
// oeffentlichen Repo. Werte wie in App Store Connect → App-Review-Informationen.
const pflicht = (name: string): string => {
  const wert = process.env[name];
  if (!wert) throw new Error(`${name} fehlt (siehe e2e/README.md)`);
  return wert;
};

export const TEST_PARENT = {
  get email() { return pflicht('E2E_PARENT_EMAIL'); },
  get password() { return pflicht('E2E_PARENT_PASSWORD'); },
};

export const TEST_CHILD = {
  get username() { return pflicht('E2E_CHILD_USERNAME'); },
  // The child logs in via username; the app resolves the pseudo email
  // `<username>@lernzeit.internal` server-side.
  get pseudoEmail() { return `${pflicht('E2E_CHILD_USERNAME')}@lernzeit.internal`; },
  get password() { return pflicht('E2E_CHILD_PASSWORD'); },
};

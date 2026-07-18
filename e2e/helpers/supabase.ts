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

export const TEST_PARENT = {
  email: 'apple.review.parent@lernzeit.app',
  password: 'AppleReview!2026',
};

export const TEST_CHILD = {
  username: 'applereviewkind',
  // The child logs in via username; the app resolves the pseudo email
  // `<username>@lernzeit.internal` server-side.
  pseudoEmail: 'applereviewkind@lernzeit.internal',
  password: 'AppleReview!2026',
};
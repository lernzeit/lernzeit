import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;
        const session = data.session;
        if (!session) {
          setUser(null);
          return;
        }

        // Validate the stored session against the auth server. If the account
        // was deleted (or the token was revoked), sign out and fall back to
        // the anonymous start page instead of rendering a broken profile.
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (!isMounted) return;

        if (userError || !userData?.user) {
          console.warn('Stale session detected, signing out:', userError?.message);
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch { /* ignore */ }
          if (!isMounted) return;
          setUser(null);
          return;
        }

        setUser(userData.user);
      } catch (err) {
        console.warn('Auth init failed, continuing without session:', err);
        if (!isMounted) return;
        setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    init();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
      } else {
        setUser(session.user ?? null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [])

  return { user, loading }
}
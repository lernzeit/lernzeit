import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Capacitor } from '@capacitor/core'
import { getAuthBootstrapInfo } from '@/services/nativeStorageAdapter'
import type { User } from '@supabase/supabase-js'

const GET_USER_TIMEOUT_MS = 5000;

/**
 * Distinguish "the server rejected this session" (account deleted, token
 * revoked) from "we could not reach the server". Only the former may sign out.
 */
export function isSessionRejected(error: any): boolean {
  if (!error) return false;
  const status = error.status ?? error.statusCode;
  if (status === 401 || status === 403) return true;

  const code = String(error.code ?? error.error_code ?? '').toLowerCase();
  return [
    'user_not_found',
    'session_not_found',
    'refresh_token_not_found',
    'bad_jwt',
  ].includes(code);
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true;

    const logBootstrap = (getUserResult: 'ok' | 'rejected' | 'network-error' | 'no-session') => {
      if (!Capacitor.isNativePlatform()) return;
      const info = getAuthBootstrapInfo();
      console.info('[auth-bootstrap]', JSON.stringify({
        preferencesAvailable: info.preferencesAvailable,
        keys: info.keys,
        sessionSource: info.sessionSource,
        getUser: getUserResult,
      }));
    };

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;
        const session = data.session;
        if (!session) {
          setUser(null);
          logBootstrap('no-session');
          return;
        }

        // Validate the stored session against the auth server, but never let a
        // flaky mobile network destroy a valid session: only an explicit
        // rejection (401/403 or a known auth error code) signs the user out.
        const timeoutMarker = Symbol('timeout');
        const result = await Promise.race([
          supabase.auth.getUser(),
          new Promise<typeof timeoutMarker>((resolve) =>
            setTimeout(() => resolve(timeoutMarker), GET_USER_TIMEOUT_MS)
          ),
        ]);
        if (!isMounted) return;

        if (result === timeoutMarker) {
          console.warn('Auth validation timed out, keeping stored session');
          setUser(session.user ?? null);
          logBootstrap('network-error');
          return;
        }

        const { data: userData, error: userError } = result;

        if (userError && isSessionRejected(userError)) {
          console.warn('Session rejected by auth server, signing out:', userError.message);
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch { /* ignore */ }
          if (!isMounted) return;
          setUser(null);
          logBootstrap('rejected');
          return;
        }

        if (userError || !userData?.user) {
          // Network / unknown error: keep the session, it re-validates on the
          // next successful token refresh.
          console.warn('Auth validation failed (keeping session):', userError?.message);
          setUser(session.user ?? null);
          logBootstrap('network-error');
          return;
        }

        setUser(userData.user);
        logBootstrap('ok');
      } catch (err) {
        console.warn('Auth init failed, continuing without session:', err);
        if (!isMounted) return;
        logBootstrap('network-error');
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

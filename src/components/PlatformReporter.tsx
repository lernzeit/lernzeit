import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';

/**
 * Meldet bei jedem App-Start bzw. jeder Anmeldung die aktuelle Plattform
 * (web / android / ios) in profiles.last_platform – für Kinder und Eltern.
 * Greift nicht in die Auth-Logik ein, sondern hört nur passiv mit.
 */
function currentPlatform(): 'web' | 'android' | 'ios' {
  if (!Capacitor.isNativePlatform()) return 'web';
  const p = Capacitor.getPlatform();
  return p === 'android' || p === 'ios' ? p : 'web';
}

async function report(userId: string) {
  const key = `lernzeit_platform_reported:${userId}:${currentPlatform()}`;
  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key) === '1') return;
  } catch { /* ignore */ }
  try {
    const { error } = await supabase.rpc('set_own_platform', { p_platform: currentPlatform() });
    if (error) throw error;
    try { sessionStorage?.setItem(key, '1'); } catch { /* ignore */ }
  } catch (e) {
    console.warn('[PlatformReporter] Plattform konnte nicht gespeichert werden:', e);
  }
}

export default function PlatformReporter() {
  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user?.id;
      if (active && id) report(id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'SIGNED_IN' && session?.user?.id) {
        setTimeout(() => report(session.user.id), 0);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
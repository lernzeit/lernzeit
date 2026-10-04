import { useCallback, useEffect, useMemo, useRef } from 'react';
import { trackBeimVerlassen, trackFireAndForget } from '@/lib/analytics';

/**
 * Messung des Registrierungsformulars (seit 04.10.2026): Schritte,
 * Fehlermeldungen und Verlassen ohne Abschluss. Nie mit Eingaben — nur Name
 * des Schritts bzw. Typ des Fehlers.
 *
 * Schritte:  rolle_gewaehlt (mit rolle), oauth (mit anbieter),
 *            eingabe_begonnen, absenden
 * Fehler:    siehe `fehlerTyp`
 * Abbruch:   Tab verborgen oder Formular verlassen, solange "Registrieren"
 *            aktiv ist, etwas getan wurde und kein Abschluss erfolgte.
 */
export type Schritt = 'geoeffnet' | 'rolle_gewaehlt' | 'oauth' | 'eingabe_begonnen' | 'absenden';

/** Ordnet eine Fehlermeldung (Supabase o. ae.) einem Fehlertyp zu. */
export function fehlerTyp(meldung: string | undefined | null): string {
  const m = (meldung ?? '').toLowerCase();
  if (!m) return 'sonstiges';
  if (m.includes('already registered') || m.includes('already been registered')) return 'email_vergeben';
  if (m.includes('invalid format') || m.includes('valid email') || (m.includes('email address') && m.includes('invalid'))) return 'email_ungueltig';
  if (m.includes('password')) return 'passwort_ungueltig';
  if (m.includes('captcha')) return 'captcha';
  if (m.includes('rate limit') || m.includes('security purposes')) return 'zu_viele_versuche';
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed')) return 'netzwerk';
  return 'sonstiges';
}

export function useRegistrierungsMessung() {
  const tab = useRef<'registrieren' | 'anmelden'>('registrieren');
  const gemeldet = useRef(new Set<string>());
  const letzterSchritt = useRef<Schritt>('geoeffnet');
  const aktiv = useRef(false);
  const fertig = useRef(false);
  const abbruchGemeldet = useRef(false);
  const start = useRef(Date.now());

  const abbruch = useCallback(() => {
    if (!aktiv.current || fertig.current || abbruchGemeldet.current || tab.current !== 'registrieren') return;
    abbruchGemeldet.current = true;
    trackBeimVerlassen('sign_up_abandoned', {
      letzter_schritt: letzterSchritt.current,
      sekunden: Math.round((Date.now() - start.current) / 1000),
    });
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') abbruch();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      abbruch(); // Formular verlassen (Seitenwechsel in der App)
    };
  }, [abbruch]);

  /** Schritt melden; ausser `absenden` nur einmal je Formular. */
  const schritt = useCallback((name: Schritt, extra: Record<string, string> = {}) => {
    if (tab.current !== 'registrieren' || fertig.current) return;
    const schluessel = name === 'rolle_gewaehlt' || name === 'oauth' ? `${name}:${Object.values(extra).join(',')}` : name;
    aktiv.current = true;
    letzterSchritt.current = name;
    // Weiter zu Google/Apple: Die Seite wird verlassen, das ist kein Abbruch.
    if (name === 'oauth') fertig.current = true;
    if (name !== 'absenden' && gemeldet.current.has(schluessel)) return;
    gemeldet.current.add(schluessel);
    trackFireAndForget('sign_up_step', { schritt: name, ...extra });
  }, []);

  const fehler = useCallback((typ: string) => {
    if (tab.current !== 'registrieren') return;
    aktiv.current = true;
    trackFireAndForget('sign_up_error', { fehler: typ, schritt: letzterSchritt.current });
  }, []);

  const abgeschlossen = useCallback(() => {
    fertig.current = true;
  }, []);

  const tabGewechselt = useCallback((neu: string) => {
    const name = neu === 'signin' ? 'anmelden' : 'registrieren';
    if (name === tab.current) return;
    tab.current = name;
    trackFireAndForget('auth_tab_gewechselt', { tab: name });
  }, []);

  /** Vom Browser abgelehnte Eingabe (Pflichtfeld leer, E-Mail-Format, zu kurz). */
  const browserFehler = useCallback((e: React.FormEvent) => {
    const el = e.target as HTMLInputElement;
    const v = el?.validity;
    if (!v) return;
    const feld = el.id || el.name || el.type || 'feld';
    if (v.valueMissing) fehler(`pflichtfeld_leer:${feld}`);
    else if (v.typeMismatch) fehler(feld === 'email' || el.type === 'email' ? 'email_ungueltig' : `format:${feld}`);
    else if (v.tooShort) fehler(`zu_kurz:${feld}`);
    else if (v.patternMismatch) fehler(`format:${feld}`);
    else fehler(`ungueltig:${feld}`);
  }, [fehler]);

  // Stabiles Objekt: AuthForm nutzt es in Effekt-Abhaengigkeiten.
  return useMemo(
    () => ({ schritt, fehler, abgeschlossen, tabGewechselt, browserFehler }),
    [schritt, fehler, abgeschlossen, tabGewechselt, browserFehler],
  );
}

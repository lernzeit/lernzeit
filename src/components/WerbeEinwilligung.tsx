import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  EINWILLIGUNG_GEAENDERT, WERBE_EINSTELLUNGEN_OEFFNEN, leseEinwilligung, loescheWerbeCookies,
  speichereEinwilligung, uebernimmEinwilligung,
} from '@/lib/werbeEinwilligung';
import { istMarketingSeite, ladeWerbeTags, webMessungMoeglich, werbeTagsErlaubt } from '@/lib/werbemessung';

/**
 * Einwilligung in die Werbemessung (Google Ads, Meta), Entscheidung vom 26.10.2026.
 *
 * Gefragt wird nur dort, wo auch gemessen würde: im Browser auf lernzeit.app, auf
 * Seiten für Erwachsene (Startseite, Zielseiten, Ratgeber, Preise, FAQ), ohne
 * Einladungscode, ohne angemeldetes Konto, und nur wenn der Notaus
 * (`ad_settings.tags_enabled`) offen ist. Ablehnen und Zustimmen sind gleich
 * groß. Ohne Entscheidung gilt „nein“. Die Seite funktioniert in jedem Fall gleich.
 *
 * Nie in den Apps, nie für Kinder: Kinder kommen über den Einladungslink
 * (?code=…) oder sind angemeldet, beides zeigt weder den Hinweis noch lädt es Tags.
 */
const WerbeEinwilligung = () => {
  const { pathname } = useLocation();
  const [offen, setOffen] = useState(false);
  const [google, setGoogle] = useState(false);
  const [meta, setMeta] = useState(false);
  const [auswahl, setAuswahl] = useState(false);

  // Gespeicherte Entscheidung übernehmen und Tags laden, wenn zugestimmt wurde
  useEffect(() => {
    uebernimmEinwilligung();
    void ladeWerbeTags();
  }, [pathname]);

  // Erstmals fragen: nur wenn noch keine Entscheidung vorliegt
  useEffect(() => {
    let aktiv = true;
    (async () => {
      if (leseEinwilligung()) return;
      if (!webMessungMoeglich() || !istMarketingSeite(pathname)) return;
      if (new URLSearchParams(window.location.search).has('code')) return;
      if (!(await werbeTagsErlaubt())) return;
      const { data } = await supabase.auth.getSession();
      if (data?.session) return;
      if (aktiv) setOffen(true);
    })().catch(() => undefined);
    return () => { aktiv = false; };
  }, [pathname]);

  // „Werbe-Einstellungen“ im Seitenfuß öffnet das Fenster jederzeit
  useEffect(() => {
    const oeffnen = () => {
      const e = leseEinwilligung();
      setGoogle(Boolean(e?.google));
      setMeta(Boolean(e?.meta));
      setAuswahl(Boolean(e));
      setOffen(true);
    };
    window.addEventListener(WERBE_EINSTELLUNGEN_OEFFNEN, oeffnen);
    return () => window.removeEventListener(WERBE_EINSTELLUNGEN_OEFFNEN, oeffnen);
  }, []);

  const speichern = useCallback(async (g: boolean, m: boolean) => {
    const vorher = leseEinwilligung();
    speichereEinwilligung(g, m);
    setOffen(false);
    const widerrufen = Boolean(vorher && ((vorher.google && !g) || (vorher.meta && !m)));
    if (widerrufen) {
      loescheWerbeCookies();
      // Zuordnung des Kontos zu einer Anzeige löschen (Widerruf), falls angemeldet
      try { await supabase.rpc('forget_ad_attribution'); } catch { /* nicht angemeldet */ }
      // Geladene Skripte lassen sich nicht zurücknehmen: neu laden
      window.location.reload();
      return;
    }
    void ladeWerbeTags();
  }, []);

  if (!offen) return null;

  const knopf = 'inline-flex h-10 flex-1 items-center justify-center rounded-full px-4 text-sm font-bold ring-1 ring-inset ring-karo transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary bg-white text-tinte hover:bg-muted';

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="werbe-titel"
      className="fixed inset-x-0 bottom-0 z-[100] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5"
    >
      <div className="mx-auto max-w-xl rounded-[20px] bg-white p-4 shadow-[0_20px_60px_-20px_rgba(26,43,109,0.45)] ring-1 ring-inset ring-karo">
        <p id="werbe-titel" className="text-sm leading-snug text-tinte">
          <b>Wirken unsere Anzeigen?</b> Das messen wir nur mit deiner Zustimmung und nur, wenn du dich als Elternteil
          registrierst, ohne E-Mail-Adresse oder Namen. Für Kinder nie.{' '}
          <Link to="/datenschutz#werbung" className="font-semibold text-primary underline underline-offset-2">Mehr</Link>
        </p>
        {auswahl && (
          <div className="mt-3 space-y-2 text-sm text-tinte">
            <label className="flex items-center gap-2.5">
              <input type="checkbox" className="h-4 w-4" checked={google} onChange={(e) => setGoogle(e.target.checked)} />
              <span><b>Google Ads</b></span>
            </label>
            <label className="flex items-center gap-2.5">
              <input type="checkbox" className="h-4 w-4" checked={meta} onChange={(e) => setMeta(e.target.checked)} />
              <span><b>Meta</b> (Pixel)</span>
            </label>
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <button type="button" className={knopf} onClick={() => void speichern(false, false)}>Ablehnen</button>
          {auswahl ? (
            <button type="button" className={knopf} onClick={() => void speichern(google, meta)}>Speichern</button>
          ) : (
            <button type="button" className={knopf} onClick={() => { setGoogle(false); setMeta(false); setAuswahl(true); }}>Auswahl</button>
          )}
          <button type="button" className={knopf} onClick={() => void speichern(true, true)}>Zustimmen</button>
        </div>
      </div>
    </div>
  );
};

/** „Werbe-Einstellungen“ im Seitenfuß; nur sichtbar, wo es etwas einzustellen gibt. */
export const WerbeEinstellungenLink = ({ className = '' }: { className?: string }) => {
  const [sichtbar, setSichtbar] = useState(false);
  useEffect(() => {
    let aktiv = true;
    const pruefen = () => { void werbeTagsErlaubt().then((ok) => { if (aktiv) setSichtbar(ok); }); };
    pruefen();
    window.addEventListener(EINWILLIGUNG_GEAENDERT, pruefen);
    return () => { aktiv = false; window.removeEventListener(EINWILLIGUNG_GEAENDERT, pruefen); };
  }, []);
  if (!sichtbar) return null;
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(WERBE_EINSTELLUNGEN_OEFFNEN))}>
      Werbe-Einstellungen
    </button>
  );
};

export default WerbeEinwilligung;

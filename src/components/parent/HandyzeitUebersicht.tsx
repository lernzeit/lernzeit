import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  OHNE_LIMIT_MINUTEN, freiminutenHeute, letzteTage, ohneLimit, summeJeTag, tagSchluessel,
} from '@/lib/handyzeit';

interface Tag { tag: string; genutzt: number; budget: number | null; aufgebraucht: boolean; aktualisiert: string }

interface Daten {
  /** Die LernZeit-Handysperre läuft auf dem Kinder-Handy (child_settings.screen_time_managed). */
  sperre: boolean;
  freiminuten: number;
  tage: string[];
  handy: Record<string, Tag>;
  verdient: Record<string, number>;
  freigegeben: Record<string, number>;
  extra: Record<string, number>;
  codes: Record<string, number>;
  bitten: Record<string, number>;
}

const uhr = (iso: string) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

function tagName(tag: string, heute: string): string {
  if (tag === heute) return 'Heute';
  const [j, m, t] = tag.split('-').map(Number);
  return new Date(j, m - 1, t).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' });
}

/**
 * Handyzeit beim Kind in der Eltern-Übersicht (21.10.2026): heute genutzt,
 * woraus sich das Tagesbudget zusammensetzt, und die letzten 7 Tage mit
 * genutzt / verdient / freigegeben.
 *
 * Welche Apps das Kind genutzt hat, gibt Apple nicht an andere Apps heraus
 * (nur Summen über die DeviceActivity-Schwellen); das zeigt Apples
 * Bildschirmzeit auf dem Eltern-iPhone. Die genutzten Minuten meldet das
 * Kinder-Handy, wenn LernZeit dort geöffnet wird (`handyzeit_stand_melden`).
 */
export function HandyzeitUebersicht({ childId, childName }: { childId: string; childName: string }) {
  const [daten, setDaten] = useState<Daten | null>(null);

  const laden = useCallback(async () => {
    const tage = letzteTage(7);
    const [j, m, t] = tage[0].split('-').map(Number);
    const ab = new Date(j, m - 1, t).toISOString();
    const [einstellungen, handy, spiele, anfragen, extra, codes, bitten] = await Promise.all([
      supabase.from('child_settings').select('screen_time_base_minutes, freiminuten_wochenende, screen_time_managed')
        .eq('child_id', childId).maybeSingle(),
      supabase.from('handyzeit_tage').select('tag, genutzt, budget, aufgebraucht, aktualisiert')
        .eq('child_id', childId).gte('tag', tage[0]),
      supabase.from('game_sessions').select('time_earned, session_date')
        .eq('user_id', childId).gte('session_date', ab),
      supabase.from('screen_time_requests').select('requested_minutes, responded_at')
        .eq('child_id', childId).eq('status', 'approved').gte('responded_at', ab),
      supabase.from('handyzeit_extra').select('minuten, created_at').eq('child_id', childId).gte('created_at', ab),
      supabase.from('notfall_entsperrungen').select('genutzt_am').eq('child_id', childId).gte('genutzt_am', ab),
      supabase.from('shield_attempts').select('attempted_at').eq('child_id', childId).gte('attempted_at', ab),
    ]);
    if (einstellungen.error || spiele.error || anfragen.error) return;

    const sekunden = summeJeTag((spiele.data ?? []).map((s) => ({ wert: Number(s.time_earned) || 0, zeit: s.session_date as string })), tage);
    setDaten({
      sperre: Boolean(einstellungen.data?.screen_time_managed),
      freiminuten: freiminutenHeute(einstellungen.data?.screen_time_base_minutes ?? 0, einstellungen.data?.freiminuten_wochenende ?? null),
      tage,
      handy: Object.fromEntries(((handy.data as Tag[] | null) ?? []).map((z) => [z.tag, z])),
      verdient: Object.fromEntries(Object.entries(sekunden).map(([tag, s]) => [tag, Math.ceil(s / 60)])),
      freigegeben: summeJeTag((anfragen.data ?? []).map((a) => ({ wert: a.requested_minutes ?? 0, zeit: a.responded_at as string })), tage),
      extra: summeJeTag((extra.data ?? []).map((e) => ({ wert: e.minuten, zeit: e.created_at })), tage),
      codes: summeJeTag((codes.data ?? []).map((c) => ({ wert: 1, zeit: c.genutzt_am })), tage),
      bitten: summeJeTag((bitten.data ?? []).map((b) => ({ wert: 1, zeit: b.attempted_at as string })), tage),
    });
  }, [childId]);

  useEffect(() => {
    void laden();
    const sichtbar = () => { if (document.visibilityState === 'visible') void laden(); };
    document.addEventListener('visibilitychange', sichtbar);
    return () => document.removeEventListener('visibilitychange', sichtbar);
  }, [laden]);

  if (!daten) return null;

  const heute = tagSchluessel();
  const stand = daten.handy[heute] ?? null;
  const extraHeute = daten.extra[heute] ?? 0;
  const ohne = extraHeute >= OHNE_LIMIT_MINUTEN || ohneLimit(stand?.budget ?? null);
  const budget = stand?.budget ?? null;
  const genutzt = stand ? Math.min(stand.genutzt, budget ?? stand.genutzt) : 0;
  const anteil = stand?.aufgebraucht ? 1 : budget && !ohne ? Math.min(1, genutzt / budget) : 0;

  // Balken der Woche: Handyzeit, wenn die Sperre läuft, sonst die verdiente Zeit.
  const wert = (tag: string) => (daten.sperre ? daten.handy[tag]?.genutzt ?? 0 : daten.verdient[tag] ?? 0);
  const groesster = Math.max(1, ...daten.tage.map(wert));
  const zeilen = [
    { text: 'Freiminuten', wert: `${daten.freiminuten} Min.` },
    { text: 'Fürs Lernen freigegeben', wert: `${daten.freigegeben[heute] ?? 0} Min.` },
    ...(extraHeute > 0 ? [{ text: 'Extra von euch', wert: extraHeute >= OHNE_LIMIT_MINUTEN ? 'ohne Limit' : `${extraHeute} Min.` }] : []),
    ...((daten.codes[heute] ?? 0) > 0 ? [{ text: 'Elterncode genutzt', wert: `${daten.codes[heute]}×` }] : []),
    ...((daten.bitten[heute] ?? 0) > 0 ? [{ text: '„Eltern fragen“ gedrückt', wert: `${daten.bitten[heute]}×` }] : []),
  ];

  return (
    <div className="space-y-5">
      {daten.sperre && (
        <section className="rounded-[20px] bg-card px-4 py-3 ring-1 ring-inset ring-karo">
          <p className="text-sm font-extrabold text-tinte">Handyzeit heute</p>
          {stand ? (
            <>
              <p className="mt-1 text-2xl font-extrabold tabular text-tinte">
                {stand.genutzt} Min.
                <span className="ml-1 text-sm font-semibold text-muted-foreground">
                  {ohne ? 'genutzt · heute ohne Limit' : budget != null ? `von ${budget} Min. genutzt` : 'genutzt'}
                </span>
              </p>
              {!ohne && budget != null && (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-karo" aria-hidden>
                  <div className={`h-full rounded-full ${stand.aufgebraucht ? 'bg-rotstift' : 'bg-primary'}`} style={{ width: `${Math.round(anteil * 100)}%` }} />
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {stand.aufgebraucht && !ohne ? 'Für heute aufgebraucht. ' : ''}Stand {uhr(stand.aktualisiert)} Uhr – das Handy von {childName} meldet sich, wenn LernZeit dort offen ist.
              </p>
            </>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Heute noch kein Stand vom Handy von {childName}.</p>
          )}
          <ul className="mt-3 divide-y divide-karo border-t border-karo text-sm">
            {zeilen.map((z) => (
              <li key={z.text} className="flex justify-between py-2"><span>{z.text}</span><b className="tabular text-tinte">{z.wert}</b></li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Welche Apps {childName} genutzt hat, zeigt Apple auf deinem iPhone: Einstellungen → Bildschirmzeit → {childName}.
          </p>
        </section>
      )}

      <section className="rounded-[20px] bg-card px-4 py-3 ring-1 ring-inset ring-karo">
        <p className="text-sm font-extrabold text-tinte">Letzte 7 Tage</p>
        <p className="text-xs text-muted-foreground">
          {daten.sperre ? 'Balken: Handyzeit genutzt.' : 'Balken: durchs Lernen verdient.'}
        </p>
        <ul className="mt-2 space-y-2.5">
          {[...daten.tage].reverse().map((tag) => {
            const w = wert(tag);
            const teile = [
              ...(daten.sperre ? [`verdient ${daten.verdient[tag] ?? 0} Min.`] : []),
              ...((daten.freigegeben[tag] ?? 0) > 0 ? [`freigegeben ${daten.freigegeben[tag]} Min.`] : []),
              ...((daten.extra[tag] ?? 0) > 0 ? [daten.extra[tag] >= OHNE_LIMIT_MINUTEN ? 'ohne Limit' : `extra ${daten.extra[tag]} Min.`] : []),
            ];
            return (
              <li key={tag}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className={tag === heute ? 'font-bold text-tinte' : 'text-tinte'}>{tagName(tag, heute)}</span>
                  <b className="tabular text-tinte">
                    {daten.sperre && !daten.handy[tag] ? '–' : `${w} Min.`}
                  </b>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-karo" aria-hidden>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((w / groesster) * 100)}%` }} />
                </div>
                {teile.length > 0 && <p className="mt-0.5 text-xs text-muted-foreground tabular">{teile.join(' · ')}</p>}
              </li>
            );
          })}
        </ul>
        {daten.sperre && <p className="mt-2 text-xs text-muted-foreground">„–“: an dem Tag kein Stand vom Handy.</p>}
      </section>
    </div>
  );
}

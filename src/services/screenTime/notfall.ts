import { supabase } from '@/lib/supabase';
import { codePasst, istGesperrt, nachFehlversuch, type Fehlversuche } from '@/lib/notfallcode';

/**
 * Elterncode auf dem Kinder-Handy (17.10.2026).
 *
 * Der Schlüssel kommt einmal vom Server (`notfall_schluessel_holen`, beim
 * Einrichten der Sperre oder nach „Erlauben“ auf dem Eltern-Handy) und liegt
 * dann auf dem Gerät. Geprüft wird ohne Internet (src/lib/notfallcode.ts).
 * Jede Nutzung wird gemerkt und an die Eltern gemeldet, sobald es Netz gibt.
 */

const SCHLUESSEL = 'lernzeit_notfall_schluessel';
const FEHLVERSUCHE = 'lernzeit_notfall_fehlversuche';
const MELDUNGEN = 'lernzeit_notfall_meldungen';

export type NotfallZweck = 'pause' | 'ausnahmen' | 'aufheben' | 'zaehlen';

interface Meldung {
  zweck: NotfallZweck;
  minuten: number | null;
  am: string;
}

// Capacitor Preferences auf dem Gerät (übersteht Speicherdruck der WebView),
// sonst localStorage.
async function speicher() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { Preferences } = await import('@capacitor/preferences');
      return {
        lesen: async (k: string) => (await Preferences.get({ key: k })).value,
        schreiben: (k: string, v: string) => Preferences.set({ key: k, value: v }),
      };
    }
  } catch { /* weiter mit localStorage */ }
  return {
    lesen: async (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
    schreiben: async (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* egal */ } },
  };
}

async function lesenJson<T>(k: string, vorgabe: T): Promise<T> {
  const roh = await (await speicher()).lesen(k);
  if (!roh) return vorgabe;
  try { return JSON.parse(roh) as T; } catch { return vorgabe; }
}

async function schreibenJson(k: string, wert: unknown) {
  await (await speicher()).schreiben(k, JSON.stringify(wert));
}

export async function hatNotfallSchluessel(): Promise<boolean> {
  return Boolean(await (await speicher()).lesen(SCHLUESSEL));
}

/**
 * Holt den Schlüssel, falls das Gerät ihn noch nicht hat. true = vorhanden.
 * Der Server gibt ihn nur beim ersten Mal oder nach „Erlauben“ heraus.
 */
export async function notfallSchluesselHolen(): Promise<boolean> {
  if (await hatNotfallSchluessel()) return true;
  const { data, error } = await supabase.rpc('notfall_schluessel_holen');
  if (error || typeof data !== 'string' || !data) return false;
  await (await speicher()).schreiben(SCHLUESSEL, data);
  return true;
}

export type PruefErgebnis = 'ok' | 'falsch' | 'gesperrt' | 'kein-schluessel';

/** Prüft den Code ohne Netz; nach 5 falschen 15 Minuten Pause. */
export async function notfallCodePruefen(eingabe: string, jetzt: number = Date.now()): Promise<PruefErgebnis> {
  const schluessel = await (await speicher()).lesen(SCHLUESSEL);
  if (!schluessel) return 'kein-schluessel';
  const stand = await lesenJson<Fehlversuche>(FEHLVERSUCHE, { anzahl: 0, gesperrtBis: 0 });
  if (istGesperrt(stand, jetzt)) return 'gesperrt';
  if (codePasst(schluessel, eingabe, jetzt)) {
    await schreibenJson(FEHLVERSUCHE, { anzahl: 0, gesperrtBis: 0 });
    return 'ok';
  }
  const neu = nachFehlversuch(stand, jetzt);
  await schreibenJson(FEHLVERSUCHE, neu);
  return istGesperrt(neu, jetzt) ? 'gesperrt' : 'falsch';
}

/** Merkt die Nutzung und schickt alle offenen Meldungen, wenn es Netz gibt. */
export async function notfallMelden(zweck: NotfallZweck, minuten: number | null): Promise<void> {
  const liste = await lesenJson<Meldung[]>(MELDUNGEN, []);
  liste.push({ zweck, minuten, am: new Date().toISOString() });
  await schreibenJson(MELDUNGEN, liste.slice(-20));
  await notfallMeldungenSenden();
}

export async function notfallMeldungenSenden(): Promise<void> {
  const liste = await lesenJson<Meldung[]>(MELDUNGEN, []);
  if (liste.length === 0) return;
  const rest: Meldung[] = [];
  for (const m of liste) {
    const { error } = await supabase.rpc('notfall_melden', {
      p_zweck: m.zweck, p_minuten: m.minuten as number, p_genutzt_am: m.am,
    });
    if (error) rest.push(m);
  }
  await schreibenJson(MELDUNGEN, rest);
}

import { supabase } from '@/lib/supabase';
import { SUPABASE_ANON_KEY, SUPABASE_PROJECT_URL } from '@/integrations/supabase/client';
import { inStuecke } from '@/lib/vorlesenText';

/**
 * Vorlesen mit der KI-Stimme vom Server (Funktion `vorlesen`, 20.10.2026).
 *
 * Ein gemeinsames Audio-Element für die ganze App: iOS erlaubt das Abspielen
 * nur nach einem Antippen. `vorlesen()` muss deshalb direkt im Klick
 * aufgerufen werden; es spielt dort sofort eine winzige Stille ab und
 * „entsperrt“ damit das Element für die Stücke, die erst danach geladen sind.
 *
 * Lange Texte kommen in Stücken (lib/vorlesenText.ts): Das erste spielt,
 * während das nächste lädt. Geladene Stücke bleiben für diese Sitzung im
 * Speicher. Klappt der Server nicht, liest die Stimme des Geräts vor.
 */

const STILLE = 'data:audio/mpeg;base64,//NAxAAAAANIAAAAAExBTUUDAAkIAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/80LEAAAAA0gAAAAATEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zQsQAAAADSAAAAABMQU1FAwAJCAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zQMQAAAADSAAAAABMQU1FAwAJCAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//NCxAAAAANIAAAAAExBTUUDAAkIAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

let audio: HTMLAudioElement | null = null;
let lauf = 0;
const geladen = new Map<string, Promise<string>>();

function element(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    audio.setAttribute('playsinline', 'true');
  }
  return audio;
}

async function holen(text: string): Promise<string> {
  const vorhanden = geladen.get(text);
  if (vorhanden) return vorhanden;
  const versprechen = (async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('nicht angemeldet');
    const antwort = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/vorlesen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ text }),
    });
    if (!antwort.ok || !(antwort.headers.get('content-type') ?? '').includes('audio')) {
      throw new Error(`vorlesen ${antwort.status}`);
    }
    // data:-Adresse statt blob: — WKWebView (iOS-App) spielt blob:-Ton nicht zuverlässig ab
    const blob = await antwort.blob();
    return await new Promise<string>((fertig, fehler) => {
      const leser = new FileReader();
      leser.onload = () => fertig(String(leser.result).replace(/^data:[^;,]*/, 'data:audio/mpeg'));
      leser.onerror = () => fehler(leser.error);
      leser.readAsDataURL(blob);
    });
  })();
  geladen.set(text, versprechen);
  versprechen.catch(() => geladen.delete(text));
  return versprechen;
}

/** Beendet das gerade spielende Stück (von stoppen()). */
let aktuellesEnde: (() => void) | null = null;

function abspielen(a: HTMLAudioElement, url: string, meinLauf: number): Promise<void> {
  return new Promise((fertig) => {
    if (meinLauf !== lauf) { fertig(); return; }
    // Kein 'pause'-Ereignis abwarten: Der Wechsel der Quelle kann eins auslösen.
    const ende = () => {
      a.removeEventListener('ended', ende);
      a.removeEventListener('error', ende);
      if (aktuellesEnde === ende) aktuellesEnde = null;
      fertig();
    };
    a.src = url;
    a.addEventListener('ended', ende);
    a.addEventListener('error', ende);
    aktuellesEnde = ende;
    a.play().catch(ende);
  });
}

function geraeteStimme(text: string, grade: number, onEnde: () => void): void {
  try {
    if (!window.speechSynthesis) { onEnde(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    u.rate = grade <= 2 ? 0.85 : 0.95;
    u.onend = onEnde;
    u.onerror = onEnde;
    window.speechSynthesis.speak(u);
  } catch {
    onEnde();
  }
}

export interface VorleseRueckmeldung {
  /** erstes Stück spielt */
  onStart?: () => void;
  /** fertig, gestoppt oder fehlgeschlagen */
  onEnde?: () => void;
}

/** Direkt aus einem Klick aufrufen (siehe oben). Beendet anderes Vorlesen. */
export function vorlesen(text: string, grade: number, r: VorleseRueckmeldung = {}): void {
  stoppen();
  const meinLauf = ++lauf;
  const a = element();
  // Entsperren im Klick (iOS), bevor irgendetwas wartet
  a.src = STILLE;
  a.play().catch(() => undefined);

  const stuecke = inStuecke(text);
  void (async () => {
    let gestartet = false;
    try {
      for (let i = 0; i < stuecke.length; i++) {
        const url = await holen(stuecke[i]);
        if (i + 1 < stuecke.length) void holen(stuecke[i + 1]).catch(() => undefined);
        if (meinLauf !== lauf) return;
        if (!gestartet) { gestartet = true; r.onStart?.(); }
        await abspielen(a, url, meinLauf);
        if (meinLauf !== lauf) return;
      }
      r.onEnde?.();
    } catch {
      if (meinLauf !== lauf) return;
      if (gestartet) { r.onEnde?.(); return; }
      // Server nicht erreichbar: Stimme des Geräts
      r.onStart?.();
      geraeteStimme(stuecke.join(' '), grade, () => { if (meinLauf === lauf) r.onEnde?.(); });
    }
  })();
}

export function stoppen(): void {
  lauf++;
  try { audio?.pause(); } catch { /* egal */ }
  aktuellesEnde?.();
  try { window.speechSynthesis?.cancel(); } catch { /* egal */ }
}

import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';

/**
 * Bittet Eltern um eine Bewertung im App Store bzw. bei Google Play.
 *
 * Nur über den Dialog von Apple bzw. Google, nie mit einem eigenen: Einen
 * eigenen Bewertungsdialog verbietet Apple (Richtlinie 5.6.1). Ebenso
 * verboten ist jede Belohnung für eine Bewertung (Apple 3.2.2, Google Play
 * „User Ratings“). Deshalb hängt hier bewusst nichts an der Bewertung — die
 * App erfährt ohnehin nicht, ob und wie bewertet wurde.
 *
 * Gefragt wird in einem guten Moment (Entscheidung des Betreibers,
 * 30.09.2026): gerade eine Bildschirmzeit-Anfrage genehmigt, das Konto ist
 * mindestens 7 Tage alt, und das Kind hat schon mindestens 5 Runden gespielt.
 * Wer so weit ist, kennt die App und hat eben etwas Gutes mit ihr erlebt.
 *
 * Ob der Dialog wirklich erscheint, entscheidet das System: Apple zeigt ihn
 * höchstens dreimal pro Jahr. Die eigene Sperre von 60 Tagen verhindert, dass
 * LernZeit die drei Gelegenheiten in einer Woche verbraucht.
 */

const MIN_KONTO_TAGE = 7;
const MIN_RUNDEN_KIND = 5;
const ABSTAND_TAGE = 60;
const SPEICHER_SCHLUESSEL = 'lernzeit.bewertungGefragtAm';
const TAG_MS = 24 * 60 * 60 * 1000;

function zuletztGefragt(): number | null {
  try {
    const wert = localStorage.getItem(SPEICHER_SCHLUESSEL);
    return wert ? Number(wert) : null;
  } catch {
    return null;
  }
}

function merkeGefragt(): void {
  try {
    localStorage.setItem(SPEICHER_SCHLUESSEL, String(Date.now()));
  } catch {
    /* Ohne Speicher wird beim nächsten guten Moment wieder gefragt — das
       System begrenzt trotzdem. */
  }
}

async function zeigeDialog(): Promise<void> {
  const { InAppReview } = await import('@capacitor-community/in-app-review');
  await InAppReview.requestReview();
  merkeGefragt();
}

/**
 * Aufrufen, nachdem Eltern eine Anfrage genehmigt haben. Wirft nie: Eine
 * Bewertungs-Bitte darf die Genehmigung nicht stören.
 *
 * `appVerlassen`: Die Genehmigung hat eine andere App geöffnet (Bildschirmzeit,
 * Family Link). Dann erst fragen, wenn LernZeit wieder im Vordergrund ist —
 * sonst ginge der Dialog im Wechsel verloren.
 */
export async function vielleichtUmBewertungBitten(childId: string, appVerlassen: boolean): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;

    const zuletzt = zuletztGefragt();
    if (zuletzt && Date.now() - zuletzt < ABSTAND_TAGE * TAG_MS) return;

    const { data } = await supabase.auth.getUser();
    const angelegt = data?.user?.created_at ? new Date(data.user.created_at).getTime() : null;
    if (!angelegt || Date.now() - angelegt < MIN_KONTO_TAGE * TAG_MS) return;

    const { count } = await supabase
      .from('game_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', childId);
    if ((count ?? 0) < MIN_RUNDEN_KIND) return;

    if (!appVerlassen) {
      await zeigeDialog();
      return;
    }

    const { App } = await import('@capacitor/app');
    const warte = await App.addListener('resume', () => {
      void warte.remove();
      // Kurz warten, bis die Oberfläche nach dem Zurückkehren steht.
      setTimeout(() => { void zeigeDialog().catch(() => {}); }, 1000);
    });
  } catch (e) {
    console.warn('[Bewertung] Bitte nicht möglich:', e);
  }
}

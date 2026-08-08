/**
 * Kostenbremse und Taktung für Hintergrundjobs.
 *
 * Beide Hintergrundjobs (`cache-prefill`, `cache-quality-check`) laufen auf
 * kostenlosen OpenRouter-Modellen. Deren Grenzen sind hart:
 *
 *   - 20 Anfragen pro Minute
 *   - 1.000 Anfragen pro Tag (bei mindestens 10 $ Guthaben, sonst 50)
 *
 * Dieses Modul setzt beides durch, damit ein fehlkonfigurierter Cron oder eine
 * Endlosschleife nicht das Tageskontingent verbrennt — oder schlimmer: auf ein
 * bezahltes Modell zurückfällt.
 *
 * Der Zähler kommt aus `ai_model_metrics`, das ohnehin jeden Aufruf protokolliert
 * (siehe ai-client.ts). Es braucht also keine eigene Zählertabelle, die
 * auseinanderlaufen könnte.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

/** Mindestabstand zwischen zwei LLM-Aufrufen: 20/min entspricht 3 s. */
export const MIN_CALL_SPACING_MS = 3_000;

export interface BudgetState {
  /** Wie viele Aufrufe dieser use_case heute schon hatte. */
  usedToday: number;
  /** Wie viele heute noch erlaubt sind (nie negativ). */
  remaining: number;
  /** false → Lauf sofort beenden. */
  canProceed: boolean;
}

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Prüft das Tagesbudget eines use_case.
 *
 * Verhalten im Fehlerfall ist bewusst konservativ: Lässt sich der Zähler nicht
 * lesen, wird `canProceed: false` gemeldet. Ein ausgefallener Lauf kostet
 * nichts, ein ungebremster Lauf schon.
 */
export async function checkBudget(useCase: string, maxPerDay: number): Promise<BudgetState> {
  const client = getServiceClient();
  if (!client) {
    return { usedToday: 0, remaining: 0, canProceed: false };
  }

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);

  try {
    const { count, error } = await client
      .from('ai_model_metrics')
      .select('id', { count: 'exact', head: true })
      .eq('use_case', useCase)
      .gte('created_at', since.toISOString());

    if (error) {
      console.warn(`[budget] Zaehler fuer ${useCase} nicht lesbar, Lauf wird uebersprungen:`, error.message);
      return { usedToday: 0, remaining: 0, canProceed: false };
    }

    const usedToday = count ?? 0;
    const remaining = Math.max(0, maxPerDay - usedToday);
    return { usedToday, remaining, canProceed: remaining > 0 };
  } catch (err) {
    console.warn(`[budget] Zaehler fuer ${useCase} nicht lesbar, Lauf wird uebersprungen:`, err);
    return { usedToday: 0, remaining: 0, canProceed: false };
  }
}

/**
 * Hält den Mindestabstand zwischen zwei Aufrufen ein.
 *
 * Wird mit dem Zeitpunkt des letzten Aufrufs gefüttert und liefert den neuen
 * Zeitpunkt zurück, damit der Aufrufer keinen eigenen Zustand halten muss:
 *
 *   let last = 0;
 *   for (...) { last = await pace(last); await callAI(...); }
 */
export async function pace(lastCallAt: number, spacingMs = MIN_CALL_SPACING_MS): Promise<number> {
  const waitFor = lastCallAt + spacingMs - Date.now();
  if (waitFor > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitFor));
  }
  return Date.now();
}

/**
 * Wie viel Zeit einem Lauf noch bleibt, bevor das Idle-Limit der Edge Function
 * (~150 s) greift. Hintergrundjobs beenden sich davor freiwillig, damit
 * angefangene Arbeit sauber protokolliert wird statt abgeschnitten zu werden.
 */
export function makeDeadline(budgetMs = 120_000): () => boolean {
  const startedAt = Date.now();
  return () => Date.now() - startedAt < budgetMs;
}

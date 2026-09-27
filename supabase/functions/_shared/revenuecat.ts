/**
 * Übersetzt ein RevenueCat-Ereignis in eine Zeile für `subscriptions`.
 *
 * Warum es das gibt: Käufe im App Store und bei Google Play kennt nur
 * RevenueCat. Die Premium-Sperren fragen aber den Server, und der kannte bis
 * zum 27.09.2026 nur Stripe. Folge: Die App zeigte „Premium aktiv", die
 * Funktionen blieben zu. Aufgefallen durch eine zahlende Kundin
 * (Play-Store-Jahresabo vom 08.09.2026), die von Hand freigeschaltet werden
 * musste.
 *
 * Reine Logik ohne Datenbank — die Edge Function `revenuecat-webhook` liest
 * den Ist-Stand, ruft `aenderungAus` auf und schreibt das Ergebnis.
 *
 * ── Wie das Ablaufdatum entsteht ─────────────────────────────────────────
 *
 * Ende = Ablauf laut RevenueCat + alle geschenkten Monate (`premium_grants`).
 *
 * Ohne den zweiten Teil würde das erste Ereignis nach einem Geschenk es
 * wieder wegnehmen: Die Kundin von oben hat das zweite Jahr geschenkt
 * bekommen. Kündigt sie die Verlängerung in Google Play, meldet RevenueCat
 * ein Ende im September 2027 — gemeint ist aber September 2028.
 *
 * `check-subscription` liest `trial_end` und behandelt ein Abo als aktiv,
 * solange dieses Datum in der Zukunft liegt. Darum wird es hier auf dasselbe
 * Ende gesetzt wie `current_period_end`. Nach Ablauf stuft
 * `check-subscription` herab wie bei jeder abgelaufenen Testphase — dieselbe
 * Regel für alle, kein zweiter Weg.
 */

/** Die Felder eines RevenueCat-Ereignisses, die hier gebraucht werden. */
export interface RcEreignis {
  id: string;
  type: string;
  app_user_id?: string | null;
  original_app_user_id?: string | null;
  aliases?: string[] | null;
  entitlement_ids?: string[] | null;
  entitlement_id?: string | null;
  period_type?: string | null;
  purchased_at_ms?: number | null;
  expiration_at_ms?: number | null;
  environment?: string | null;
  store?: string | null;
  product_id?: string | null;
  cancel_reason?: string | null;
}

/** Ausschnitt der bestehenden Zeile in `subscriptions`. */
export interface AboStand {
  bezahlt_seit: string | null;
}

export interface AboFelder {
  plan?: 'premium';
  status?: 'active' | 'trialing';
  quelle: 'revenuecat';
  store: string | null;
  store_produkt: string | null;
  current_period_start?: string | null;
  current_period_end: string;
  trial_end: string;
  cancel_at?: string | null;
  bezahlt_seit?: string;
}

export type Aenderung =
  | { art: 'setzen'; felder: AboFelder }
  | { art: 'ignorieren'; grund: string };

/** Ereignisse, nach denen Premium gilt. */
const GIBT_ZUGANG = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'SUBSCRIPTION_EXTENDED',
  'NON_RENEWING_PURCHASE',
  'TEMPORARY_ENTITLEMENT_GRANT',
  'REFUND_REVERSED',
]);

/** Ereignisse, die ein Ende festlegen (Kündigung, Erstattung, Ablauf). */
const SETZT_ENDE = new Set(['CANCELLATION', 'EXPIRATION']);

/** Ereignisse, mit denen tatsächlich bezahlt wurde. */
const IST_KAUF = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE']);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Die LernZeit-Nutzer-ID. Die App meldet sich mit der Supabase-ID bei
 * RevenueCat an (`Purchases.logIn`). Vor der Anmeldung vergibt RevenueCat
 * anonyme IDs (`$RCAnonymousID:…`) — dann steht die echte ID unter den Aliasen.
 */
export function nutzerId(e: RcEreignis): string | null {
  const kandidaten = [e.app_user_id, e.original_app_user_id, ...(e.aliases ?? [])];
  for (const k of kandidaten) {
    if (typeof k === 'string' && UUID.test(k)) return k.toLowerCase();
  }
  return null;
}

const alsIso = (ms: number) => new Date(ms).toISOString();

/** Monate addieren, kalendergenau (08.09.2027 + 12 → 08.09.2028). */
export function plusMonate(ms: number, monate: number): number {
  if (!monate) return ms;
  const d = new Date(ms);
  d.setUTCMonth(d.getUTCMonth() + monate);
  return d.getTime();
}

export function aenderungAus(
  e: RcEreignis,
  stand: AboStand | null,
  geschenkteMonate: number,
  entitlement: string,
): Aenderung {
  // Nur das Premium-Recht zählt. Ereignisse ohne Angabe (manche Typen
  // liefern keine) werden nicht ausgeschlossen.
  const rechte = e.entitlement_ids ?? (e.entitlement_id ? [e.entitlement_id] : null);
  if (rechte && rechte.length > 0 && !rechte.includes(entitlement)) {
    return { art: 'ignorieren', grund: `anderes Recht: ${rechte.join(',')}` };
  }

  const gibtZugang = GIBT_ZUGANG.has(e.type);
  if (!gibtZugang && !SETZT_ENDE.has(e.type)) {
    // TEST, BILLING_ISSUE, SUBSCRIPTION_PAUSED, TRANSFER, …: nur protokolliert.
    return { art: 'ignorieren', grund: `Typ ${e.type} ändert nichts am Zugang` };
  }

  const ablauf = e.expiration_at_ms;
  if (typeof ablauf !== 'number' || !(ablauf > 0)) {
    // LernZeit verkauft nur Abos; ein Kauf ohne Ablauf wäre ein Einmalkauf
    // auf Lebenszeit. Lieber sichtbar liegen lassen als raten.
    return { art: 'ignorieren', grund: 'kein Ablaufdatum' };
  }

  const ende = alsIso(plusMonate(ablauf, Math.max(0, geschenkteMonate)));
  const basis: AboFelder = {
    quelle: 'revenuecat',
    store: e.store ?? null,
    store_produkt: e.product_id ?? null,
    current_period_end: ende,
    trial_end: ende,
  };

  if (gibtZugang) {
    const probe = e.period_type === 'TRIAL';
    const felder: AboFelder = {
      ...basis,
      plan: 'premium',
      status: probe ? 'trialing' : 'active',
      current_period_start: typeof e.purchased_at_ms === 'number' ? alsIso(e.purchased_at_ms) : null,
      cancel_at: null,
    };
    // Kauftag für den Trichterbericht: einmal gesetzt, nie überschrieben.
    // Eine Store-Testphase ist noch kein Kauf; die erste RENEWAL danach schon.
    if (!stand?.bezahlt_seit && !probe && IST_KAUF.has(e.type) && typeof e.purchased_at_ms === 'number') {
      felder.bezahlt_seit = alsIso(e.purchased_at_ms);
    }
    return { art: 'setzen', felder };
  }

  // CANCELLATION: Verlängerung abgeschaltet (Zugang läuft bis zum Ende) oder
  // Erstattung (cancel_reason CUSTOMER_SUPPORT; dann ist der Ablauf jetzt).
  // EXPIRATION: vorbei. In beiden Fällen gilt das Ende; das Herabstufen
  // übernimmt check-subscription, sobald es erreicht ist.
  return {
    art: 'setzen',
    felder: { ...basis, cancel_at: e.type === 'CANCELLATION' ? ende : null },
  };
}

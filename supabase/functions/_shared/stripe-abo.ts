/**
 * Liest Laufzeit und Kündigung aus einem Stripe-Abo.
 *
 * Seit der API-Version 2025-03-31.basil stehen `current_period_start` und
 * `current_period_end` nicht mehr am Abo, sondern an jedem Abo-Posten
 * (`items.data[].current_period_*`). check-subscription las sie bis zum
 * 25.09.2026 am Abo — und bekam immer `undefined`. Darum war das
 * Laufzeitende in der Datenbank bei jedem Abo leer, und die App konnte
 * Eltern nie sagen, bis wann ihr Abo läuft.
 *
 * Eine Kündigung zum Laufzeitende ändert den Status NICHT: Stripe meldet
 * bis zum letzten Tag `active`. Erkennbar ist sie nur an `cancel_at` oder
 * `cancel_at_period_end`. Welches der beiden Stripe setzt, hängt davon ab,
 * wie gekündigt wurde (Kundenportal, Dashboard, API) — darum beide.
 */

/** Der Ausschnitt eines Stripe-Abos, den diese Datei braucht. */
export interface StripeAboAusschnitt {
  status: string;
  cancel_at?: number | null;
  cancel_at_period_end?: boolean | null;
  trial_end?: number | null;
  /** Nur bis API-Version 2025-02-24.acacia am Abo selbst. */
  current_period_start?: number | null;
  current_period_end?: number | null;
  items: {
    data: Array<{
      current_period_start?: number | null;
      current_period_end?: number | null;
    }>;
  };
}

export interface AboZeiten {
  periodeStart: string | null;
  periodeEnde: string | null;
  /** Gesetzt, wenn gekündigt ist, das Abo aber noch läuft: der letzte Tag. */
  kuendigungZum: string | null;
}

const alsIso = (sekunden: number | null | undefined): string | null =>
  typeof sekunden === 'number' && Number.isFinite(sekunden) && sekunden > 0
    ? new Date(sekunden * 1000).toISOString()
    : null;

export function aboZeiten(abo: StripeAboAusschnitt): AboZeiten {
  const posten = abo.items?.data ?? [];

  // Mehrere Posten können verschiedene Enden haben; es zählt das früheste —
  // ab da ist mindestens ein Teil nicht mehr bezahlt.
  const enden = posten
    .map((p) => p.current_period_end)
    .filter((e): e is number => typeof e === 'number' && e > 0);
  const starts = posten
    .map((p) => p.current_period_start)
    .filter((s): s is number => typeof s === 'number' && s > 0);

  const ende = enden.length ? Math.min(...enden) : abo.current_period_end ?? null;
  const start = starts.length ? Math.max(...starts) : abo.current_period_start ?? null;

  let kuendigung: number | null = null;
  if (typeof abo.cancel_at === 'number' && abo.cancel_at > 0) kuendigung = abo.cancel_at;
  else if (abo.cancel_at_period_end) kuendigung = ende;

  return {
    periodeStart: alsIso(start),
    periodeEnde: alsIso(ende),
    kuendigungZum: alsIso(kuendigung),
  };
}

/**
 * Das Abo, das Zugang gibt: `active` vor `trialing`, sonst keins.
 * Eine Liste statt zweier Abfragen je Status — spart einen Stripe-Aufruf.
 */
export function zugangsAbo<T extends { status: string }>(abos: T[]): T | null {
  return abos.find((a) => a.status === 'active')
    ?? abos.find((a) => a.status === 'trialing')
    ?? null;
}

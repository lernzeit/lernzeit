/**
 * Wann endet ein Web-Abo bei Kündigung, und wie viel wird erstattet?
 * (Entscheidung des Betreibers 04.10.2026, Nutzungsbedingungen 6.1/6.2)
 *
 * - Monatsabo: zum Ende des laufenden Monats, keine Erstattung.
 * - Jahresabo im ersten Jahr: zum Ende des ersten Jahres, keine Erstattung.
 * - Jahresabo ab dem zweiten Jahr (stillschweigend verlängert): jederzeit mit
 *   einer Frist von einem Monat (§ 309 Nr. 9 BGB). Das Jahr ist im Voraus
 *   bezahlt, deshalb wird der Anteil nach dem Vertragsende erstattet.
 *
 * Rein rechnerisch, ohne Stripe-Aufrufe, damit es testbar bleibt.
 */

export interface AboStand {
  /** 'month' oder 'year' (Stripe price.recurring.interval) */
  intervall: string;
  /** Beginn des Abos (Stripe start_date), Sekunden */
  start: number;
  /** laufender Abrechnungszeitraum, Sekunden */
  periodeStart: number;
  periodeEnde: number;
  /** für den laufenden Zeitraum bezahlt, in Cent */
  bezahltCent: number;
}

export interface Kuendigungsplan {
  /** Ende des Abos, Sekunden */
  ende: number;
  /** true: zum Ende des Zeitraums (Stripe cancel_at_period_end) */
  zumPeriodenende: boolean;
  /** zu erstatten, in Cent */
  erstattungCent: number;
  regel: 'monat' | 'erstes_jahr' | 'folgejahr';
}

const TAG = 24 * 3600;

/** Ein Kalendermonat später (31.01. → 28./29.02., wie § 188 Abs. 3 BGB). */
export function einenMonatSpaeter(sekunden: number): number {
  const d = new Date(sekunden * 1000);
  const tag = d.getUTCDate();
  const ziel = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()));
  const letzterTag = new Date(Date.UTC(ziel.getUTCFullYear(), ziel.getUTCMonth() + 1, 0)).getUTCDate();
  ziel.setUTCDate(Math.min(tag, letzterTag));
  return Math.floor(ziel.getTime() / 1000);
}

export function kuendigungsplan(abo: AboStand, jetzt: number): Kuendigungsplan {
  const amPeriodenende = (regel: Kuendigungsplan['regel']): Kuendigungsplan =>
    ({ ende: abo.periodeEnde, zumPeriodenende: true, erstattungCent: 0, regel });

  if (abo.intervall !== 'year') return amPeriodenende('monat');
  // Erster Zeitraum: Er beginnt mit dem Abo (zwei Tage Spielraum fuer
  // Verschiebungen beim Abschluss).
  if (abo.periodeStart - abo.start < 2 * TAG) return amPeriodenende('erstes_jahr');

  const ende = einenMonatSpaeter(jetzt);
  if (ende >= abo.periodeEnde) return amPeriodenende('folgejahr');
  const laenge = abo.periodeEnde - abo.periodeStart;
  const rest = abo.periodeEnde - ende;
  const erstattungCent = laenge > 0 ? Math.max(0, Math.round((abo.bezahltCent * rest) / laenge)) : 0;
  return { ende, zumPeriodenende: false, erstattungCent, regel: 'folgejahr' };
}

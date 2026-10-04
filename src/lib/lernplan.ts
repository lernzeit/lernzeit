import { differenceInCalendarDays } from 'date-fns';

/**
 * Welcher Tag eines Lernplans ist an einem Datum dran? (04.10.2026)
 *
 * - Der Plan beginnt, wenn das Kind ihn zum ersten Mal oeffnet
 *   (learning_plans.gestartet_am). Vorher ist "heute" Tag 1 – Eltern erstellen
 *   Plaene oft abends, und am naechsten Tag war Tag 1 sonst schon vorbei.
 * - Reicht die Zeit bis zum Test nicht mehr fuer alle Tage, springt der Plan
 *   nach vorn, sodass der letzte Tag (Wiederholung/Testtag) vor dem Test liegt.
 *   Es fallen also die ersten Tage (Grundlagen) weg, nie der Testtag.
 */
export interface PlanZeit {
  created_at: string;
  gestartet_am?: string | null;
  test_date: string | null;
  plan_data: unknown[] | null;
}

export function planTagAm(plan: PlanZeit, datum = new Date()) {
  const anzahl = Math.max(Array.isArray(plan.plan_data) ? plan.plan_data.length : 0, 1);
  const start = plan.gestartet_am ? new Date(`${plan.gestartet_am}T00:00:00`) : datum;
  let tag = differenceInCalendarDays(datum, start) + 1;
  if (plan.test_date) {
    const bisTest = differenceInCalendarDays(new Date(`${plan.test_date.slice(0, 10)}T00:00:00`), datum);
    // Am Testtag selbst: der letzte Tag (Wiederholung).
    tag = Math.max(tag, bisTest >= 1 ? anzahl - bisTest + 1 : anzahl);
  }
  return {
    anzahl,
    tag: Math.min(Math.max(tag, 1), anzahl),
    /** Alle Tage sind vorbei (danach: wiederholen) */
    fertig: tag > anzahl,
    gestartet: !!plan.gestartet_am,
  };
}

import { useEffect, useState } from 'react';
import { differenceInCalendarDays, format } from 'date-fns';
import { planTagAm } from '@/lib/lernplan';
import { de } from 'date-fns/locale';
import { Calendar, ChevronRight, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FAECHER, farbeVon, type FachId } from '@/lib/hefte';
import type { Heft } from '@/hooks/useHefte';

/**
 * Lernplaene der Eltern fuer das Kind (04.10.2026): alle laufenden Plaene,
 * nicht nur der naechste. Auf dem Kind-Start und auf der Faecher-Seite.
 * Tippen startet die Uebung zum heutigen Schwerpunkt des Plans.
 */

interface PlanTag {
  focus: string;
  title?: string;
}

export interface Lernplan {
  id: string;
  subject: string;
  topic: string;
  test_date: string | null;
  created_at: string;
  /** Tag, an dem das Kind den Plan zum ersten Mal geoeffnet hat */
  gestartet_am: string | null;
  plan_data: PlanTag[] | null;
}

/** Tag im Plan (1 …) und heutiger Schwerpunkt, Regeln in lib/lernplan.ts. */
function planStand(plan: Lernplan) {
  const z = planTagAm(plan);
  const heuteTag = Array.isArray(plan.plan_data) ? plan.plan_data[z.tag - 1] : undefined;
  return {
    ...z,
    schwerpunkt: heuteTag?.focus ?? null,
    topicHint: heuteTag ? `${plan.topic} – Schwerpunkt: ${heuteTag.focus}` : plan.topic,
  };
}

export function useLernplaene(kindId: string | undefined) {
  const [plaene, setPlaene] = useState<Lernplan[]>([]);
  useEffect(() => {
    if (!kindId) return;
    let aktiv = true;
    const heute = new Date().toLocaleDateString('sv-SE');
    supabase
      .from('learning_plans')
      .select('id, subject, topic, test_date, created_at, gestartet_am, plan_data')
      .eq('child_id', kindId)
      .or(`test_date.gte.${heute},test_date.is.null`)
      .order('test_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (!aktiv) return;
        // Ohne Testdatum: zeigen, bis alle Tage durch sind (danach noch 2 Tage).
        const liste = ((data ?? []) as unknown as Lernplan[]).filter((p) => {
          if (p.test_date) return true;
          if (!p.gestartet_am) return true;
          const anzahl = Array.isArray(p.plan_data) ? p.plan_data.length : 1;
          return differenceInCalendarDays(new Date(), new Date(`${p.gestartet_am}T00:00:00`)) < anzahl + 2;
        });
        setPlaene(liste);
      }, () => aktiv && setPlaene([]));
    return () => { aktiv = false; };
  }, [kindId]);
  return plaene;
}

export function LernplanListe({
  plaene,
  hefte,
  onStart,
  titel = 'Deine Lernpläne',
}: {
  plaene: Lernplan[];
  hefte?: Heft[];
  onStart: (fach: FachId, topicHint: string, planId: string) => void;
  titel?: string;
}) {
  if (plaene.length === 0) return null;
  return (
    <section aria-labelledby="lernplaene-titel">
      <h2 id="lernplaene-titel" className="mb-1 flex items-center gap-2 text-lg font-extrabold leading-tight">
        <Sparkles className="h-5 w-5 text-primary" />
        {titel}
      </h2>
      <p className="mb-3 text-sm text-muted-foreground">Von deinen Eltern für eine Klassenarbeit. Tipp drauf und übe den heutigen Schwerpunkt.</p>
      <ul className="space-y-3">
        {plaene.map((plan) => {
          const fach = plan.subject as FachId;
          const s = planStand(plan);
          const name = FAECHER.find((f) => f.id === fach)?.kurz ?? plan.subject;
          const farbe = farbeVon(hefte?.find((h) => h.fach === fach)?.farbe, fach);
          return (
            <li key={plan.id}>
              <button
                type="button"
                onClick={() => {
                  // Erstes Oeffnen = Tag 1 des Plans (einmalig, s. lernplan_starten()).
                  if (!plan.gestartet_am) void supabase.rpc('lernplan_starten', { p_plan_id: plan.id });
                  onStart(fach, s.topicHint, plan.id);
                }}
                className="flex w-full items-stretch overflow-hidden rounded-[20px] bg-card text-left ring-1 ring-inset ring-karo transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {/* Heftrand in der Farbe des Fachs */}
                <span aria-hidden="true" className="w-2.5 shrink-0" style={{ backgroundColor: farbe }} />
                <span className="min-w-0 flex-1 px-4 py-3.5">
                  <span className="flex flex-wrap items-center gap-x-2 text-sm font-bold text-muted-foreground">
                    <span className="text-tinte">{name}</span>
                    {plan.test_date && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Test am {format(new Date(plan.test_date), 'd. MMM', { locale: de })}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[1.0625rem] font-extrabold leading-snug text-tinte">
                    {s.fertig ? `Wiederholen: ${plan.topic}` : s.schwerpunkt ? `Heute: ${s.schwerpunkt}` : plan.topic}
                  </span>
                  <span className="mt-2 flex items-center gap-2">
                    <span className="flex gap-1" aria-hidden="true">
                      {Array.from({ length: s.anzahl }, (_, i) => (
                        <span
                          key={i}
                          className={`h-3 w-3 rounded-[3px] ring-1 ring-inset ${
                            // Vergangene Tage nur blass: Ob geuebt wurde, weiss die Karte nicht.
                            i + 1 < s.tag || s.fertig
                              ? 'bg-primary/25 ring-primary/25'
                              : i + 1 === s.tag
                                ? 'bg-primary ring-primary'
                                : 'bg-card ring-karo'
                          }`}
                        />
                      ))}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground">
                      {s.fertig
                        ? 'Alle Tage durch – jetzt wiederholen'
                        : s.gestartet
                          ? `Tag ${s.tag} von ${s.anzahl}`
                          : `${s.anzahl} Tage · startet, wenn du loslegst`}
                    </span>
                  </span>
                </span>
                <span className="grid place-items-center pr-3 text-muted-foreground">
                  <ChevronRight className="h-5 w-5" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isSubjectAvailableForGrade } from '@/lib/category';
import { FAECHER, STANDARD_FARBE, STICKER_PRO_HEFT, type FachId } from '@/lib/hefte';

export interface Heft {
  fach: FachId;
  farbe?: string;
  sticker: string[];
  /** Von den Eltern als Schwerpunkt markiert */
  wichtig: boolean;
}

/**
 * Hefte des Kindes: sichtbare Faecher (Elternvorgabe oder Klassenstufe), die
 * selbst gewaehlte Umschlagfarbe und die aufgeklebten Sticker, dazu die
 * Sticker-Sammlung. Aenderungen werden sofort gespeichert.
 *
 * Die Sichtbarkeit der Faecher folgt derselben Regel wie die Fachauswahl
 * (CategorySelector): Eltern-Einstellung, sonst Klassenstufe.
 */
export function useHefte(kindId: string | undefined, klasse: number) {
  const [faecher, setFaecher] = useState<{ fach: FachId; wichtig: boolean }[]>([]);
  const [gestaltung, setGestaltung] = useState<Record<string, { farbe?: string; sticker: string[] }>>({});
  const [sammlung, setSammlung] = useState<string[]>([]);
  const [laedt, setLaedt] = useState(true);

  const standardFaecher = useCallback(
    () => FAECHER.filter((f) => isSubjectAvailableForGrade(f.id, klasse)).map((f) => ({ fach: f.id, wichtig: false })),
    [klasse],
  );

  const laden = useCallback(async () => {
    if (!kindId) {
      setFaecher(standardFaecher());
      setLaedt(false);
      return;
    }
    try {
      const [bez, hefte, sticker] = await Promise.all([
        supabase.from('parent_child_relationships').select('parent_id').eq('child_id', kindId).limit(1),
        supabase.from('kind_hefte').select('fach, farbe, sticker').eq('child_id', kindId),
        supabase.from('kind_sticker').select('sticker').eq('child_id', kindId).order('created_at', { ascending: true }),
      ]);

      let liste = standardFaecher();
      const elternId = bez.data?.[0]?.parent_id;
      if (elternId) {
        const { data: sicht } = await supabase
          .from('child_subject_visibility')
          .select('subject, is_visible, is_priority')
          .eq('parent_id', elternId)
          .eq('child_id', kindId);
        if (sicht && sicht.length > 0) {
          const aus = new Set(sicht.filter((s) => !s.is_visible).map((s) => s.subject));
          const wichtig = new Set(sicht.filter((s) => s.is_priority).map((s) => s.subject));
          liste = FAECHER.filter((f) => !aus.has(f.id)).map((f) => ({ fach: f.id, wichtig: wichtig.has(f.id) }));
        }
      }
      liste.sort((a, b) => Number(b.wichtig) - Number(a.wichtig));
      setFaecher(liste);

      const g: Record<string, { farbe?: string; sticker: string[] }> = {};
      (hefte.data ?? []).forEach((h) => {
        g[h.fach] = { farbe: h.farbe, sticker: Array.isArray(h.sticker) ? (h.sticker as string[]) : [] };
      });
      setGestaltung(g);
      setSammlung((sticker.data ?? []).map((s) => s.sticker));
    } catch {
      setFaecher(standardFaecher());
    } finally {
      setLaedt(false);
    }
  }, [kindId, standardFaecher]);

  useEffect(() => {
    laden();
  }, [laden]);

  const speichern = useCallback(
    async (fach: FachId, aenderung: { farbe?: string; sticker?: string[] }) => {
      if (!kindId) return;
      const vorher = gestaltung[fach] ?? { sticker: [] };
      const neu = { farbe: aenderung.farbe ?? vorher.farbe, sticker: (aenderung.sticker ?? vorher.sticker).slice(0, STICKER_PRO_HEFT) };
      setGestaltung((g) => ({ ...g, [fach]: neu }));
      const { error } = await supabase.from('kind_hefte').upsert({
        child_id: kindId,
        fach,
        farbe: neu.farbe ?? STANDARD_FARBE[fach],
        sticker: neu.sticker,
        updated_at: new Date().toISOString(),
      });
      if (error) setGestaltung((g) => ({ ...g, [fach]: vorher }));
    },
    [kindId, gestaltung],
  );

  const hefte: Heft[] = faecher.map(({ fach, wichtig }) => ({
    fach,
    wichtig,
    farbe: gestaltung[fach]?.farbe,
    sticker: gestaltung[fach]?.sticker ?? [],
  }));

  /** Wie oft ein Sticker noch frei ist (Sammlung minus aufgeklebte) */
  const frei = (id: string) =>
    sammlung.filter((s) => s === id).length -
    Object.values(gestaltung).reduce((n, h) => n + h.sticker.filter((s) => s === id).length, 0);

  return { hefte, sammlung, laedt, speichern, frei, neuLaden: laden };
}

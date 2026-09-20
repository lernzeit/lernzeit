import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { screenTimePendingRequests } from '@/services/screenTime/plugin';

/**
 * Holt die Drücke auf „Eltern fragen“ vom Sperrbildschirm ab und macht sie
 * sichtbar.
 *
 * Warum es diesen Umweg gibt: Apples ShieldAction-Erweiterung darf keine App
 * öffnen und hat keinen angemeldeten Zugang zur Datenbank. Sie kann den Druck
 * nur in der App Group vermerken. Erst LernZeit selbst kann ihn weitergeben —
 * beim nächsten Start auf dem Gerät des Kindes.
 *
 * Zwei Rollen, zwei Aufgaben:
 *
 *   child    holt die gemerkten Zeitpunkte ab und schreibt sie weg
 *   parent   liest, was die verknüpften Kinder hinterlassen haben
 */

export interface ShieldAttempt {
  id: string;
  childId: string;
  attemptedAt: string;
}

/** Je Kind zusammengefasst — das ist die Form, die Eltern lesen wollen. */
export interface ShieldAttemptSummary {
  childId: string;
  childName: string;
  count: number;
  /** Jüngster Versuch, ISO-8601. */
  lastAttemptAt: string;
}

/**
 * Kindgerät: gemerkte Drücke abholen und speichern.
 *
 * Läuft einmal beim Start. Das Abholen LEERT die Liste im Gerät — schlägt das
 * Schreiben danach fehl, sind die Zeitpunkte verloren. Deshalb wird der
 * Fehler zwar geschluckt (ein Anzeigefehler darf die App nicht blockieren),
 * aber der eindeutige Index in der Datenbank sorgt dafür, dass ein erneuter
 * Versuch mit denselben Zeitpunkten keine Dubletten erzeugt.
 */
export function useSyncShieldAttempts(childId: string | undefined, enabled: boolean) {
  useEffect(() => {
    if (!childId || !enabled) return;
    let abgebrochen = false;

    const abholen = async () => {
      try {
        const { requestedAt } = await screenTimePendingRequests();
        if (abgebrochen || requestedAt.length === 0) return;

        await supabase.from('shield_attempts').upsert(
          requestedAt.map((zeitpunkt) => ({ child_id: childId, attempted_at: zeitpunkt })),
          { onConflict: 'child_id,attempted_at', ignoreDuplicates: true },
        );
      } catch {
        /* Kein Sperrbildschirm auf dieser Plattform, oder das Schreiben ging
           schief. Beides ist kein Grund, dem Kind einen Fehler zu zeigen. */
      }
    };

    void abholen();
    return () => { abgebrochen = true; };
  }, [childId, enabled]);
}

/**
 * Elternseite: die Versuche der verknüpften Kinder, jüngste zuerst.
 *
 * Bewusst nur die letzten sieben Tage: Ältere Versuche sagen nichts mehr über
 * die Lage von heute, und die Liste soll kurz bleiben.
 */
export function useShieldAttempts(parentId: string | undefined, enabled: boolean) {
  const [attempts, setAttempts] = useState<ShieldAttempt[]>([]);
  const [namen, setNamen] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const laden = useCallback(async () => {
    if (!parentId || !enabled) { setAttempts([]); return; }
    setLoading(true);
    const seit = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('shield_attempts')
      .select('id, child_id, attempted_at')
      .gte('attempted_at', seit)
      .order('attempted_at', { ascending: false })
      .limit(50);
    const zeilen = (data ?? []).map((zeile) => ({
      id: zeile.id,
      childId: zeile.child_id,
      attemptedAt: zeile.attempted_at,
    }));
    setAttempts(zeilen);

    // Namen nur für die Kinder holen, die tatsächlich vorkommen. Ohne
    // Versuche gibt es nichts anzuzeigen und nichts abzufragen.
    const kinder = [...new Set(zeilen.map((z) => z.childId))];
    if (kinder.length > 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', kinder);
      setNamen(Object.fromEntries((profile ?? []).map((p) => [p.id, p.name ?? ''])));
    } else {
      setNamen({});
    }
    setLoading(false);
  }, [parentId, enabled]);

  useEffect(() => { void laden(); }, [laden]);

  /**
   * Je Kind eine Zeile. Eine Liste einzelner Zeitstempel wäre für Eltern
   * unlesbar — interessant ist, WER es WIE OFT versucht hat und wann zuletzt.
   */
  const summaries: ShieldAttemptSummary[] = Object.values(
    attempts.reduce<Record<string, ShieldAttemptSummary>>((gesammelt, versuch) => {
      const vorhanden = gesammelt[versuch.childId];
      if (vorhanden) {
        vorhanden.count += 1;
        if (versuch.attemptedAt > vorhanden.lastAttemptAt) {
          vorhanden.lastAttemptAt = versuch.attemptedAt;
        }
      } else {
        gesammelt[versuch.childId] = {
          childId: versuch.childId,
          childName: namen[versuch.childId]?.trim() || 'Dein Kind',
          count: 1,
          lastAttemptAt: versuch.attemptedAt,
        };
      }
      return gesammelt;
    }, {}),
  ).sort((a, b) => b.lastAttemptAt.localeCompare(a.lastAttemptAt));

  return { attempts, summaries, loading, reload: laden };
}

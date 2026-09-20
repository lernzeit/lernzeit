import { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ShieldSetupNoticeProps {
  parentId: string;
}

interface KindStand {
  childId: string;
  name: string;
  verwaltet: boolean;
}

/**
 * Sagt Eltern auf IHREM Gerät, ob die Sperre auf dem Handy des Kindes steht.
 *
 * ── Warum es das braucht ─────────────────────────────────────────────────
 *
 * Die Sperre lebt in einer App Group auf dem Telefon des Kindes. Von außen
 * ist sie unsichtbar: Eltern richten sie ein, geben das Handy zurück und
 * wissen danach nicht, ob es geklappt hat. Beim ersten Anlauf war genau das
 * das Problem — gebaut war alles, erkennbar nichts.
 *
 * Das Kindgerät meldet seinen Stand deshalb über
 * `set_screen_time_managed()`; hier wird er gelesen.
 *
 * ── Was hier bewusst nicht steht ─────────────────────────────────────────
 *
 * Kein Knopf. Aus der Ferne lässt sich nichts schalten — ManagedSettings
 * kennt keinen Fernzugriff. Ein Schalter hier wäre eine Lüge.
 */
export function ShieldSetupNotice({ parentId }: ShieldSetupNoticeProps) {
  const [staende, setStaende] = useState<KindStand[]>([]);

  useEffect(() => {
    if (!parentId) { setStaende([]); return; }
    let abgebrochen = false;

    const laden = async () => {
      const { data: einstellungen } = await supabase
        .from('child_settings')
        .select('child_id, screen_time_managed')
        .eq('parent_id', parentId);

      if (abgebrochen || !einstellungen || einstellungen.length === 0) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', einstellungen.map((zeile) => zeile.child_id));

      if (abgebrochen) return;

      const namen = Object.fromEntries((profile ?? []).map((p) => [p.id, p.name ?? '']));
      setStaende(einstellungen.map((zeile) => ({
        childId: zeile.child_id,
        name: namen[zeile.child_id]?.trim() || 'Dein Kind',
        verwaltet: zeile.screen_time_managed,
      })));
    };

    void laden();
    return () => { abgebrochen = true; };
  }, [parentId]);

  // Nur zeigen, wo noch nichts eingerichtet ist. Wo die Sperre läuft, ist der
  // Hinweis überflüssig — Eltern merken es daran, dass Anfragen kommen.
  const offen = staende.filter((stand) => !stand.verwaltet);
  if (offen.length === 0) return null;

  return (
    <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Smartphone className="h-4 w-4 text-blue-600" />
        Handysperre noch nicht eingerichtet
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {offen.length === 1
          ? `Auf dem Handy von ${offen[0].name} sperrt LernZeit noch nicht.`
          : `Auf den Handys von ${offen.map((stand) => stand.name).join(' und ')} sperrt LernZeit noch nicht.`}
        {' '}Du gibst genehmigte Zeit bis dahin wie bisher von Hand frei.
      </p>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Zum Einrichten brauchst du das Handy deines Kindes einmal in der Hand:
        LernZeit öffnen, Einstellungen, „Handy sperren“ — ein Knopf, danach
        fragt iOS nach deiner Bildschirmzeit-Kennung. Apps auswählen musst du
        nicht. Von hier aus geht es nicht: Apple lässt eine Sperre nur auf dem
        Gerät setzen, auf dem sie greift.
      </p>
    </div>
  );
}

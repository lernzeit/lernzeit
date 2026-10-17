import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KeyRound, Moon, Smartphone } from 'lucide-react';
import { ScreenTime, kannTagesbudget, screenTimeSupportedPlatform } from '@/services/screenTime/plugin';
import { HANDYZEIT_GEAENDERT } from '@/services/screenTime/release';
import { anteilGenutzt, ohneLimit, standText } from '@/lib/handyzeit';
import type { ShieldStatus } from '@/services/screenTime/types';
import { NotfallPauseDialog } from '@/components/screenTime/NotfallCode';

interface BaseTimeCardProps {
  childId: string;
}

const uhr = (iso: string) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
const alsZeit = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/**
 * „Deine Handyzeit heute“ auf dem Kinder-Handy (17.10.2026).
 *
 * Wie Apples Bildschirmzeit: Das Handy ist offen, bis die Minuten des Tages
 * genutzt sind — ohne Knopf. Vorher musste das Kind „Freiminuten starten“
 * tippen, und ohne „Was zählt als Handyzeit?“ lief die Zeit nach Uhr ab.
 * Gezählt wird jetzt immer nur, während das Handy benutzt wird.
 *
 * Ist es zu (aufgebraucht oder Ruhezeit), öffnet ein Elterncode das Handy
 * für eine kurze Zeit (NotfallCode.tsx).
 */
export function BaseTimeCard({ childId }: BaseTimeCardProps) {
  const [stand, setStand] = useState<ShieldStatus | null>(null);
  const [codeOffen, setCodeOffen] = useState(false);

  const laden = useCallback(async () => {
    if (!childId || !screenTimeSupportedPlatform()) return;
    try {
      setStand(await ScreenTime.getStatus());
    } catch {
      /* Zustand nicht lesbar: Karte bleibt weg. */
    }
  }, [childId]);

  useEffect(() => {
    void laden();
    const neu = () => void laden();
    window.addEventListener(HANDYZEIT_GEAENDERT, neu);
    const sichtbar = () => { if (document.visibilityState === 'visible') void laden(); };
    document.addEventListener('visibilitychange', sichtbar);
    return () => {
      window.removeEventListener(HANDYZEIT_GEAENDERT, neu);
      document.removeEventListener('visibilitychange', sichtbar);
    };
  }, [laden]);

  if (!stand?.managing || !kannTagesbudget(stand)) return null;

  const notfall = stand.notfallBis && new Date(stand.notfallBis) > new Date() ? stand.notfallBis : null;
  const budget = stand.tagesbudget ?? null;
  const tagesStand = { budget, genutzt: stand.genutzt ?? 0, aufgebraucht: Boolean(stand.aufgebraucht) };
  const zu = !notfall && (Boolean(stand.ruhezeit) || tagesStand.aufgebraucht);

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 font-bold text-tinte">
          {stand.ruhezeit && !notfall ? <Moon className="h-4 w-4 text-primary" /> : <Smartphone className="h-4 w-4 text-primary" />}
          Deine Handyzeit heute
        </div>

        {notfall ? (
          <p className="text-sm text-muted-foreground">Mit Elterncode offen bis <strong>{uhr(notfall)} Uhr</strong>.</p>
        ) : stand.ruhezeit ? (
          <p className="text-sm text-muted-foreground">
            Ruhezeit{stand.ruheBis != null ? <> bis <strong>{alsZeit(stand.ruheBis)} Uhr</strong></> : null}. Telefon und LernZeit gehen.
          </p>
        ) : budget == null ? (
          <p className="text-sm text-muted-foreground">Ein Elternteil wählt noch „Was zählt als Handyzeit?“ (Einstellungen → Bildschirmzeit → „Handy sperren“).</p>
        ) : (
          <>
            <p className="text-sm text-tinte"><strong>{standText(tagesStand)}</strong></p>
            {!ohneLimit(budget) && (
              <div className="h-2 overflow-hidden rounded-full bg-karo" aria-hidden>
                <div className={`h-full rounded-full ${tagesStand.aufgebraucht ? 'bg-rotstift' : 'bg-primary'}`}
                  style={{ width: `${Math.round(anteilGenutzt(tagesStand) * 100)}%` }} />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {tagesStand.aufgebraucht ? 'Mehr Zeit gibt es fürs Lernen.' : 'Zählt nur, wenn du das Handy benutzt.'}
            </p>
          </>
        )}

        {zu && (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setCodeOffen(true)}>
            <KeyRound className="h-4 w-4 mr-2" />
            Elterncode eingeben
          </Button>
        )}
      </CardContent>
      <NotfallPauseDialog open={codeOffen} onOpenChange={(o) => { setCodeOffen(o); if (!o) void laden(); }} />
    </Card>
  );
}

import { Trophy } from 'lucide-react';
import { useAchievements } from '@/hooks/useAchievements';

/**
 * Erfolge als Kachel neben der Lernpflanze auf dem Kind-Start (05.10.2026,
 * ersetzt dort die Hefte). Zeigt, wie viele Erfolge erreicht sind, und den
 * naechsten, der am weitesten ist – das motiviert mehr als eine Liste.
 * Antippen oeffnet alle Erfolge.
 */
export function ErfolgeKachel({ userId, onClick }: { userId: string; onClick: () => void }) {
  const { userAchievements, getCompletedAchievements, loading } = useAchievements(userId, { suppressToast: true });
  const erreicht = getCompletedAchievements().length;

  const anteil = (a: (typeof userAchievements)[number]) =>
    a.requirement_value > 0 ? Math.min(1, (a.current_progress || 0) / a.requirement_value) : 0;
  const naechster = userAchievements
    .filter((a) => !a.is_completed)
    .sort((a, b) => anteil(b) - anteil(a) || a.requirement_value - b.requirement_value)[0];
  const stand = naechster ? Math.max(0, Math.min(naechster.current_progress || 0, naechster.requirement_value)) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Erfolge: ${erreicht} erreicht${naechster ? `, als Nächstes ${naechster.name}` : ''}`}
      className="flex h-full w-full flex-col items-center gap-1 rounded-[20px] bg-card px-3 pb-3 pt-2 text-center ring-1 ring-inset ring-karo transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="grid h-16 w-16 place-items-center">
        <Trophy className="h-11 w-11 text-warning" strokeWidth={2.2} />
      </span>
      <span className="text-2xl font-extrabold leading-none text-tinte">
        <span className="tabular">{loading ? '…' : erreicht}</span> {erreicht === 1 ? 'Erfolg' : 'Erfolge'}
      </span>
      <span className="text-xs font-bold text-muted-foreground">{erreicht ? 'erreicht' : 'Sammle deinen ersten'}</span>
      {naechster && !loading && (
        <span className="mt-1 w-full">
          <span className="block truncate text-[11px] text-muted-foreground">Nächster: {naechster.name}</span>
          <span className="mt-1 block h-2 w-full overflow-hidden rounded-full bg-karo" aria-hidden="true">
            <span className="block h-full rounded-full bg-warning" style={{ width: `${Math.round(anteil(naechster) * 100)}%` }} />
          </span>
          <span className="tabular mt-0.5 block text-[11px] font-bold text-tinte">
            {stand} / {naechster.requirement_value}
          </span>
        </span>
      )}
    </button>
  );
}

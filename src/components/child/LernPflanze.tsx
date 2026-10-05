import { useEffect, useState } from 'react';
import { Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { StreakStatus } from '@/hooks/useStreak';

/*
 * Lernpflanze statt Lernfeuer (App-Redesign, Wunsch 04.10.2026): Das rote
 * Feuer wirkte wie eine Warnung. Die Pflanze waechst mit jedem Tag, an dem
 * gelernt wird, vom Samen bis zum Baum. Einen Tag Pause sieht man ihr an
 * (durstig), nach zwei Tagen welkt sie und laesst sich mit einer Runde
 * giessen. Logik unveraendert aus useStreak/StreakFireCard.
 */

export type Stufe = 'samen' | 'keimling' | 'pflanze' | 'bluete' | 'baeumchen' | 'baum';

export const STUFEN: { id: Stufe; ab: number; name: string }[] = [
  { id: 'samen', ab: 0, name: 'Samen' },
  { id: 'keimling', ab: 1, name: 'Keimling' },
  { id: 'pflanze', ab: 3, name: 'Kleine Pflanze' },
  { id: 'bluete', ab: 7, name: 'Blume' },
  { id: 'baeumchen', ab: 14, name: 'Bäumchen' },
  { id: 'baum', ab: 30, name: 'Baum' },
];

export const stufeFuer = (tage: number) => [...STUFEN].reverse().find((s) => tage >= s.ab) ?? STUFEN[0];

type Zustand = 'frisch' | 'durstig' | 'welk';

const BLATT = { frisch: '#13c96a', durstig: '#7fbf5a', welk: '#b6a066' };
const BLATT_DUNKEL = { frisch: '#0b9a50', durstig: '#5f9a43', welk: '#93804c' };

/** Die Pflanze als Zeichnung, im Topf. */
export function PflanzenBild({ stufe, zustand = 'frisch', className = '' }: { stufe: Stufe; zustand?: Zustand; className?: string }) {
  const b = BLATT[zustand];
  const d = BLATT_DUNKEL[zustand];
  const neigung = zustand === 'frisch' ? 0 : zustand === 'durstig' ? 8 : 18;
  return (
    <svg viewBox="0 0 64 64" className={cn('h-10 w-10', className)} aria-hidden="true">
      {/* Pflanze */}
      <g style={{ transform: `rotate(${neigung}deg)`, transformOrigin: '32px 44px' }}>
        {stufe === 'samen' && <ellipse cx="32" cy="42" rx="4" ry="2.6" fill="#8a5a3c" />}
        {stufe === 'keimling' && (
          <>
            <path d="M32 44 V34" stroke={d} strokeWidth="2.4" strokeLinecap="round" />
            <path d="M32 36 C 26 36, 24 31, 25 29 C 29 29, 32 32, 32 36 Z" fill={b} />
            <path d="M32 35 C 38 35, 40 30, 39 28 C 35 28, 32 31, 32 35 Z" fill={b} />
          </>
        )}
        {stufe === 'pflanze' && (
          <>
            <path d="M32 44 V24" stroke={d} strokeWidth="2.6" strokeLinecap="round" />
            <path d="M32 38 C 24 38, 21 32, 22 29 C 27 29, 32 33, 32 38 Z" fill={b} />
            <path d="M32 33 C 40 33, 43 27, 42 24 C 37 24, 32 28, 32 33 Z" fill={b} />
            <path d="M32 28 C 26 27, 25 22, 26 20 C 30 21, 32 24, 32 28 Z" fill={b} />
            <path d="M32 25 C 36 24, 38 20, 37 18 C 34 18, 32 21, 32 25 Z" fill={b} />
          </>
        )}
        {stufe === 'bluete' && (
          <>
            <path d="M32 44 V20" stroke={d} strokeWidth="2.6" strokeLinecap="round" />
            <path d="M32 38 C 24 38, 21 32, 22 29 C 27 29, 32 33, 32 38 Z" fill={b} />
            <path d="M32 32 C 40 32, 43 26, 42 23 C 37 23, 32 27, 32 32 Z" fill={b} />
            {[0, 72, 144, 216, 288].map((w) => (
              <ellipse key={w} cx="32" cy="12" rx="3.6" ry="5.4" fill={zustand === 'welk' ? '#c9a95a' : '#f2b21b'} style={{ transform: `rotate(${w}deg)`, transformOrigin: '32px 17px' }} />
            ))}
            <circle cx="32" cy="17" r="3.4" fill={zustand === 'welk' ? '#8a6a3c' : '#e8710f'} />
          </>
        )}
        {(stufe === 'baeumchen' || stufe === 'baum') && (
          <>
            <path d={stufe === 'baum' ? 'M29 45 L30 30 L34 30 L35 45 Z' : 'M30.5 45 L31 32 L33 32 L33.5 45 Z'} fill="#8a5a3c" />
            <circle cx="32" cy={stufe === 'baum' ? 20 : 25} r={stufe === 'baum' ? 13 : 9} fill={b} />
            <circle cx={stufe === 'baum' ? 22 : 25} cy={stufe === 'baum' ? 25 : 28} r={stufe === 'baum' ? 8 : 5.5} fill={d} />
            <circle cx={stufe === 'baum' ? 42 : 39} cy={stufe === 'baum' ? 25 : 28} r={stufe === 'baum' ? 8 : 5.5} fill={d} />
            {stufe === 'baum' && zustand !== 'welk' && (
              <>
                <circle cx="26" cy="17" r="2.6" fill="#d4483b" />
                <circle cx="38" cy="15" r="2.6" fill="#d4483b" />
                <circle cx="33" cy="26" r="2.6" fill="#d4483b" />
              </>
            )}
          </>
        )}
      </g>
      {/* Topf */}
      <path d="M17 44 H47 L44 59 H20 Z" fill="#1a2b6d" />
      <rect x="15" y="41" width="34" height="6" rx="2" fill="#2a3d8f" />
    </svg>
  );
}

interface Props {
  streak: number;
  status: StreakStatus;
  inactiveDays: number;
  loading?: boolean;
  reactivationTrigger?: number;
  onStartRecovery: () => void;
  /**
   * 'abzeichen': kleiner Knopf (frueher oben im Kopf). 'kachel': grosse Kachel
   * im Bereich "Deine Erfolge" auf dem Kind-Start (seit 05.10.2026).
   */
  variante?: 'abzeichen' | 'kachel';
}

/** Lernpflanze auf dem Kind-Start; antippen zeigt sie gross mit allen Stufen. */
export function LernPflanze({ streak, status, inactiveDays, loading, reactivationTrigger = 0, onStartRecovery, variante = 'abzeichen' }: Props) {
  const [offen, setOffen] = useState(false);
  const [gegossen, setGegossen] = useState(false);
  const rettbar = inactiveDays > 0 && inactiveDays <= 2 && streak > 0;
  const neu = inactiveDays >= 3 || streak === 0;
  const tage = neu ? 0 : streak;
  const stufe = stufeFuer(tage);
  const naechste = STUFEN.find((s) => s.ab > tage);
  const zustand: Zustand = neu ? 'frisch' : status === 'frozen' ? 'welk' : status === 'dim' ? 'durstig' : 'frisch';

  useEffect(() => {
    if (reactivationTrigger <= 0) return;
    setGegossen(true);
    const t = window.setTimeout(() => setGegossen(false), 1800);
    return () => window.clearTimeout(t);
  }, [reactivationTrigger]);

  const beschriftung = `Lernpflanze: ${stufe.name}, ${tage} ${tage === 1 ? 'Tag' : 'Tage'} in Folge gelernt`;
  // Fortschritt bis zur naechsten Stufe als Kaestchen (wie im Spiel)
  const kaestchen = naechste ? naechste.ab - stufe.ab : 0;
  const gefuellt = naechste ? tage - stufe.ab : 0;

  return (
    <>
      {variante === 'kachel' ? (
        <button
          type="button"
          onClick={() => setOffen(true)}
          aria-label={beschriftung}
          className={cn(
            'flex h-full w-full flex-col items-center gap-1 rounded-[20px] bg-card px-3 pb-3 pt-2 text-center ring-1 ring-inset ring-karo transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            gegossen && 'animate-scale-in-bounce',
          )}
        >
          <PflanzenBild stufe={stufe.id} zustand={zustand} className="h-16 w-16" />
          <span className="text-2xl font-extrabold leading-none text-tinte">
            <span className="tabular">{loading ? '…' : tage}</span> {tage === 1 ? 'Tag' : 'Tage'}
          </span>
          <span className={cn('text-xs font-bold', zustand === 'frisch' ? 'text-gruen-text' : 'text-primary')}>
            {neu ? 'Lern heute, dann keimt er' : zustand === 'welk' ? 'Gieß deine Pflanze' : zustand === 'durstig' ? 'Deine Pflanze hat Durst' : 'in Folge gelernt'}
          </span>
          {naechste && kaestchen <= 16 && !loading && (
            <span className="mt-1 flex flex-wrap justify-center gap-0.5" aria-hidden="true">
              {Array.from({ length: kaestchen }, (_, i) => (
                <span key={i} className={cn('h-2 w-2 rounded-[2px]', i < gefuellt ? 'bg-gruen-hell' : 'bg-karo')} />
              ))}
            </span>
          )}
          {naechste && !loading && (
            <span className="text-[11px] text-muted-foreground">
              Noch {naechste.ab - tage} {naechste.ab - tage === 1 ? 'Tag' : 'Tage'} bis {naechste.name}
            </span>
          )}
        </button>
      ) : (
      <button
        type="button"
        onClick={() => setOffen(true)}
        aria-label={beschriftung}
        className={cn(
          'inline-flex h-10 items-center gap-1 rounded-full pl-1 pr-3 text-sm font-extrabold ring-1 ring-inset transition-colors',
          zustand === 'frisch' ? 'bg-gruen-hell/10 text-gruen-text ring-gruen-hell/30' : 'bg-card text-tinte ring-karo',
          gegossen && 'animate-scale-in-bounce',
        )}
      >
        <PflanzenBild stufe={stufe.id} zustand={zustand} className="h-8 w-8" />
        <span className="tabular">{loading ? '…' : tage}</span>
        {zustand !== 'frisch' && <Droplets className="h-4 w-4 text-primary" />}
      </button>
      )}

      <Dialog open={offen} onOpenChange={setOffen}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="items-center text-center">
            <PflanzenBild stufe={stufe.id} zustand={zustand} className="h-32 w-32" />
            <DialogTitle className="text-2xl">
              {neu ? 'Ein neuer Samen' : zustand === 'welk' ? 'Deine Pflanze welkt' : zustand === 'durstig' ? 'Deine Pflanze hat Durst' : stufe.name}
            </DialogTitle>
            <DialogDescription className="text-base">
              {neu
                ? 'Lern heute eine Runde, dann keimt er.'
                : `Du hast ${tage} ${tage === 1 ? 'Tag' : 'Tage'} hintereinander gelernt.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-center text-sm text-muted-foreground">
            {rettbar ? (
              <p>Gieß sie mit einer Runde. Ob richtig oder falsch, ist egal. Diese Runde gibt keine Minuten.</p>
            ) : naechste && !neu ? (
              <p>
                Lern jeden Tag, dann wächst sie. Ab {naechste.ab} Tagen wird sie zur Stufe <span className="font-bold text-tinte">{naechste.name}</span>.
              </p>
            ) : !neu ? (
              <p>Ein ganzer Baum! Lern jeden Tag, damit er so bleibt.</p>
            ) : null}
            {/* Wachstumsleiste: alle Stufen, erreichte kraeftig */}
            <ol className="flex items-end justify-between gap-1 border-t border-karo pt-4" aria-label="Stufen der Lernpflanze">
              {STUFEN.map((s) => (
                <li key={s.id} className={cn('flex flex-col items-center gap-1', tage < s.ab && 'opacity-35')}>
                  <PflanzenBild stufe={s.id} className="h-9 w-9" />
                  <span className="tabular text-[11px] font-bold text-tinte">{s.ab === 0 ? 'Start' : `${s.ab} T.`}</span>
                </li>
              ))}
            </ol>
            {rettbar && (
              <Button className="w-full" size="lg" onClick={() => { setOffen(false); onStartRecovery(); }}>
                <Droplets className="h-4 w-4" />
                Pflanze gießen
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

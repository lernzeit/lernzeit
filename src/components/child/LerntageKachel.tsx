import { useEffect, useState } from 'react';
import { Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Klecksi } from '@/components/klecksi/Klecksi';
import { cn } from '@/lib/utils';
import {
  KLECKS_STUFEN, istRettbar, lernStand, naechsteStufe, stufenErklaerung, stufenSatz, stufenTitel, stufeName,
  type Frische, type Groesse, type LernStand,
} from '@/lib/klecksiLernstand';

/*
 * Lerntage in Folge als Klecksi (11.10.2026, ersetzt die Lernpflanze): Jeden
 * Tag faellt ein Tropfen Tinte auf den Klecks, er waechst und glaenzt (3, 7,
 * 14, 30 Tage). Ohne Tinte wird er kleiner und blasser, dann trocknet er aus
 * und ruht, bis das Kind wieder lernt. Eine Runde, und er ist wieder
 * farbig. Rechnung und Rettungsrunde unveraendert aus useStreak; die Regeln
 * stehen in lib/klecksiLernstand.ts. Ohne Klecksi (aeltere Kinder) zeigt die
 * Kachel statt der Figur einen Tintentropfen mit denselben Stufen.
 */

const TROPFEN_FARBE: Record<Frische, { fuell: string; rand: string }> = {
  frisch: { fuell: '#2563eb', rand: '#1a2b6d' },
  blass: { fuell: '#7b9bea', rand: '#4a5f9e' },
  trocknet: { fuell: '#9bb0e2', rand: '#6d80b2' },
  trocken: { fuell: '#b3c1de', rand: '#8394bd' },
};
const TROPFEN_HOEHE: Record<Groesse, number> = { 0: 30, 1: 38, 2: 46, 3: 54, 4: 62 };

/** Tintentropfen fuer Kinder ohne Klecksi: gleiche Stufen, ohne Gesicht */
export function TropfenBild({ stand, faktor = 1, className }: { stand: LernStand; /** 1 = Groesse in der Kachel */ faktor?: number; className?: string }) {
  const { fuell, rand } = TROPFEN_FARBE[stand.frische];
  const hoehe = TROPFEN_HOEHE[stand.stufe] * faktor;
  const glanzt = stand.frische === 'frisch';
  return (
    <svg width={hoehe * (18 / 22)} height={hoehe} viewBox="0 0 18 22" overflow="visible" aria-hidden="true" className={className}>
      <path d="M9 1.5C9 1.5 2 9.6 2 14.2A7 7 0 0 0 16 14.2C16 9.6 9 1.5 9 1.5Z" fill={fuell} stroke={rand} strokeWidth="1.5" strokeLinejoin="round" />
      {stand.frische !== 'trocken' && stand.frische !== 'trocknet' && stand.stufe >= 1 && (
        <ellipse cx="6.6" cy="13.6" rx="1.6" ry="2.4" fill="#fff" opacity={glanzt ? 0.7 : 0.35} />
      )}
      {(stand.frische === 'trocknet' || stand.frische === 'trocken') && (
        <path d="M5.5 16 L8.4 13.2 L7.6 10.4" fill="none" stroke={rand} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {stand.frische === 'trocken' && (
        <path d="M13 15.8 L10.8 13.4 L12 11.2" fill="none" stroke={rand} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {glanzt && stand.stufe >= 3 && (
        <path d="M15.6 5.4 Q15.6 7 17.2 7 Q15.6 7 15.6 8.6 Q15.6 7 14 7 Q15.6 7 15.6 5.4 Z" fill="#93c5fd" />
      )}
      {glanzt && stand.stufe >= 4 && (
        <path d="M2.4 3.2 Q2.4 4.6 3.8 4.6 Q2.4 4.6 2.4 6 Q2.4 4.6 1 4.6 Q2.4 4.6 2.4 3.2 Z" fill="#93c5fd" />
      )}
    </svg>
  );
}

/** Klecksi oder (ohne Klecksi) der Tropfen, im Lernstand */
export function LerntageBild({ stand, mitKlecksi = true, groesse = 72 }: { stand: LernStand; mitKlecksi?: boolean; groesse?: number }) {
  return mitKlecksi ? <Klecksi groesse={groesse} stand={stand} /> : <TropfenBild stand={stand} faktor={groesse / 68} />;
}

interface Props {
  streak: number;
  inactiveDays: number;
  /** Es gab schon mindestens eine Runde (sonst ist Klecksi neu, nicht trocken) */
  hatGelernt?: boolean;
  loading?: boolean;
  reactivationTrigger?: number;
  onStartRecovery: () => void;
  mitKlecksi?: boolean;
  /** Wochenziel (Stufe 3, 11.10.2026): Lerntage dieser Woche (Mo–So) */
  wochenTage?: number;
  wochenZiel?: number;
}

/** Lerntage auf dem Kind-Start; antippen zeigt alle Stufen und, wenn noetig, die Rettungsrunde. */
export function LerntageKachel({
  streak, inactiveDays, hatGelernt = true, loading, reactivationTrigger = 0, onStartRecovery,
  mitKlecksi = true, wochenTage, wochenZiel = 4,
}: Props) {
  const [offen, setOffen] = useState(false);
  const [bekommen, setBekommen] = useState(false);
  const tage = Math.max(0, streak);
  const stand = lernStand(tage, inactiveDays, hatGelernt);
  const rettbar = istRettbar(tage, inactiveDays);
  const naechste = naechsteStufe(tage);
  const stufeAb = KLECKS_STUFEN[stand.stufe].ab;

  useEffect(() => {
    if (reactivationTrigger <= 0) return;
    setBekommen(true);
    const t = window.setTimeout(() => setBekommen(false), 1800);
    return () => window.clearTimeout(t);
  }, [reactivationTrigger]);

  const beschriftung = `${stufenTitel(stand, tage, mitKlecksi)}, ${tage} ${tage === 1 ? 'Tag' : 'Tage'} in Folge gelernt`;
  // Fortschritt bis zur naechsten Stufe als Kaestchen (wie im Spiel)
  const kaestchen = naechste ? naechste.ab - stufeAb : 0;
  const gefuellt = naechste ? Math.max(0, tage - stufeAb) : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        aria-label={beschriftung}
        className={cn(
          'flex h-full w-full flex-col items-center gap-1 rounded-[20px] bg-card px-3 pb-3 pt-2 text-center ring-1 ring-inset ring-karo transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          bekommen && 'animate-scale-in-bounce',
        )}
      >
        <span className="flex h-[88px] items-end justify-center">
          <LerntageBild stand={stand} mitKlecksi={mitKlecksi} groesse={68} />
        </span>
        <span className="text-2xl font-extrabold leading-none text-tinte">
          <span className="tabular">{loading ? '…' : tage}</span> {tage === 1 ? 'Tag' : 'Tage'}
        </span>
        <span className={cn('text-xs font-bold', stand.frische === 'frisch' ? 'text-gruen-text' : 'text-primary')}>
          {stufenSatz(stand, tage, mitKlecksi)}
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
            Noch {naechste.ab - tage} {naechste.ab - tage === 1 ? 'Tag' : 'Tage'} bis {stufeName(naechste.stufe, mitKlecksi)}
          </span>
        )}
        {/* Wochenziel: verzeiht Pausentage, anders als die Tage in Folge */}
        {wochenTage !== undefined && !loading && (
          <span className="mt-1.5 w-full border-t border-dashed border-karo pt-1.5">
            <span className="flex justify-center gap-1" aria-hidden="true">
              {Array.from({ length: wochenZiel }, (_, i) => (
                <span key={i} className={cn('h-3 w-3 rounded-[3px] ring-1 ring-inset', i < wochenTage ? 'bg-primary ring-primary' : 'bg-card ring-karo')} />
              ))}
            </span>
            <span className="mt-0.5 block text-[11px] font-bold text-tinte">
              {wochenTage >= wochenZiel ? 'Wochenziel geschafft!' : `${wochenTage} von ${wochenZiel} Lerntagen diese Woche`}
            </span>
          </span>
        )}
      </button>

      <Dialog open={offen} onOpenChange={setOffen}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="items-center text-center">
            <span className="flex h-36 items-end justify-center">
              <LerntageBild stand={stand} mitKlecksi={mitKlecksi} groesse={124} />
            </span>
            <DialogTitle className="text-2xl">{stufenTitel(stand, tage, mitKlecksi)}</DialogTitle>
            <DialogDescription className="text-base">{stufenErklaerung(stand, tage, mitKlecksi)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-center text-sm text-muted-foreground">
            {rettbar ? (
              <p>Eine Runde Tinte genügt. Ob richtig oder falsch, ist egal. Diese Runde gibt keine Minuten.</p>
            ) : stand.frische === 'trocken' ? (
              <p>Deine Tage in Folge fangen dann wieder bei 1 an.</p>
            ) : naechste ? (
              <p>
                Lern jeden Tag, dann wächst {mitKlecksi ? 'Klecksi' : 'der Tropfen'}. Ab {naechste.ab} Tagen heißt er{' '}
                <span className="font-bold text-tinte">{stufeName(naechste.stufe, mitKlecksi)}</span>.
              </p>
            ) : (
              <p>Ganz groß und strahlend! Lern jeden Tag, damit {mitKlecksi ? 'Klecksi' : 'der Tropfen'} so bleibt.</p>
            )}
            {/* Wachstumsleiste: alle Stufen, erreichte kraeftig */}
            <ol className="flex items-end justify-between gap-1 border-t border-karo pt-4" aria-label="Stufen der Lerntage">
              {KLECKS_STUFEN.map((s) => (
                <li key={s.stufe} className={cn('flex flex-col items-center gap-1', tage < s.ab && 'opacity-40')}>
                  <LerntageBild stand={{ stufe: s.stufe, frische: 'frisch' }} mitKlecksi={mitKlecksi} groesse={44} />
                  <span className="tabular text-[11px] font-bold text-tinte">{s.ab === 0 ? 'Start' : `${s.ab} T.`}</span>
                </li>
              ))}
            </ol>
            {rettbar && (
              <Button className="w-full" size="lg" onClick={() => { setOffen(false); onStartRecovery(); }}>
                <Droplets className="h-4 w-4" />
                {mitKlecksi ? 'Klecksi Tinte geben' : 'Tropfen beleben'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

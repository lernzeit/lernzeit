import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, UserPlus, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sticker } from '@/components/child/Hefte';
import { STICKER } from '@/lib/hefte';

interface GameCompletionScreenProps {
  score: number;
  totalQuestions: number;
  sessionDuration: number;
  timePerTask: number;
  achievementBonusMinutes: number;
  perfectSessionBonus?: number;
  grade?: number;
  isStreakRecovery?: boolean;
  onContinue: () => void;
  /** Demo auf der Landingpage: statt "Weiter" folgt der Registrierungs-Hinweis. */
  demoMode?: boolean;
  onDemoSignUp?: () => void;
  /** Kennung eines eben gewonnenen Stickers (alles richtig) */
  neuerSticker?: string | null;
  /** Alles richtig: Sticker zur Auswahl; Wert = Sticker, die das Kind schon hat */
  stickerWahl?: string[] | null;
  onStickerWaehlen?: (id: string) => Promise<void>;
}

export function GameCompletionScreen({
  score,
  totalQuestions,
  sessionDuration,
  timePerTask,
  achievementBonusMinutes,
  perfectSessionBonus = 0,
  grade = 5,
  isStreakRecovery = false,
  onContinue,
  demoMode = false,
  onDemoSignUp,
  neuerSticker = null,
  stickerWahl = null,
  onStickerWaehlen,
}: GameCompletionScreenProps) {
  const [speichert, setSpeichert] = useState<string | null>(null);
  // Noch fehlende Sticker zuerst; hat das Kind alle, darf es jeden nochmal nehmen
  const fehlend = Object.keys(STICKER).filter((id) => !stickerWahl?.includes(id));
  const angebot = fehlend.length ? fehlend : Object.keys(STICKER);
  const earnedSeconds = isStreakRecovery ? 0 : score * timePerTask;
  const timeSpentSeconds = Math.round(sessionDuration / 1000);
  const perfectSessionBonusSeconds = isStreakRecovery ? 0 : perfectSessionBonus * 60;
  const netTimeSeconds = isStreakRecovery ? 0 : Math.max(0, earnedSeconds - timeSpentSeconds + (achievementBonusMinutes * 60) + perfectSessionBonusSeconds);
  const efficiency = Math.round((score / totalQuestions) * 100);
  const earnedMinutes = Number((netTimeSeconds / 60).toFixed(1));

  const isYoung = grade <= 4;

  // Determine celebration level
  const getCelebrationLevel = () => {
    if (efficiency >= 90) return 'excellent';
    if (efficiency >= 70) return 'good';
    return 'okay';
  };

  const celebrationLevel = getCelebrationLevel();

  // Kaestchen wie im Spiel: so viele gruen abgehakt, wie richtig waren
  const kaestchen = (
    <ol className="flex flex-wrap justify-center gap-1.5" aria-label={`${score} von ${totalQuestions} richtig`}>
      {Array.from({ length: totalQuestions }, (_, i) => (
        <li
          key={i}
          aria-hidden="true"
          className={cn(
            'grid h-6 w-6 place-items-center rounded-[6px] ring-1 ring-inset ring-karo',
            i < score ? 'bg-gruen-hell text-white ring-0' : 'bg-card',
          )}
        >
          {i < score && <Check className="h-4 w-4" strokeWidth={3.5} />}
        </li>
      ))}
    </ol>
  );

  // === DEMO: Uebergang zur Registrierung ===
  if (demoMode) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-safe-bottom pt-6">
        <div className="heft-karo rounded-[28px] bg-card p-6 text-center ring-1 ring-inset ring-karo sm:p-8">
          {kaestchen}
          <h1 className="mt-5 text-[1.75rem] font-extrabold">{score} von {totalQuestions} richtig</h1>
          <p className="mt-2 text-muted-foreground">
            Das war die Demo. In der echten App wird daraus Bildschirmzeit für dein Kind.
          </p>
        </div>

        <div className="space-y-5 rounded-[28px] bg-card p-6 ring-1 ring-inset ring-karo">
          <h2 className="text-lg font-extrabold">So sieht es für dein Kind aus</h2>
          <div className="flex gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-tinte">1. Eltern-Konto anlegen</div>
              <p className="text-sm text-muted-foreground">4 Wochen alle Funktionen kostenlos – keine Zahlungsdaten nötig.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-tinte">2. Kind per Code verbinden</div>
              <p className="text-sm text-muted-foreground">Dein Kind meldet sich mit deinem 6-stelligen Einladungscode an und legt sofort los.</p>
            </div>
          </div>
          <Button onClick={onDemoSignUp ?? onContinue} size="lg" className="w-full">
            Kostenlos registrieren
          </Button>
          <button type="button" onClick={onContinue} className="w-full text-sm font-semibold text-muted-foreground hover:text-tinte">
            Weiter ausprobieren
          </button>
        </div>
      </div>
    );
  }

  const titel = isStreakRecovery
    ? 'Deine Lernpflanze ist gerettet!'
    : { excellent: 'Super gemacht!', good: 'Toll gemacht!', okay: 'Gut gemacht!' }[celebrationLevel];
  const bonus = !isStreakRecovery && (achievementBonusMinutes > 0 || perfectSessionBonus > 0);

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-safe-bottom pt-6">
      <div className="heft-karo rounded-[28px] bg-card p-6 text-center ring-1 ring-inset ring-karo sm:p-8">
        {kaestchen}
        <h1 className="mt-5 text-[1.875rem] font-extrabold leading-tight">{titel}</h1>
        <p className="mt-1 text-muted-foreground">{score} von {totalQuestions} richtig</p>

        {isStreakRecovery ? (
          <p className="mt-6 font-hand text-xl text-gruen-text">Sie wächst weiter. Diese Runde gibt keine Minuten.</p>
        ) : (
          <div className="mt-6">
            <div className="tabular text-[3.5rem] font-extrabold leading-none tracking-tight text-gruen-text">
              +{earnedMinutes.toLocaleString('de-DE')}
              <span className="ml-1 text-2xl font-bold">Min.</span>
            </div>
            <p className="mt-2 font-hand text-lg text-gruen-text">Bildschirmzeit verdient</p>
          </div>
        )}
      </div>

      {!neuerSticker && stickerWahl && onStickerWaehlen && (
        <section aria-labelledby="sticker-wahl" className="rounded-[28px] bg-card p-5 ring-1 ring-inset ring-karo">
          <h2 id="sticker-wahl" className="text-lg font-extrabold text-tinte">Such dir einen Sticker aus!</h2>
          <p className="font-hand text-gruen-text">Für alles richtig. Tipp auf deinen Lieblings-Sticker.</p>
          <ul className="mt-4 grid grid-cols-6 gap-1.5 sm:grid-cols-8">
            {angebot.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  disabled={speichert !== null}
                  onClick={async () => {
                    setSpeichert(id);
                    try { await onStickerWaehlen(id); } finally { setSpeichert(null); }
                  }}
                  aria-label={`${STICKER[id].name} aussuchen`}
                  className={cn(
                    'grid aspect-square w-full place-items-center rounded-2xl text-3xl transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    speichert === id ? 'bg-primary/15' : 'hover:bg-primary/5',
                    speichert !== null && speichert !== id && 'opacity-40',
                  )}
                >
                  <Sticker id={id} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {neuerSticker && (
        <div className="flex items-center gap-4 rounded-[28px] bg-card p-5 ring-1 ring-inset ring-karo">
          <Sticker id={neuerSticker} className="heft-sticker-neu text-6xl" />
          <div>
            <p className="text-lg font-extrabold text-tinte">Neuer Sticker!</p>
            <p className="font-hand text-gruen-text">Für alles richtig. Kleb ihn auf ein Heft.</p>
          </div>
        </div>
      )}

      {/* Ab Klasse 5: wie sich die Zeit zusammensetzt */}
      {!isYoung && !isStreakRecovery && (
        <div className="rounded-[28px] bg-card px-6 py-2 ring-1 ring-inset ring-karo">
          <dl className="divide-y divide-karo text-sm">
            <div className="flex justify-between py-3"><dt>Genauigkeit</dt><dd className="tabular font-bold text-tinte">{efficiency} %</dd></div>
            <div className="flex justify-between py-3"><dt>{score} richtig × {timePerTask} Sek.</dt><dd className="tabular font-bold text-tinte">{earnedSeconds} Sek.</dd></div>
            <div className="flex justify-between py-3"><dt>Zeit beim Lösen</dt><dd className="tabular font-bold text-tinte">−{timeSpentSeconds} Sek.</dd></div>
            {perfectSessionBonus > 0 && (
              <div className="flex justify-between py-3"><dt>Bonus: alles richtig</dt><dd className="tabular font-bold text-gruen-text">+{perfectSessionBonus} Min.</dd></div>
            )}
            {achievementBonusMinutes > 0 && (
              <div className="flex justify-between py-3"><dt>Bonus: Erfolge</dt><dd className="tabular font-bold text-gruen-text">+{achievementBonusMinutes} Min.</dd></div>
            )}
            <div className="flex justify-between py-3"><dt className="font-bold text-tinte">Verdient</dt><dd className="tabular font-extrabold text-tinte">{netTimeSeconds} Sek.</dd></div>
          </dl>
        </div>
      )}
      {isYoung && bonus && (
        <p className="text-center font-hand text-lg text-gruen-text">
          Mit Bonus: {perfectSessionBonus > 0 ? `+${perfectSessionBonus} Min. für alles richtig` : ''}
          {perfectSessionBonus > 0 && achievementBonusMinutes > 0 ? ', ' : ''}
          {achievementBonusMinutes > 0 ? `+${achievementBonusMinutes} Min. für Erfolge` : ''}
        </p>
      )}

      <Button onClick={onContinue} size="lg" className="w-full">
        Weiter
      </Button>
    </div>
  );
}

/*
 * Überraschung hinter einem Türchen (01.11.2026): Sticker, Figur, Tinte oder
 * Frei-Minuten. `oeffnen`: Das Türchen klappt auf, die Überraschung springt
 * heraus, ein paar Funken (CSS in index.css, bei „Bewegung reduzieren“ sofort da).
 */
import { Clock } from 'lucide-react';
import { Sticker } from '@/components/child/Hefte';
import { TintenTropfen } from '@/components/child/KlecksiStart';
import { getAvatarById } from '@/data/avatars';
import type { AdventArt } from '@/lib/weihnachten';
import { cn } from '@/lib/utils';

export interface AdventInhalt {
  art: AdventArt;
  sticker?: string | null;
  avatar?: string | null;
  menge?: number | null;
}

/** Kleines Bild der Überraschung (Kalender-Kästchen und großes Geschenk) */
export function AdventBild({ inhalt, gross = false }: { inhalt: AdventInhalt; gross?: boolean }) {
  if (inhalt.art === 'sticker' && inhalt.sticker) {
    return <Sticker id={inhalt.sticker} className={gross ? 'text-[3.5rem]' : 'text-[1.4rem]'} />;
  }
  if (inhalt.art === 'avatar' && inhalt.avatar) {
    const figur = getAvatarById(inhalt.avatar);
    return <span aria-hidden="true" className={gross ? 'text-[3.5rem] leading-none' : 'text-[1.35rem] leading-none'}>{figur?.emoji ?? '🎁'}</span>;
  }
  if (inhalt.art === 'tinte') {
    return (
      <span className={cn('inline-flex items-center gap-0.5 font-extrabold text-tinte tabular', gross ? 'text-3xl' : 'text-[11px]')}>
        <TintenTropfen groesse={gross ? 34 : 13} />
        {inhalt.menge}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-extrabold text-gruen-text tabular', gross ? 'text-3xl' : 'text-[11px]')}>
      <Clock className={gross ? 'h-8 w-8' : 'h-3 w-3'} strokeWidth={2.5} aria-hidden="true" />
      {inhalt.menge}
    </span>
  );
}

/** Satz zur Überraschung */
export function adventText(inhalt: AdventInhalt, ersatz = false): string {
  if (inhalt.art === 'sticker') return 'Ein Sticker für deine Hefte!';
  if (inhalt.art === 'avatar') {
    const figur = inhalt.avatar ? getAvatarById(inhalt.avatar) : undefined;
    return `Neue Figur im Federmäppchen: ${figur?.name ?? 'Weihnachtsfigur'}!`;
  }
  if (inhalt.art === 'tinte') {
    return ersatz ? `Die Figur hast du schon – dafür ${inhalt.menge} Tinte!` : `${inhalt.menge} Tinte für dein Federmäppchen!`;
  }
  return `${inhalt.menge} Minuten Handyzeit geschenkt! Du kannst sie heute anfragen.`;
}

const FUNKEN = [
  ['-70px', '-56px'], ['68px', '-60px'], ['-84px', '10px'], ['86px', '6px'], ['-46px', '64px'], ['50px', '62px'], ['0px', '-82px'],
];

export function AdventGeschenk({ tag, inhalt, oeffnen }: { tag: number; inhalt: AdventInhalt; oeffnen: boolean }) {
  return (
    <div className="relative h-36 w-36">
      <div className={cn('grid h-full w-full place-items-center rounded-[28px] bg-[#fff4c9] ring-1 ring-inset ring-karo', oeffnen && 'advent-geschenk')}>
        <AdventBild inhalt={inhalt} gross />
      </div>
      {oeffnen && FUNKEN.map(([x, y], i) => (
        <svg
          key={i}
          viewBox="0 0 10 10"
          aria-hidden="true"
          className="advent-funke"
          style={{ ['--fx' as string]: x, ['--fy' as string]: y, animationDelay: `${1.15 + i * 0.04}s` }}
        >
          <path d="M5 0 6.2 3.8 10 5 6.2 6.2 5 10 3.8 6.2 0 5 3.8 3.8Z" fill={i % 2 ? '#f59e0b' : '#d4483b'} />
        </svg>
      ))}
      {oeffnen && (
        <div
          aria-hidden="true"
          className="advent-tuer font-hand absolute inset-0 grid place-items-center rounded-[28px] bg-card text-5xl text-tinte ring-[3px] ring-inset ring-rotstift"
        >
          {tag}
        </div>
      )}
    </div>
  );
}

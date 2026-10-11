/*
 * Adventskalender auf dem Kind-Start (1. Dezember bis 6. Januar, lib/weihnachten.ts).
 * 24 Tuerchen; offen sind alle bis zum heutigen Datum, verpasste lassen sich
 * nachholen. Hinter jedem: 5 Aufgaben aus zufaelligen Faechern, ab 4 richtigen
 * ein Weihnachts-Sticker (Tuerchen 6 und 24 auch eine Figur). Sonst gibt es
 * fuer diese Aufgaben nichts.
 */
import { Sticker } from '@/components/child/Hefte';
import { ADVENT_RICHTIG, ADVENT_AUFGABEN } from '@/lib/weihnachten';
import type { AdventTuer } from '@/hooks/useAdvent';
import { cn } from '@/lib/utils';

export function Adventskalender({ offen, offenBis, heute, onTuer }: {
  offen: Map<number, AdventTuer>;
  /** Hoechstes Tuerchen, das heute aufgehen darf */
  offenBis: number;
  /** Heutiges Tuerchen (Dezember), sonst null */
  heute: number | null;
  onTuer: (tag: number) => void;
}) {
  const geoeffnet = offen.size;
  return (
    <section aria-labelledby="advent-titel" className="heft-karo rounded-[28px] bg-card p-4 ring-1 ring-inset ring-karo">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 id="advent-titel" className="text-lg font-extrabold leading-tight">Adventskalender</h2>
        <span className="tabular text-sm font-semibold text-muted-foreground">{geoeffnet} von 24 offen</span>
      </div>
      <p className="mb-3 text-[13px] leading-snug text-muted-foreground">
        Hinter jedem Türchen: {ADVENT_AUFGABEN} Aufgaben aus allen Fächern. Ab {ADVENT_RICHTIG} richtigen geht es auf.
      </p>
      <ol className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: 24 }, (_, i) => i + 1).map((tag) => {
          const tuer = offen.get(tag);
          const bereit = !tuer && tag <= offenBis;
          const istHeute = tag === heute;
          return (
            <li key={tag}>
              {tuer ? (
                <div
                  role="img"
                  aria-label={`Türchen ${tag}: offen`}
                  className="grid aspect-square place-items-center rounded-xl bg-[#fff4c9] ring-1 ring-inset ring-karo"
                >
                  <Sticker id={tuer.sticker} className="text-[1.4rem]" />
                </div>
              ) : bereit ? (
                <button
                  type="button"
                  onClick={() => onTuer(tag)}
                  aria-label={istHeute ? `Türchen ${tag} öffnen, heute` : `Türchen ${tag} öffnen`}
                  className={cn(
                    'font-hand grid aspect-square w-full place-items-center rounded-xl bg-card text-xl text-tinte transition-transform active:scale-95',
                    istHeute ? 'ring-[3px] ring-inset ring-rotstift' : 'ring-2 ring-inset ring-tinte',
                  )}
                >
                  {tag}
                </button>
              ) : (
                <div
                  aria-label={`Türchen ${tag}: noch zu`}
                  className="font-hand grid aspect-square place-items-center rounded-xl bg-muted/50 text-lg text-muted-foreground/70 ring-1 ring-inset ring-karo"
                >
                  {tag}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-muted-foreground">Kein Zeitgewinn, nur Sticker. Türchen 6 und 24 haben eine Figur dabei.</p>
    </section>
  );
}

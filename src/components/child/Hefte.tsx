import { useState } from 'react';
import { Paintbrush, Star, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { FAECHER, HEFTFARBEN, STANDARD_FARBE, STICKER, STICKER_PRO_HEFT, farbeVon, type FachId } from '@/lib/hefte';
import type { Heft } from '@/hooks/useHefte';

// Plaetze fuer Sticker auf dem Umschlag: oben rechts, unten links, Mitte rechts
const PLAETZE = ['right-1 top-9 rotate-[10deg]', 'left-2.5 bottom-6 rotate-[-12deg]', 'right-2 bottom-9 rotate-[6deg]'];

/** Ein Sticker mit weissem Rand, wie ausgeschnitten. */
export function Sticker({ id, className = '' }: { id: string; className?: string }) {
  const s = STICKER[id];
  if (!s) return null;
  return (
    <span
      role="img"
      aria-label={s.name}
      className={cn('inline-block select-none leading-none', className)}
      style={{ filter: 'drop-shadow(0 0 1.2px #fff) drop-shadow(0 0 1.2px #fff) drop-shadow(0 0 1px #fff) drop-shadow(0 1px 1.5px rgba(26,43,109,.35))' }}
    >
      {s.zeichen}
    </span>
  );
}

/** Ein Heft: Umschlag in der gewaehlten Farbe, Namensschild, Sticker. */
export function HeftUmschlag({
  fach,
  farbe,
  sticker,
  wichtig,
  gross = false,
  onStickerTippen,
}: {
  fach: FachId;
  farbe?: string;
  sticker: string[];
  wichtig?: boolean;
  gross?: boolean;
  onStickerTippen?: (platz: number) => void;
}) {
  const name = FAECHER.find((f) => f.id === fach)?.kurz ?? fach;
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-l-[6px] rounded-r-[12px] shadow-[inset_6px_0_0_rgba(0,0,0,0.14),0_6px_14px_-8px_rgba(26,43,109,0.6)]',
        gross ? 'h-56 w-44' : 'aspect-[4/5] w-full',
      )}
      style={{ backgroundColor: farbeVon(farbe, fach) }}
    >
      <span
        className={cn(
          'absolute left-[14%] right-[8%] rounded-[4px] bg-white text-center font-extrabold text-tinte shadow-sm',
          gross ? 'top-6 px-2 py-1.5 text-base' : 'top-3 px-0.5 py-0.5 text-[0.64rem] leading-tight tracking-[-0.01em]',
        )}
      >
        {name}
      </span>
      {wichtig && (
        <Star className={cn('absolute left-[14%] fill-white text-white', gross ? 'top-16 h-5 w-5' : 'top-8 h-3.5 w-3.5')} aria-label="Schwerpunkt" />
      )}
      {sticker.slice(0, STICKER_PRO_HEFT).map((id, i) =>
        onStickerTippen ? (
          <button
            key={`${id}-${i}`}
            type="button"
            onClick={() => onStickerTippen(i)}
            aria-label={`${STICKER[id]?.name ?? 'Sticker'} abziehen`}
            className={cn('absolute', gross ? PLAETZE[i].replace('top-9', 'top-20').replace('bottom-9', 'bottom-16') : PLAETZE[i])}
          >
            <Sticker id={id} className={gross ? 'text-5xl' : 'text-2xl'} />
          </button>
        ) : (
          <span key={`${id}-${i}`} className={cn('absolute', PLAETZE[i])}>
            <Sticker id={id} className="text-2xl" />
          </span>
        ),
      )}
    </div>
  );
}

/** Regal mit allen Heften; antippen startet das Fach. */
export function HeftRegal({
  hefte,
  onWaehlen,
  onGestalten,
  titel = 'Meine Hefte',
}: {
  hefte: Heft[];
  onWaehlen: (fach: FachId) => void;
  onGestalten?: () => void;
  titel?: string;
}) {
  return (
    <section aria-labelledby="hefte-titel">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="hefte-titel" className="text-base font-extrabold">{titel}</h2>
        {onGestalten && (
          <button
            type="button"
            onClick={onGestalten}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-primary hover:bg-primary/10"
          >
            <Paintbrush className="h-4 w-4" />
            Gestalten
          </button>
        )}
      </div>
      <ul className="grid grid-cols-4 gap-3 sm:grid-cols-5">
        {hefte.map((h) => (
          <li key={h.fach}>
            <button
              type="button"
              onClick={() => onWaehlen(h.fach)}
              className="block w-full rounded-[12px] transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={`${FAECHER.find((f) => f.id === h.fach)?.name} lernen`}
            >
              <HeftUmschlag fach={h.fach} farbe={h.farbe} sticker={h.sticker} wichtig={h.wichtig} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Hefte gestalten: Farbe waehlen, Sticker aufkleben und abziehen. Speichert sofort. */
export function HefteGestalten({
  offen,
  onOffen,
  hefte,
  sammlung,
  frei,
  speichern,
}: {
  offen: boolean;
  onOffen: (o: boolean) => void;
  hefte: Heft[];
  sammlung: string[];
  frei: (id: string) => number;
  speichern: (fach: FachId, aenderung: { farbe?: string; sticker?: string[] }) => void;
}) {
  const [auswahl, setAuswahl] = useState<FachId | null>(null);
  const heft = hefte.find((h) => h.fach === auswahl) ?? hefte[0];
  const arten = [...new Set(sammlung)];

  if (!heft) return null;
  const farbeJetzt = heft.farbe ?? STANDARD_FARBE[heft.fach];

  return (
    <Dialog open={offen} onOpenChange={onOffen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hefte gestalten</DialogTitle>
          <DialogDescription>Such dir eine Farbe aus und kleb Sticker auf.</DialogDescription>
        </DialogHeader>

        {/* Welches Heft */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Heft auswählen">
          {hefte.map((h) => (
            <button
              key={h.fach}
              type="button"
              role="tab"
              aria-selected={h.fach === heft.fach}
              onClick={() => setAuswahl(h.fach)}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold ring-1 ring-inset transition-colors',
                h.fach === heft.fach ? 'bg-tinte text-white ring-tinte' : 'bg-card text-tinte ring-karo',
              )}
            >
              {FAECHER.find((f) => f.id === h.fach)?.kurz}
            </button>
          ))}
        </div>

        <div className="flex justify-center py-2">
          <HeftUmschlag
            fach={heft.fach}
            farbe={heft.farbe}
            sticker={heft.sticker}
            wichtig={heft.wichtig}
            gross
            onStickerTippen={(platz) => speichern(heft.fach, { sticker: heft.sticker.filter((_, i) => i !== platz) })}
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-bold text-tinte">Farbe</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Umschlagfarbe">
            {HEFTFARBEN.map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={farbeJetzt === f.id}
                aria-label={f.name}
                onClick={() => speichern(heft.fach, { farbe: f.id })}
                className={cn(
                  'h-9 w-9 rounded-full transition-transform active:scale-90',
                  farbeJetzt === f.id ? 'ring-[3px] ring-tinte ring-offset-2' : 'ring-1 ring-black/10',
                )}
                style={{ backgroundColor: f.farbe }}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-bold text-tinte">
            Deine Sticker{' '}
            <span className="font-semibold text-muted-foreground">
              ({heft.sticker.length} von {STICKER_PRO_HEFT} aufgeklebt)
            </span>
          </p>
          {arten.length === 0 ? (
            <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
              Noch keine Sticker. Für jede Runde mit allen Aufgaben richtig bekommst du einen.
            </p>
          ) : (
            <ul className="grid grid-cols-6 gap-2">
              {arten.map((id) => {
                const anzahl = frei(id);
                const geht = anzahl > 0 && heft.sticker.length < STICKER_PRO_HEFT;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      disabled={!geht}
                      onClick={() => speichern(heft.fach, { sticker: [...heft.sticker, id] })}
                      aria-label={`${STICKER[id]?.name} aufkleben, ${anzahl} übrig`}
                      className="relative grid h-12 w-full place-items-center rounded-xl bg-muted transition-transform active:scale-90 disabled:opacity-35"
                    >
                      <Sticker id={id} className="text-[1.75rem]" />
                      {anzahl > 1 && (
                        <span className="tabular absolute -right-1 -top-1 rounded-full bg-tinte px-1.5 text-[10px] font-bold text-white">{anzahl}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {heft.sticker.length > 0 && (
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <X className="h-3 w-3" /> Tipp einen Sticker auf dem Heft an, um ihn wieder abzuziehen.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

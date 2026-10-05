import { useEffect } from 'react';
import { Check, Clock, Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
 * Bausteine des Spiels im Heft-Stil (App-Redesign, Etappe 2):
 * Kaestchen-Fortschritt, mitlaufende verdiente Zeit, Rechenkaestchen fuer die
 * Antwort, eigenes Ziffernfeld, gruener Haken und Rotstift.
 */

/** Ist die richtige Antwort eine reine Zahl? Dann gibt es das Ziffernfeld. */
export function istZahlAntwort(antwort: string | null | undefined): boolean {
  if (!antwort) return false;
  return /^-?\d{1,7}([.,]\d{1,3})?$/.test(antwort.trim());
}

/** Fortschritt als Kaestchen: gruen abgehakt, rot angestrichen, aktuell blau umrandet. */
export function KaestchenFortschritt({
  anzahl,
  aktuell,
  verlauf,
}: {
  anzahl: number;
  aktuell: number;
  verlauf: Record<number, boolean>;
}) {
  // Ab 13 Aufgaben passen die Kaestchen nicht mehr in eine Zeile
  if (anzahl > 12) {
    const erledigt = Object.keys(verlauf).length;
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2" aria-label={`Aufgabe ${aktuell + 1} von ${anzahl}`}>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-card ring-1 ring-inset ring-karo">
          <div className="h-full rounded-full bg-gruen-hell transition-[width] duration-500" style={{ width: `${(erledigt / anzahl) * 100}%` }} />
        </div>
        <span className="tabular text-xs font-bold text-muted-foreground">{aktuell + 1}/{anzahl}</span>
      </div>
    );
  }
  return (
    <ol className="flex items-center gap-1.5" aria-label={`Aufgabe ${aktuell + 1} von ${anzahl}`}>
      {Array.from({ length: anzahl }, (_, i) => {
        const ergebnis = verlauf[i];
        return (
          <li
            key={i}
            aria-hidden="true"
            className={cn(
              'grid h-5 w-5 place-items-center rounded-[5px] bg-card ring-1 ring-inset ring-karo transition-colors',
              ergebnis === true && 'bg-gruen-hell ring-0 text-white',
              ergebnis === false && 'bg-card ring-2 ring-rotstift/70',
              ergebnis === undefined && i === aktuell && 'ring-2 ring-primary',
            )}
          >
            {ergebnis === true && <Check className="h-3.5 w-3.5" strokeWidth={3.5} />}
            {ergebnis === false && <span className="block h-[2px] w-3 rotate-[-20deg] rounded bg-rotstift" />}
          </li>
        );
      })}
    </ol>
  );
}

/** In dieser Runde verdiente Zeit, mit "+30 Sek.", das bei richtiger Antwort hineinfliegt. */
export function VerdienteZeit({
  sekunden,
  gutschrift,
  gutschriftSchluessel,
}: {
  sekunden: number;
  gutschrift: number | null;
  gutschriftSchluessel: string | number;
}) {
  const min = Math.floor(sekunden / 60);
  const sek = sekunden % 60;
  return (
    <div className="relative">
      <span
        className={cn(
          'tabular inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-extrabold ring-1 ring-inset transition-colors',
          sekunden > 0 ? 'bg-gruen-hell/10 text-gruen-text ring-gruen-hell/40' : 'bg-card text-muted-foreground ring-karo',
        )}
        aria-label={`In dieser Runde verdient: ${min} Minuten ${sek} Sekunden`}
      >
        <Clock className="h-4 w-4" />+{min}:{String(sek).padStart(2, '0')}
      </span>
      {gutschrift !== null && (
        <span
          key={gutschriftSchluessel}
          aria-hidden="true"
          className="heft-gutschrift pointer-events-none absolute right-1 top-full mt-1 whitespace-nowrap font-hand text-lg text-gruen-text"
        >
          +{gutschrift} Sek.
        </span>
      )}
    </div>
  );
}

/** Gezeichneter gruener Haken, wie unter einer richtigen Aufgabe. */
export function Haken({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 44" className={cn('h-9 w-12 shrink-0', className)} aria-hidden="true">
      <path className="heft-strich" pathLength={1} d="M6 24 L22 38 L55 6" stroke="hsl(var(--gruen-hell))" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Antwort in Rechenkaestchen, mit Haken (richtig) oder Rotstift und Loesung (falsch). */
export function AntwortKaestchen({
  wert,
  zustand,
  loesung,
  mitCursor,
}: {
  wert: string;
  zustand: 'offen' | 'richtig' | 'falsch';
  loesung?: string;
  mitCursor?: boolean;
}) {
  const zeichen = wert.split('');
  const felder = Math.max(zeichen.length + (mitCursor ? 1 : 0), 3);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="relative flex" role="group" aria-label={wert ? `Deine Antwort: ${wert}` : 'Noch keine Antwort'}>
        {Array.from({ length: felder }, (_, i) => (
          <span
            key={i}
            className={cn(
              '-ml-px grid h-14 w-11 place-items-center bg-card font-hand text-[2rem] leading-none text-tinte ring-1 ring-inset ring-input first:ml-0',
              mitCursor && i === zeichen.length && 'relative z-10 ring-2 ring-primary',
            )}
          >
            {zeichen[i] ?? ''}
          </span>
        ))}
        {zustand === 'falsch' && (
          <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute -left-1 -right-1 top-3 h-8 w-[calc(100%+0.5rem)] overflow-visible">
            <path className="heft-strich" pathLength={1} d="M2 21 C 30 12, 62 18, 98 7" stroke="hsl(var(--rotstift))" strokeWidth={3.4} fill="none" strokeLinecap="round" />
          </svg>
        )}
      </div>
      {zustand === 'richtig' && <Haken />}
      {zustand === 'falsch' && loesung && (
        <span className="heft-korrektur frage-text font-hand text-[2rem] leading-none text-rotstift">{loesung}</span>
      )}
    </div>
  );
}

/**
 * Eigenes Ziffernfeld fuer Zahlenaufgaben: grosse Tasten statt Systemtastatur.
 * Am Rechner gehen auch die Zifferntasten, Ruecktaste und Enter.
 */
export function Ziffernfeld({
  wert,
  onChange,
  onEnter,
  komma,
  minus,
  maxLaenge = 8,
}: {
  wert: string;
  onChange: (wert: string) => void;
  onEnter: () => void;
  komma: boolean;
  minus: boolean;
  maxLaenge?: number;
}) {
  const tippe = (z: string) => {
    if (z === '⌫') return onChange(wert.slice(0, -1));
    if (z === ',' && (wert.includes(',') || wert === '' || wert === '-')) return;
    if (z === '-') return onChange(wert.startsWith('-') ? wert.slice(1) : `-${wert}`);
    if (wert.replace('-', '').length >= maxLaenge) return;
    onChange(wert + z);
  };

  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      const ziel = e.target as HTMLElement | null;
      if (ziel && ['INPUT', 'TEXTAREA'].includes(ziel.tagName)) return;
      if (/^\d$/.test(e.key)) tippe(e.key);
      else if (e.key === 'Backspace') tippe('⌫');
      else if (komma && (e.key === ',' || e.key === '.')) tippe(',');
      else if (minus && e.key === '-') tippe('-');
      else if (e.key === 'Enter') onEnter();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  });

  const extra = komma ? ',' : minus ? '-' : null;
  const tasten = ['1', '2', '3', '4', '5', '6', '7', '8', '9', extra, '0', '⌫'];
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Ziffernfeld">
      {tasten.map((t, i) =>
        t === null ? (
          <span key={i} />
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => tippe(t)}
            aria-label={t === '⌫' ? 'Löschen' : t === '-' ? 'Minus' : t === ',' ? 'Komma' : t}
            className="grid h-12 place-items-center rounded-xl bg-muted text-xl font-bold text-tinte transition-colors active:bg-karo touch-manipulation select-none"
          >
            {t === '⌫' ? <Delete className="h-6 w-6" /> : t === '-' ? '−' : t}
          </button>
        ),
      )}
    </div>
  );
}

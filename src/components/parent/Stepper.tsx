import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Wert mit Minus und Plus statt freiem Zahlenfeld (App-Redesign, Eltern). */
export function Stepper({
  wert,
  min,
  max,
  schritt,
  einheit,
  onChange,
  disabled,
  label,
}: {
  wert: number;
  min: number;
  max: number;
  schritt: number;
  einheit: string;
  onChange: (wert: number) => void;
  disabled?: boolean;
  /** Fuer Screenreader, z. B. "Werktags" */
  label: string;
}) {
  const runter = Math.max(min, wert - schritt);
  const hoch = Math.min(max, wert + schritt);
  const knopf =
    'grid h-9 w-9 place-items-center rounded-full bg-muted text-primary transition-colors hover:bg-karo active:scale-95 disabled:opacity-35';
  return (
    <div className={cn('inline-flex items-center gap-2', disabled && 'opacity-60')} role="group" aria-label={label}>
      <button type="button" className={knopf} disabled={disabled || wert <= min} onClick={() => onChange(runter)} aria-label={`${label}: weniger`}>
        <Minus className="h-4 w-4" strokeWidth={2.5} />
      </button>
      <span className="tabular min-w-[4.5rem] text-center text-sm font-extrabold text-tinte" aria-live="polite">
        {wert} {einheit}
      </span>
      <button type="button" className={knopf} disabled={disabled || wert >= max} onClick={() => onChange(hoch)} aria-label={`${label}: mehr`}>
        <Plus className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}

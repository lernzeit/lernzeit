/*
 * Urkunden (11.10.2026): die bestehenden Erfolge mit ihren Bonus-Minuten,
 * von Klecksi ueberreicht. „Fast geschafft“ und „Große Ziele“ zeigen den
 * Fortschritt, damit Kinder langfristig dranbleiben. Nacht-Erfolge gibt es
 * nicht mehr (useAchievements filtert sie).
 */
import { ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useAchievements, type Achievement } from '@/hooks/useAchievements';
import { Klecksi } from '@/components/klecksi/Klecksi';

const anteil = (a: Achievement) =>
  a.requirement_value > 0 ? Math.min(1, (a.current_progress || 0) / a.requirement_value) : 0;

/** Langfristig: viele Tage, viele Aufgaben oder viele Runden */
const istGrossesZiel = (a: Achievement) =>
  ['streak', 'consistency'].includes(a.type) ? a.requirement_value >= 30 : a.requirement_value >= 100;

function Siegel({ groesse = 30 }: { groesse?: number }) {
  return (
    <svg width={groesse} height={groesse} viewBox="0 0 30 30" aria-hidden="true">
      <circle cx="15" cy="15" r="13" fill="#d4483b" />
      <path d="M15 6C15 6 9.5 12.5 9.5 16A5.5 5.5 0 0 0 20.5 16C20.5 12.5 15 6 15 6Z" fill="#fff" />
    </svg>
  );
}

function Fortschritt({ a }: { a: Achievement }) {
  const stand = Math.max(0, Math.min(a.current_progress || 0, a.requirement_value));
  return (
    <li className="space-y-1.5 border-t-2 border-dashed border-karo py-3 first:border-t-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-extrabold leading-tight text-tinte">{a.name}</p>
          <p className="text-[13px] text-muted-foreground">{a.description}</p>
        </div>
        {a.reward_minutes > 0 && (
          <span className="shrink-0 rounded-full bg-gruen-hell/15 px-2 py-0.5 text-xs font-extrabold text-gruen-text">+{a.reward_minutes} Min.</span>
        )}
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted ring-2 ring-tinte" aria-hidden="true">
        <span className="block h-full bg-primary" style={{ width: `${Math.round(anteil(a) * 100)}%` }} />
      </div>
      <p className="tabular text-xs font-bold text-tinte">{stand} / {a.requirement_value}</p>
    </li>
  );
}

export function Urkunden({ kindId, onZurueck }: { kindId: string; onZurueck: () => void }) {
  const { userAchievements, loading } = useAchievements(kindId, { suppressToast: true });
  const erreicht = userAchievements
    .filter((a) => a.is_completed)
    .sort((a, b) => (b.earned_at ?? '').localeCompare(a.earned_at ?? ''));
  const minuten = erreicht.reduce((s, a) => s + (a.reward_minutes || 0), 0);
  const offen = userAchievements.filter((a) => !a.is_completed);
  const fast = offen
    .filter((a) => !istGrossesZiel(a) && (a.current_progress || 0) > 0)
    .sort((a, b) => anteil(b) - anteil(a))
    .slice(0, 3);
  const gross = offen
    .filter(istGrossesZiel)
    .sort((a, b) => anteil(b) - anteil(a) || a.requirement_value - b.requirement_value)
    .slice(0, 3);

  return (
    <div className="min-h-[100dvh] bg-background pt-safe-top pb-safe-bottom">
      <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-10 pt-4">
        <header className="flex items-center gap-3">
          <button type="button" onClick={onZurueck} aria-label="Zurück"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-card ring-2 ring-inset ring-tinte">
            <ChevronLeft className="h-5 w-5 text-tinte" />
          </button>
          <h1 className="flex-1 text-2xl font-extrabold">Deine Urkunden</h1>
        </header>

        <div className="flex items-center gap-3 rounded-[22px] bg-card p-3.5 ring-1 ring-inset ring-karo">
          <Klecksi groesse={58} stimmung={erreicht.length > 0 ? 'jubel' : 'froh'} />
          <div className="min-w-0">
            <p className="text-lg font-extrabold leading-tight text-tinte">
              {loading ? '…' : `${erreicht.length} ${erreicht.length === 1 ? 'Urkunde' : 'Urkunden'}`}
            </p>
            <p className="text-sm text-muted-foreground">
              {minuten > 0 ? `${minuten} Extra-Minuten verdient` : 'Klecksi überreicht dir jede Urkunde.'}
            </p>
          </div>
        </div>

        {fast.length > 0 && (
          <section aria-labelledby="fast-titel" className="rounded-[22px] bg-card px-4 pt-3 ring-1 ring-inset ring-karo">
            <h2 id="fast-titel" className="text-lg font-extrabold">Fast geschafft</h2>
            <ul>{fast.map((a) => <Fortschritt key={a.id} a={a} />)}</ul>
          </section>
        )}

        {erreicht.length > 0 && (
          <section aria-labelledby="urkunden-titel">
            <h2 id="urkunden-titel" className="mb-2 text-lg font-extrabold">Deine Urkunden</h2>
            <ul className="grid grid-cols-2 gap-3">
              {erreicht.map((a) => (
                <li key={a.id} className="relative flex flex-col items-center gap-1 rounded-md bg-[#fffdf5] px-2.5 pb-3 pt-3.5 text-center outline outline-2 -outline-offset-[7px] outline-tinte ring-2 ring-tinte">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Urkunde</p>
                  <p className="font-hand text-[17px] leading-tight text-tinte">{a.name}</p>
                  <p className="text-xs leading-snug text-muted-foreground">{a.description}</p>
                  {a.reward_minutes > 0 && (
                    <span className="mt-1 rounded-full bg-gruen-hell/15 px-2 py-0.5 text-xs font-extrabold text-gruen-text">+{a.reward_minutes} Min.</span>
                  )}
                  {a.earned_at && (
                    <span className="text-[11px] text-muted-foreground">{format(new Date(a.earned_at), 'd. MMM yyyy', { locale: de })}</span>
                  )}
                  <span className="absolute bottom-1.5 right-1.5 -rotate-12"><Siegel groesse={22} /></span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {gross.length > 0 && (
          <section aria-labelledby="gross-titel" className="rounded-[22px] bg-card px-4 pt-3 ring-1 ring-inset ring-karo">
            <h2 id="gross-titel" className="text-lg font-extrabold">Große Ziele</h2>
            <ul>{gross.map((a) => <Fortschritt key={a.id} a={a} />)}</ul>
          </section>
        )}
      </div>
    </div>
  );
}

/** Kachel auf dem Kind-Start: naechste Urkunde */
export function UrkundenKachel({ kindId, onClick }: { kindId: string; onClick: () => void }) {
  const { userAchievements, loading } = useAchievements(kindId, { suppressToast: true });
  const erreicht = userAchievements.filter((a) => a.is_completed).length;
  const naechste = userAchievements
    .filter((a) => !a.is_completed)
    .sort((a, b) => anteil(b) - anteil(a) || a.requirement_value - b.requirement_value)[0];
  const rest = naechste ? Math.max(0, naechste.requirement_value - (naechste.current_progress || 0)) : 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full w-full flex-col items-start gap-1.5 rounded-[20px] bg-[#fffdf5] p-3.5 text-left ring-2 ring-inset ring-tinte transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-primary"
    >
      <Siegel groesse={32} />
      <span className="text-[15px] font-extrabold leading-tight text-tinte">
        {loading ? 'Urkunden' : naechste ? `Nächste Urkunde: ${naechste.name}` : `${erreicht} Urkunden`}
      </span>
      <span className="text-[13px] font-medium text-muted-foreground">
        {loading ? '…' : naechste ? `noch ${rest}${naechste.reward_minutes ? ` · +${naechste.reward_minutes} Min.` : ''}` : 'Alle geschafft!'}
      </span>
      {!loading && <span className="text-xs font-bold text-muted-foreground">{erreicht} {erreicht === 1 ? 'Urkunde' : 'Urkunden'}</span>}
    </button>
  );
}

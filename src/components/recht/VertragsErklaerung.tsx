import { useEffect, useId, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/**
 * Formular fuer Kuendigung (§ 312k BGB) und Widerruf (§ 356a BGB), ohne
 * Anmeldung nutzbar (04.10.2026). Speichert ueber die Edge Function
 * `vertragserklaerung`; die schickt die Eingangsbestaetigung per E-Mail.
 */

type Art = 'kuendigung' | 'widerruf';

type Ergebnis = {
  vorgang: string;
  eingegangen_text: string;
  zeitpunkt: string;
  bestaetigung_gesendet: boolean;
};

const VERTRAEGE_KUENDIGUNG = [
  { id: 'web_monat', text: 'Premium monatlich (auf der Website abgeschlossen)' },
  { id: 'web_jahr', text: 'Premium jährlich (auf der Website abgeschlossen)' },
  { id: 'app_store', text: 'Premium über den Apple App Store' },
  { id: 'google_play', text: 'Premium über Google Play' },
  { id: 'unbekannt', text: 'Weiß ich nicht' },
];
const VERTRAEGE_WIDERRUF = VERTRAEGE_KUENDIGUNG.filter((v) => ['web_monat', 'web_jahr', 'unbekannt'].includes(v.id));

function Auswahl({
  name,
  wert,
  onChange,
  optionen,
  legende,
}: {
  name: string;
  wert: string;
  onChange: (v: string) => void;
  optionen: { id: string; text: string }[];
  legende: string;
}) {
  return (
    <fieldset>
      <legend className="text-[1.0625rem] font-extrabold text-[var(--lp-tinte)]">{legende}</legend>
      <div className="mt-3 space-y-2">
        {optionen.map((o) => (
          <label
            key={o.id}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-inset transition-colors',
              wert === o.id ? 'ring-2 ring-[var(--lp-blau)]' : 'ring-[var(--lp-karo)] hover:bg-[var(--lp-heft)]',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.id}
              checked={wert === o.id}
              onChange={() => onChange(o.id)}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--lp-blau)]"
            />
            <span className="leading-snug">{o.text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function VertragsErklaerung({ art }: { art: Art }) {
  const id = useId();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [vertrag, setVertrag] = useState('web_monat');
  const [kuendigungsart, setKuendigungsart] = useState('ordentlich');
  const [grund, setGrund] = useState('');
  const [zumArt, setZumArt] = useState('naechstmoeglich');
  const [zumDatum, setZumDatum] = useState('');
  const [firma, setFirma] = useState('');
  const [sendet, setSendet] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);

  // Angemeldet? Dann die E-Mail-Adresse des Kontos vorschlagen.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const mail = data.session?.user?.email;
      if (mail && !mail.endsWith('@lernzeit.internal')) setEmail((e) => e || mail);
    }).catch(() => {});
  }, []);

  const absenden = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFehler(null);
    if (zumArt === 'datum' && !zumDatum) {
      setFehler('Bitte wähle das Datum, zu dem gekündigt werden soll.');
      return;
    }
    setSendet(true);
    try {
      const { data, error } = await supabase.functions.invoke('vertragserklaerung', {
        body: {
          erklaerung: art,
          name,
          email,
          vertrag,
          kuendigungsart: art === 'kuendigung' ? kuendigungsart : undefined,
          grund: grund || undefined,
          zum: art === 'kuendigung' ? (zumArt === 'datum' ? zumDatum : 'naechstmoeglich') : undefined,
          firma,
        },
      });
      if (error || !data?.ok) {
        let text = data?.error as string | undefined;
        try {
          const antwort = (error as { context?: Response } | null)?.context;
          if (!text && antwort) text = (await antwort.json())?.error;
        } catch { /* egal */ }
        throw new Error(text || 'Das hat nicht geklappt. Bitte versuch es noch einmal oder schreib uns an info@lernzeit.app.');
      }
      setErgebnis(data as Ergebnis);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    } finally {
      setSendet(false);
    }
  };

  if (ergebnis) {
    return (
      <div role="status" className="rounded-3xl bg-white p-6 ring-1 ring-inset ring-[var(--lp-karo)] sm:p-8">
        <p className="flex items-center gap-2 text-[1.375rem] font-extrabold text-[var(--lp-tinte)]">
          <CheckCircle2 className="h-7 w-7 shrink-0 text-[#16a34a]" />
          {art === 'kuendigung' ? 'Deine Kündigung ist eingegangen.' : 'Dein Widerruf ist eingegangen.'}
        </p>
        <p className="mt-2 text-[var(--lp-leise)]">
          Abgegeben über die Schaltfläche „{art === 'kuendigung' ? 'Jetzt kündigen' : 'Widerruf bestätigen'}“ auf lernzeit.app.
        </p>
        <dl className="mt-5 grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
          <dt className="text-[var(--lp-leise)]">Eingegangen am</dt>
          <dd className="font-bold text-[var(--lp-tinte)]">{ergebnis.eingegangen_text} Uhr</dd>
          <dt className="text-[var(--lp-leise)]">Vertrag</dt>
          <dd className="font-bold text-[var(--lp-tinte)]">
            {VERTRAEGE_KUENDIGUNG.find((v) => v.id === vertrag)?.text}
          </dd>
          <dt className="text-[var(--lp-leise)]">Beenden</dt>
          <dd className="font-bold text-[var(--lp-tinte)]">{ergebnis.zeitpunkt}</dd>
          <dt className="text-[var(--lp-leise)]">Name, E-Mail</dt>
          <dd className="break-words font-bold text-[var(--lp-tinte)]">{name}, {email}</dd>
          <dt className="text-[var(--lp-leise)]">Vorgangsnummer</dt>
          <dd className="font-bold text-[var(--lp-tinte)]">{ergebnis.vorgang}</dd>
        </dl>
        <p className="mt-5">
          {ergebnis.bestaetigung_gesendet
            ? `Eine Bestätigung mit diesem Inhalt haben wir an ${email} geschickt.`
            : 'Die Bestätigung per E-Mail konnte gerade nicht verschickt werden. Deine Erklärung ist trotzdem gespeichert; wir schicken die Bestätigung nach. Mach dir zur Sicherheit einen Screenshot dieser Seite.'}
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full px-5 font-bold text-[var(--lp-blau)] ring-1 ring-inset ring-[var(--lp-karo-dunkel)] hover:bg-[var(--lp-heft)] print:hidden"
        >
          Bestätigung drucken oder als PDF speichern
        </button>
        {(vertrag === 'app_store' || vertrag === 'google_play') && (
          <p className="mt-3 font-semibold text-[var(--lp-tinte)]">
            Wichtig: Ein Abo aus dem App Store oder von Google Play verlängert der jeweilige Store. Bitte beende es
            zusätzlich in den Abo-Einstellungen deiner Apple-ID bzw. in Google Play unter „Zahlungen und Abos“.
          </p>
        )}
      </div>
    );
  }

  const feld = 'mt-2 h-12 bg-white text-base';
  return (
    <form onSubmit={absenden} className="space-y-8" noValidate={false}>
      {art === 'kuendigung' && (
        <Auswahl
          name={`${id}-art`}
          legende="Art der Kündigung"
          wert={kuendigungsart}
          onChange={setKuendigungsart}
          optionen={[
            { id: 'ordentlich', text: 'Ordentliche Kündigung' },
            { id: 'ausserordentlich', text: 'Außerordentliche Kündigung aus wichtigem Grund' },
          ]}
        />
      )}
      {art === 'kuendigung' && kuendigungsart === 'ausserordentlich' && (
        <div>
          <label htmlFor={`${id}-grund`} className="text-[1.0625rem] font-extrabold text-[var(--lp-tinte)]">
            Grund für die außerordentliche Kündigung
          </label>
          <Textarea
            id={`${id}-grund`}
            value={grund}
            onChange={(e) => setGrund(e.target.value)}
            required
            maxLength={2000}
            rows={3}
            className="mt-2 bg-white text-base"
          />
        </div>
      )}

      <Auswahl
        name={`${id}-vertrag`}
        legende={art === 'kuendigung' ? 'Welcher Vertrag soll enden?' : 'Welchen Vertrag möchtest du widerrufen?'}
        wert={vertrag}
        onChange={setVertrag}
        optionen={art === 'kuendigung' ? VERTRAEGE_KUENDIGUNG : VERTRAEGE_WIDERRUF}
      />

      {art === 'kuendigung' && (
        <div>
          <Auswahl
            name={`${id}-zum`}
            legende="Zu wann?"
            wert={zumArt}
            onChange={setZumArt}
            optionen={[
              { id: 'naechstmoeglich', text: 'Zum nächstmöglichen Zeitpunkt' },
              { id: 'datum', text: 'Zu einem bestimmten Datum' },
            ]}
          />
          {zumArt === 'datum' && (
            <Input
              type="date"
              aria-label="Kündigen zum"
              value={zumDatum}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setZumDatum(e.target.value)}
              className={feld}
            />
          )}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-name`} className="text-[1.0625rem] font-extrabold text-[var(--lp-tinte)]">
            Dein Name
          </label>
          <Input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} autoComplete="name" className={feld} />
        </div>
        <div>
          <label htmlFor={`${id}-mail`} className="text-[1.0625rem] font-extrabold text-[var(--lp-tinte)]">
            E-Mail-Adresse deines Kontos
          </label>
          <Input id={`${id}-mail`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} autoComplete="email" className={feld} />
          <p className="mt-1.5 text-sm text-[var(--lp-leise)]">Dorthin schicken wir die Eingangsbestätigung.</p>
        </div>
      </div>

      {/* Unsichtbar fuer Menschen, Formular-Roboter fuellen es aus. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label>
          Firma
          <input tabIndex={-1} autoComplete="off" value={firma} onChange={(e) => setFirma(e.target.value)} />
        </label>
      </div>

      {art === 'widerruf' && (
        <div>
          <label htmlFor={`${id}-hinweis`} className="text-[1.0625rem] font-extrabold text-[var(--lp-tinte)]">
            Hinweis an uns <span className="font-semibold text-[var(--lp-leise)]">(freiwillig)</span>
          </label>
          <Textarea id={`${id}-hinweis`} value={grund} onChange={(e) => setGrund(e.target.value)} maxLength={2000} rows={2} className="mt-2 bg-white text-base" />
        </div>
      )}

      {fehler && (
        <p role="alert" className="rounded-2xl bg-[#fdecea] px-4 py-3 font-semibold text-[#b42318]">
          {fehler}
        </p>
      )}

      <button
        type="submit"
        disabled={sendet}
        className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--lp-blau)] px-8 text-[1.0625rem] font-bold text-white transition-colors hover:bg-[var(--lp-tinte)] disabled:opacity-60 sm:w-auto"
      >
        {sendet && <Loader2 className="h-5 w-5 animate-spin" />}
        {art === 'kuendigung' ? 'Jetzt kündigen' : 'Widerruf bestätigen'}
      </button>
    </form>
  );
}

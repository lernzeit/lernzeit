/*
 * Federmaeppchen (11.10.2026): Figuren gegen Tinte. 8 Figuren sind frei,
 * die anderen kosten Tinte; bereits gewaehlte bleiben. Freischalten und
 * Waehlen prueft die Datenbank (mit_tinte_freischalten, avatar_pruefen).
 * Tinte ist Spielgeld: nie Bildschirmzeit, nie mit Geld kaufbar.
 */
import { useState } from 'react';
import { ChevronLeft, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AVATAR_LIBRARY } from '@/data/avatars';
import { WEIHNACHTS_FIGUREN } from '@/lib/federmaeppchen';
import { istWeihnachtszeit } from '@/lib/weihnachten';
import { useFreigeschaltet } from '@/hooks/useFreigeschaltet';
import { Klecksi } from '@/components/klecksi/Klecksi';
import { TintenTropfen } from '@/components/child/KlecksiStart';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export function Federmaeppchen({ kindId, avatarId, stand, onStand, onAvatar, onZurueck }: {
  kindId: string;
  avatarId: string;
  stand: number | null;
  onStand: (stand: number) => void;
  onAvatar: (id: string) => void;
  onZurueck: () => void;
}) {
  const { gesperrt, laden } = useFreigeschaltet(kindId);
  // Weihnachts-Figuren: in der Weihnachtszeit vorne, sonst nur, wer sie schon hat
  const weihnachten = istWeihnachtszeit();
  const figuren = [
    ...(weihnachten ? AVATAR_LIBRARY.filter((a) => WEIHNACHTS_FIGUREN.includes(a.id)) : []),
    ...AVATAR_LIBRARY.filter((a) => !WEIHNACHTS_FIGUREN.includes(a.id)),
    ...(weihnachten ? [] : AVATAR_LIBRARY.filter((a) => WEIHNACHTS_FIGUREN.includes(a.id) && (gesperrt(a.id) === null || a.id === avatarId))),
  ];
  const [frage, setFrage] = useState<{ id: string; name: string; preis: number } | null>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [beschaeftigt, setBeschaeftigt] = useState(false);

  const waehlen = async (id: string) => {
    const { error } = await supabase.from('profiles').update({ avatar_id: id }).eq('id', kindId);
    if (error) {
      setHinweis('Das hat nicht geklappt. Versuch es gleich noch einmal.');
      return;
    }
    onAvatar(id);
    setHinweis(null);
  };

  const freischalten = async () => {
    if (!frage) return;
    setBeschaeftigt(true);
    const { data, error } = await supabase.rpc('mit_tinte_freischalten', { p_art: 'avatar', p_ding: frage.id });
    setBeschaeftigt(false);
    const r = (data ?? {}) as { ok?: boolean; grund?: string; stand?: number; preis?: number };
    if (error || !r.ok) {
      setHinweis(
        r.grund === 'zu_wenig'
          ? `Dir fehlen noch ${Math.max(0, (r.preis ?? frage.preis) - (r.stand ?? 0))} Tinte.`
          : r.grund === 'saison'
            ? 'Diese Figur gibt es nur in der Weihnachtszeit.'
            : 'Das hat nicht geklappt. Versuch es gleich noch einmal.',
      );
      setFrage(null);
      return;
    }
    if (typeof r.stand === 'number') onStand(r.stand);
    await laden();
    const id = frage.id;
    setFrage(null);
    await waehlen(id);
  };

  return (
    <div className="min-h-[100dvh] bg-background pt-safe-top pb-safe-bottom">
      <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-10 pt-4">
        <header className="flex items-center gap-3">
          <button type="button" onClick={onZurueck} aria-label="Zurück"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-card ring-2 ring-inset ring-tinte">
            <ChevronLeft className="h-5 w-5 text-tinte" />
          </button>
          <h1 className="flex-1 text-2xl font-extrabold">Federmäppchen</h1>
          <span className="flex h-10 items-center gap-1.5 rounded-full bg-card px-3 font-extrabold text-tinte ring-2 ring-inset ring-tinte">
            <TintenTropfen groesse={16} />
            <span className="tabular">{stand ?? '–'}</span>
          </span>
        </header>

        <div className="flex items-center gap-2">
          <Klecksi groesse={64} />
          <p className="font-hand flex-1 rounded-[18px] rounded-bl-[4px] bg-card px-3 py-2.5 text-[15px] leading-snug text-tinte ring-2 ring-inset ring-karo">
            Für Tinte male ich dir neue Figuren. Such dir eine aus!
          </p>
        </div>

        {hinweis && (
          <p role="status" className="rounded-2xl bg-rotstift/10 px-4 py-3 text-sm font-semibold text-tinte">{hinweis}</p>
        )}

        <section aria-labelledby="figuren-titel" className="rounded-[24px] bg-card p-4 ring-1 ring-inset ring-karo">
          <h2 id="figuren-titel" className="mb-3 text-lg font-extrabold">Deine Figur</h2>
          <div className="grid grid-cols-4 gap-2.5">
            {figuren.map((a) => {
              const preis = gesperrt(a.id);
              const gewaehlt = a.id === avatarId;
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={gewaehlt}
                  aria-label={preis ? `${a.name}, ${preis} Tintentropfen` : gewaehlt ? `${a.name}, gewählt` : a.name}
                  onClick={() => (preis ? setFrage({ id: a.id, name: a.name, preis }) : void waehlen(a.id))}
                  className={cn(
                    'flex h-20 flex-col items-center justify-center gap-0.5 rounded-[18px] text-[32px] transition-transform active:scale-95',
                    gewaehlt ? 'bg-[#fff4c9] ring-[3px] ring-inset ring-primary'
                      : preis ? 'bg-muted/40 ring-2 ring-inset ring-karo' : 'bg-card ring-2 ring-inset ring-tinte',
                  )}
                >
                  <span aria-hidden="true" className={preis ? 'opacity-40' : undefined}>{a.emoji}</span>
                  {preis && (
                    <span className="flex items-center gap-0.5 text-[13px] font-extrabold text-tinte" aria-hidden="true">
                      <TintenTropfen groesse={12} />
                      {preis}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[13px] text-muted-foreground">
            Tinte gibt es für jede richtige Aufgabe, jede Berichtigung und jede fertige Reise-Seite.
          </p>
          {weihnachten && (
            <p className="mt-1 text-[13px] text-muted-foreground">
              Weihnachts-Figuren gibt es bis 6. Januar. Hinter Türchen 6 und 24 im Adventskalender steckt je eine.
            </p>
          )}
        </section>
      </div>

      <AlertDialog open={!!frage} onOpenChange={(offen) => !offen && setFrage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> {frage?.name} freischalten?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Kostet {frage?.preis} Tinte. Du hast {stand ?? 0}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Lieber nicht</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button disabled={beschaeftigt || (stand ?? 0) < (frage?.preis ?? 0)} onClick={(e) => { e.preventDefault(); void freischalten(); }}>
                {(stand ?? 0) < (frage?.preis ?? 0) ? `Noch ${(frage?.preis ?? 0) - (stand ?? 0)} Tinte sammeln` : 'Freischalten'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

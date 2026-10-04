import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * "Abo kündigen" im Abo-Bereich (Web-Abo über Stripe, 04.10.2026). Zeigt
 * vorher, wann Premium endet und ob etwas erstattet wird; die Regeln rechnet
 * die Funktion abo-kuendigen (Jahresabo ab dem 2. Jahr: ein Monat Frist,
 * Rest anteilig zurück).
 */
type Vorschau = {
  ende_text: string;
  erstattung_text?: string | null;
  tarif: string;
  bereits_gekuendigt?: boolean;
  bestaetigung_gesendet?: boolean;
};

async function rufe(aktion: 'vorschau' | 'kuendigen'): Promise<Vorschau> {
  const { data, error } = await supabase.functions.invoke('abo-kuendigen', { body: { aktion } });
  if (error || data?.error) {
    let text = data?.error as string | undefined;
    try {
      const antwort = (error as { context?: Response } | null)?.context;
      if (!text && antwort) text = (await antwort.json())?.error;
    } catch { /* egal */ }
    throw new Error(text || 'Das hat nicht geklappt. Bitte versuch es noch einmal.');
  }
  return data as Vorschau;
}

export function AboKuendigen() {
  const [offen, setOffen] = useState(false);
  const [laedt, setLaedt] = useState(false);
  const [vorschau, setVorschau] = useState<Vorschau | null>(null);
  const [fertig, setFertig] = useState<Vorschau | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const oeffnen = async () => {
    setOffen(true);
    setFehler(null);
    setFertig(null);
    setVorschau(null);
    setLaedt(true);
    try {
      setVorschau(await rufe('vorschau'));
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    } finally {
      setLaedt(false);
    }
  };

  const kuendigen = async () => {
    setLaedt(true);
    setFehler(null);
    try {
      setFertig(await rufe('kuendigen'));
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    } finally {
      setLaedt(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => void oeffnen()}>
        Abo kündigen
      </Button>
      <Dialog
        open={offen}
        onOpenChange={(o) => {
          setOffen(o);
          // Nach einer Kuendigung den neuen Stand laden (Status "Gekündigt").
          if (!o && fertig) window.location.reload();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{fertig ? 'Abo gekündigt' : 'Abo kündigen'}</DialogTitle>
            <DialogDescription>
              {fertig
                ? `Premium läuft bis zum ${fertig.ende_text}. Dein kostenloses Konto bleibt bestehen.`
                : 'Dein kostenloses Konto bleibt bestehen; nur Premium endet.'}
            </DialogDescription>
          </DialogHeader>

          {laedt && !vorschau && !fertig && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Wird geladen …
            </p>
          )}

          {fehler && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{fehler}</p>}

          {fertig ? (
            <div className="space-y-3 text-sm">
              {fertig.erstattung_text && (
                <p>
                  <strong>{fertig.erstattung_text}</strong> gehen in den nächsten Tagen auf dasselbe Zahlungsmittel zurück.
                </p>
              )}
              <p className="text-muted-foreground">
                {fertig.bestaetigung_gesendet
                  ? 'Eine Bestätigung haben wir dir per E-Mail geschickt.'
                  : 'Die Bestätigung per E-Mail schicken wir nach.'}
              </p>
              <Button className="w-full" onClick={() => { setOffen(false); window.location.reload(); }}>Fertig</Button>
            </div>
          ) : vorschau?.bereits_gekuendigt ? (
            <p className="text-sm">Dein Abo ist bereits gekündigt und endet am <strong>{vorschau.ende_text}</strong>.</p>
          ) : vorschau ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-muted p-4 text-sm">
                <p>
                  Tarif: <strong>{vorschau.tarif}</strong>
                </p>
                <p className="mt-1">
                  Premium endet am <strong>{vorschau.ende_text}</strong>.
                </p>
                {vorschau.erstattung_text && (
                  <p className="mt-1">
                    Für die Zeit danach erstatten wir <strong>{vorschau.erstattung_text}</strong>.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <Button variant="destructive" className="flex-1" onClick={() => void kuendigen()} disabled={laedt}>
                  {laedt && <Loader2 className="h-4 w-4 animate-spin" />}
                  Jetzt kündigen
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setOffen(false)} disabled={laedt}>
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

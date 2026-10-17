import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { notfallMelden, notfallSchluesselHolen } from '@/services/screenTime/notfall';
import { CODE_ORT, NotfallCodeFeld } from '@/components/screenTime/NotfallCode';
/** Was erlaubt werden soll — steht so in der Tabelle `geraet_freigaben`. */
export type GeraetFreigabeZweck = 'ausnahmen' | 'aufheben' | 'zaehlen';

interface ParentGateProps {
  open: boolean;
  onOpenChange: (offen: boolean) => void;
  /** Das Kind, dessen Sperre verändert werden soll (die Anfrage nimmt auth.uid()). */
  childId: string;
  /** Wird nur aufgerufen, wenn ein verknüpftes Elternteil zugestimmt hat. */
  onVerified: () => void;
  zweck: GeraetFreigabeZweck;
}

const ZWECK_TEXT: Record<GeraetFreigabeZweck, string> = {
  ausnahmen: 'Apps wählen, die immer offen bleiben.',
  aufheben: 'Handysperre aufheben.',
  zaehlen: 'Handysperre einrichten.',
};

type Schritt = 'fragen' | 'warten' | 'abgelehnt' | 'code';

/**
 * Hürde vor allem, was die Sperre LOCKERT (Apple fragt die Bildschirmzeit-
 * Kennung nur beim ersten Zustimmen; danach könnte das Kind sonst selbst
 * alle Apps freigeben).
 *
 * Seit 10.10.2026: Das Kinder-Handy fragt an, das Elternteil tippt auf
 * SEINEM Handy auf „Erlauben“ (Push + Karte auf „Heute“, Tabelle
 * `geraet_freigaben`).
 *
 * Seit 17.10.2026 ist der Notweg der Eltern-Code (6 Ziffern, wechselt alle
 * 30 Minuten, geprüft ohne Internet). Das LernZeit-Passwort entfiel: Konten
 * mit Apple/Google haben keins, und bei „E-Mail verbergen“ kennen Eltern
 * nicht einmal ihre LernZeit-E-Mail.
 */
export function ParentGate({ open, onOpenChange, onVerified, zweck }: ParentGateProps) {
  const [schritt, setSchritt] = useState<Schritt>('fragen');
  const [anfrageId, setAnfrageId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const erledigt = useRef(false);

  const schliessen = () => {
    setSchritt('fragen'); setAnfrageId(null); setFehler(null);
    onOpenChange(false);
  };

  const erlaubt = () => {
    if (erledigt.current) return;
    erledigt.current = true;
    schliessen();
    onVerified();
  };

  useEffect(() => { if (open) erledigt.current = false; }, [open]);

  // Auf die Antwort warten. Alle 2 s nachsehen — einfacher und robuster als
  // Realtime, und es läuft nur, solange dieser Dialog offen ist.
  useEffect(() => {
    if (!open || schritt !== 'warten' || !anfrageId) return;
    let aktiv = true;
    const nachsehen = async () => {
      const { data } = await supabase
        .from('geraet_freigaben')
        .select('status')
        .eq('id', anfrageId)
        .maybeSingle();
      if (!aktiv || !data) return;
      if (data.status === 'erlaubt') {
        // Nach „Erlauben“ gibt der Server den Notfall-Schlüssel heraus, falls
        // er diesem Handy fehlt (z. B. nach Neuinstallation).
        void notfallSchluesselHolen().catch(() => false);
        erlaubt();
      }
      else if (data.status === 'abgelehnt' || data.status === 'verfallen') setSchritt('abgelehnt');
    };
    const takt = window.setInterval(() => void nachsehen(), 2000);
    void nachsehen();
    return () => { aktiv = false; window.clearInterval(takt); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, schritt, anfrageId]);

  const anfragen = async () => {
    setBusy(true); setFehler(null);
    const { data, error } = await supabase.rpc('geraet_freigabe_anfragen', { p_zweck: zweck });
    setBusy(false);
    if (error || !data) {
      setFehler(error?.message.includes('zu viele')
        ? 'Zu viele Anfragen. Bitte in ein paar Minuten noch mal.'
        : 'Anfrage ging nicht raus. Besteht eine Internetverbindung?');
      return;
    }
    setAnfrageId(data as string);
    setSchritt('warten');
  };

  const mitCode = () => {
    void notfallMelden(zweck, null).catch(() => undefined);
    erlaubt();
  };

  return (
    <Dialog open={open} onOpenChange={(offen) => (offen ? onOpenChange(true) : schliessen())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Nur für Eltern
          </DialogTitle>
          <DialogDescription>{ZWECK_TEXT[zweck]}</DialogDescription>
        </DialogHeader>

        {schritt === 'fragen' && (
          <p className="text-sm">Ein Elternteil erlaubt das auf dem eigenen Handy in LernZeit.</p>
        )}

        {schritt === 'warten' && (
          <p className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            Warte auf „Erlauben“ – in LernZeit auf dem Eltern-Handy unter „Heute“.
          </p>
        )}

        {schritt === 'abgelehnt' && (
          <p className="text-sm">Nicht erlaubt.</p>
        )}

        {schritt === 'code' && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{CODE_ORT}</p>
            <NotfallCodeFeld onOk={mitCode} />
          </div>
        )}

        {fehler && <p className="text-sm text-destructive">{fehler}</p>}

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          {(schritt === 'fragen' || schritt === 'abgelehnt') && (
            <Button onClick={() => void anfragen()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {schritt === 'abgelehnt' ? 'Noch mal fragen' : 'Eltern-Handy fragen'}
            </Button>
          )}
          {schritt !== 'code' ? (
            <Button variant="ghost" size="sm" onClick={() => { setFehler(null); setSchritt('code'); }} disabled={busy}>
              Stattdessen mit Eltern-Code
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => { setFehler(null); setSchritt(anfrageId ? 'warten' : 'fragen'); }} disabled={busy}>
              Zurück
            </Button>
          )}
          <Button variant="outline" onClick={schliessen} disabled={busy}>Abbrechen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SUPABASE_ANON_KEY, SUPABASE_PROJECT_URL } from '@/integrations/supabase/client';

/** Was erlaubt werden soll — steht so in der Tabelle `geraet_freigaben`. */
export type GeraetFreigabeZweck = 'ausnahmen' | 'aufheben' | 'zaehlen';

interface ParentGateProps {
  open: boolean;
  onOpenChange: (offen: boolean) => void;
  /** Das Kind, dessen Sperre verändert werden soll. */
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

type Schritt = 'fragen' | 'warten' | 'abgelehnt' | 'passwort';

/**
 * Hürde vor allem, was die Sperre LOCKERT (Apple fragt die Bildschirmzeit-
 * Kennung nur beim ersten Zustimmen; danach könnte das Kind sonst selbst
 * alle Apps freigeben).
 *
 * Seit 10.10.2026: Das Kinder-Handy fragt an, das Elternteil tippt auf
 * SEINEM Handy auf „Erlauben“ (Push + Karte auf „Heute“, Tabelle
 * `geraet_freigaben`). Vorher wurden hier E-Mail und Passwort verlangt — das
 * scheiterte bei Google-/Apple-Konten ohne Passwort und an Verwechslungen mit
 * dem Apple-ID-Passwort. Das Passwort bleibt als Notweg.
 */
export function ParentGate({ open, onOpenChange, childId, onVerified, zweck }: ParentGateProps) {
  const [schritt, setSchritt] = useState<Schritt>('fragen');
  const [anfrageId, setAnfrageId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const erledigt = useRef(false);

  const schliessen = () => {
    setSchritt('fragen'); setAnfrageId(null); setFehler(null);
    setEmail(''); setPasswort('');
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
      if (data.status === 'erlaubt') erlaubt();
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

  const mitPasswort = async () => {
    setFehler(null);
    if (!email.trim() || !passwort) { setFehler('Bitte E-Mail und Passwort eingeben.'); return; }
    setBusy(true);
    try {
      // Eigener Client ohne Speicher, damit die Anmeldung des Kindes bleibt.
      const pruefClient = createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data, error } = await pruefClient.auth.signInWithPassword({ email: email.trim(), password: passwort });
      if (error || !data.user) {
        const text = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase();
        setFehler(text.includes('rate') || text.includes('too many')
          ? 'Zu viele Versuche. Bitte später noch mal – oder auf deinem Handy erlauben.'
          : 'Passt nicht. Gemeint ist dein LernZeit-Passwort, nicht das Apple-Passwort. Wer sich mit Google oder Apple anmeldet, erlaubt auf dem eigenen Handy.');
        return;
      }
      // Nur DIESE Sitzung beenden. Das frühere signOut() (global) hat das
      // Elternteil auf allen Geräten abgemeldet.
      await pruefClient.auth.signOut({ scope: 'local' });

      const { data: verknuepfung } = await supabase
        .from('parent_child_relationships')
        .select('id')
        .eq('parent_id', data.user.id)
        .eq('child_id', childId)
        .maybeSingle();
      if (!verknuepfung) { setFehler('Dieses Konto ist nicht mit diesem Kind verknüpft.'); return; }
      erlaubt();
    } catch {
      setFehler('Prüfung fehlgeschlagen. Besteht eine Internetverbindung?');
    } finally {
      setBusy(false);
    }
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

        {schritt === 'passwort' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="parent-gate-email">E-Mail (Elternkonto)</Label>
              <Input id="parent-gate-email" type="email" autoComplete="username" inputMode="email"
                value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="parent-gate-passwort">LernZeit-Passwort</Label>
              <Input id="parent-gate-passwort" type="password" autoComplete="current-password"
                value={passwort} onChange={(e) => setPasswort(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void mitPasswort(); }} disabled={busy} />
            </div>
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
          {schritt === 'passwort' && (
            <Button onClick={() => void mitPasswort()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Weiter
            </Button>
          )}
          {schritt !== 'passwort' ? (
            <Button variant="ghost" size="sm" onClick={() => { setFehler(null); setSchritt('passwort'); }} disabled={busy}>
              Stattdessen mit Passwort
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

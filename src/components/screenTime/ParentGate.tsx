import { useState } from 'react';
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

interface ParentGateProps {
  open: boolean;
  onOpenChange: (offen: boolean) => void;
  /** Das Kind, dessen Sperre verändert werden soll. */
  childId: string;
  /** Wird nur aufgerufen, wenn ein verknüpftes Elternteil sich ausgewiesen hat. */
  onVerified: () => void;
  /** Was nach dem Ausweisen passiert — steht im Dialog, damit klar ist, wofür. */
  purpose: string;
}

/**
 * Fragt nach den Zugangsdaten eines Elternteils, bevor an der Sperre etwas
 * geändert wird.
 *
 * ── Warum das nötig ist ──────────────────────────────────────────────────
 *
 * Apple verlangt die Bildschirmzeit-Kennung nur EINMAL, beim ersten
 * Zustimmen. Danach steht der Auswahldialog jeder App offen, die die
 * Berechtigung hat. Auf dem eigenen Gerät könnte ein Kind also einfach alle
 * Apps abwählen — die Sperre wäre eine Empfehlung.
 *
 * Diese Hürde schließt genau diese Lücke. Sie steht vor „Apps auswählen“ und
 * vor „Sperre aufheben“, nicht vor dem Anzeigen des Zustands.
 *
 * ── Warum ein zweiter Supabase-Client ────────────────────────────────────
 *
 * Auf dem Gerät des Kindes ist das Kind angemeldet. Eine Anmeldung mit den
 * Elterndaten über den normalen Client würde diese Sitzung ERSETZEN — das
 * Kind wäre abgemeldet und die App im falschen Zustand.
 *
 * Der zweite Client mit `persistSession: false` prüft die Zugangsdaten, ohne
 * irgendetwas zu speichern. Er lebt nur für diesen einen Aufruf.
 */
export function ParentGate({ open, onOpenChange, childId, onVerified, purpose }: ParentGateProps) {
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [pruefend, setPruefend] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const schliessen = () => {
    setEmail(''); setPasswort(''); setFehler(null);
    onOpenChange(false);
  };

  const pruefen = async () => {
    setFehler(null);
    if (!email.trim() || !passwort) {
      setFehler('Bitte E-Mail und Passwort eingeben.');
      return;
    }
    setPruefend(true);
    try {
      const pruefClient = createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });

      const { data, error } = await pruefClient.auth.signInWithPassword({
        email: email.trim(),
        password: passwort,
      });
      // Aufräumen, damit keine Sitzung im Speicher zurückbleibt.
      await pruefClient.auth.signOut();

      if (error || !data.user) {
        setFehler('E-Mail oder Passwort stimmt nicht.');
        return;
      }

      // Richtige Zugangsdaten reichen nicht — es muss auch DAS Elternteil
      // DIESES Kindes sein. Sonst könnte jedes beliebige Elternkonto die
      // Sperre eines fremden Kindes aufheben.
      const { data: verknuepfung } = await supabase
        .from('parent_child_relationships')
        .select('id')
        .eq('parent_id', data.user.id)
        .eq('child_id', childId)
        .maybeSingle();

      if (!verknuepfung) {
        setFehler('Dieses Konto ist nicht mit diesem Kind verknüpft.');
        return;
      }

      schliessen();
      onVerified();
    } catch {
      setFehler('Die Prüfung ist fehlgeschlagen. Besteht eine Internetverbindung?');
    } finally {
      setPruefend(false);
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
          <DialogDescription>
            {purpose} Bitte melde dich dafür mit deinem Elternkonto an. Die
            Anmeldung deines Kindes bleibt bestehen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="parent-gate-email">E-Mail des Elternteils</Label>
            <Input
              id="parent-gate-email"
              type="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pruefend}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="parent-gate-passwort">Passwort</Label>
            <Input
              id="parent-gate-passwort"
              type="password"
              autoComplete="current-password"
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void pruefen(); }}
              disabled={pruefend}
            />
          </div>

          {fehler && <p className="text-sm text-destructive">{fehler}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={schliessen} disabled={pruefend}>
            Abbrechen
          </Button>
          <Button onClick={() => void pruefen()} disabled={pruefend}>
            {pruefend && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Weiter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

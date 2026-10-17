import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ScreenTime } from '@/services/screenTime/plugin';
import { notfallCodePruefen, notfallMelden } from '@/services/screenTime/notfall';
import { HANDYZEIT_GEAENDERT } from '@/services/screenTime/release';

const FEHLER: Record<'falsch' | 'gesperrt' | 'kein-schluessel', string> = {
  falsch: 'Der Code passt nicht. Bitte noch mal ablesen.',
  gesperrt: 'Zu viele falsche Versuche. In 15 Minuten geht es wieder.',
  'kein-schluessel': 'Der Elterncode ist auf diesem Handy noch nicht eingerichtet. Einmal „Eltern-Handy fragen“, danach geht er.',
};

/** Hinweis, wo Eltern den Code finden. */
export const CODE_ORT = 'Den Code sieht ein Elternteil in LernZeit unter Kinder → Regeln → Handysperre.';

/**
 * Feld für den Elterncode. Prüft ohne Internet
 * (services/screenTime/notfall.ts) und ruft `onOk`, wenn er passt.
 */
export function NotfallCodeFeld({ onOk, knopf = 'Weiter' }: { onOk: () => void | Promise<void>; knopf?: string }) {
  const [code, setCode] = useState('');
  const [fehler, setFehler] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pruefen = async () => {
    setBusy(true); setFehler(null);
    try {
      const ergebnis = await notfallCodePruefen(code);
      if (ergebnis === 'ok') { setCode(''); await onOk(); return; }
      setFehler(FEHLER[ergebnis]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Input
        aria-label="Elterncode"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={7}
        placeholder="6 Ziffern"
        className="text-center text-2xl tracking-[0.3em] tabular"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))}
        onKeyDown={(e) => { if (e.key === 'Enter' && code.replace(/\s/g, '').length === 6) void pruefen(); }}
        disabled={busy}
      />
      {fehler && <p className="text-sm text-destructive">{fehler}</p>}
      <Button className="w-full" disabled={busy || code.replace(/\s/g, '').length !== 6} onClick={() => void pruefen()}>
        {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {knopf}
      </Button>
    </div>
  );
}

const DAUERN = [15, 30, 60];

/**
 * Notentsperrung auf dem Kinder-Handy: Elternteil liest den Code vor (auch
 * am Telefon), das Handy ist danach 15/30/60 Minuten offen, auch in der
 * Ruhezeit. Die Eltern bekommen einen Hinweis (Push + „Heute“).
 */
export function NotfallPauseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (offen: boolean) => void }) {
  const [minuten, setMinuten] = useState(30);

  const oeffnen = async () => {
    try {
      const status = await ScreenTime.pause({ minuten });
      void notfallMelden('pause', minuten).catch(() => undefined);
      onOpenChange(false);
      const bis = status.notfallBis
        ? new Date(status.notfallBis).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        : null;
      toast.success(bis ? `Handy offen bis ${bis} Uhr` : `Handy ${minuten} Minuten offen`);
      try { window.dispatchEvent(new Event(HANDYZEIT_GEAENDERT)); } catch { /* egal */ }
    } catch {
      toast.error('Das hat nicht geklappt. Bitte noch einmal versuchen.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Elterncode
          </DialogTitle>
          <DialogDescription>{CODE_ORT}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2" role="group" aria-label="Wie lange offen?">
          {DAUERN.map((m) => (
            <Button key={m} type="button" size="sm" variant={m === minuten ? 'default' : 'outline'} className="flex-1"
              aria-pressed={m === minuten} onClick={() => setMinuten(m)}>
              {m} Min.
            </Button>
          ))}
        </div>
        <NotfallCodeFeld onOk={oeffnen} knopf={`${minuten} Min. öffnen`} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Abbrechen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

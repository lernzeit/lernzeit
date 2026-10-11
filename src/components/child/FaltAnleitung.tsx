/*
 * Faltanleitung zum Nachmachen (11.10.2026): Jeder Schritt wird vorgefaltet
 * (Animation aus dem Falt-Simulator in lib/falten.ts), darunter steht in einem
 * Satz, was zu tun ist. Weiter, Zurueck, Nochmal. Bei „Bewegung reduzieren“
 * erscheint jeder Schritt gleich fertig.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  MODELLE, aufteilen, schrittAnwenden, unterwegs, zustandNach,
  type Flaeche, type Modell, type Punkt, type Zustand,
} from '@/lib/falten';
import { DekoTeil, PAPIER_FARBIG, PAPIER_WEISS } from '@/components/child/Faltung';
import { FALTUNG_MIT_ARTIKEL } from '@/lib/klecksi';
import type { Faltung as FaltungArt } from '@/lib/reise';

const TINTE = '#1a2b6d';
const DAUER_FALTE = 1300;

const weich = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const pts = (p: Punkt[]) => p.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');

interface Teil { pts: Punkt[]; farbig: boolean; key: string }

function Papier({ teile, deckkraft = 1 }: { teile: Teil[]; deckkraft?: number }) {
  return (
    <g opacity={deckkraft}>
      {teile.map((t) => (
        <polygon key={t.key} points={pts(t.pts)} fill={t.farbig ? PAPIER_FARBIG : PAPIER_WEISS}
          stroke={TINTE} strokeWidth={1.6} strokeLinejoin="round" />
      ))}
    </g>
  );
}

const sortiert = (f: Flaeche[], vorsilbe: string): Teil[] =>
  [...f].sort((a, b) => a.z - b.z).map((x, i) => ({ pts: x.pts, farbig: x.farbig, key: `${vorsilbe}${i}` }));

/** Bild eines Schritts beim Fortschritt t (0…1) */
export function FaltBild({ modell, schritt, t }: { modell: Modell; schritt: number; t: number }) {
  const vorher = useMemo(() => zustandNach(modell, schritt), [modell, schritt]);
  const s = modell.schritte[schritt];
  const nachher = useMemo(() => (s ? schrittAnwenden(vorher, s) : vorher), [vorher, s]);
  const u = weich(Math.min(1, Math.max(0, t)));

  let inhalt: React.ReactNode;
  let knicke = vorher.knicke;
  let deko = vorher.deko.map((d, i) => <DekoTeil key={`d${i}`} d={d} />);

  if (!s || t >= 1) {
    inhalt = <Papier teile={sortiert(nachher.flaechen, 'n')} />;
    knicke = nachher.knicke;
    deko = nachher.deko.map((d, i) => <DekoTeil key={`d${i}`} d={d} />);
  } else if (s.art === 'falten') {
    // Mehrere Falten nacheinander
    const n = s.falten.length;
    const T = u * n;
    const j = Math.min(n - 1, Math.floor(T));
    const lokal = weich(T - j);
    const stand = s.falten.slice(0, j).reduce<Zustand>((z, f) => schrittAnwenden(z, { art: 'falten', text: '', falten: [f] }), vorher);
    const f = s.falten[j];
    const { bleibt, klappe } = aufteilen(stand.flaechen, f);
    const [a, b] = f.achse;
    const umgeklappt = Math.cos(Math.PI * lokal) < 0;
    const bewegt: Teil[] = [...klappe].sort((x, y) => (umgeklappt ? y.z - x.z : x.z - y.z)).map((k, i) => ({
      pts: k.pts.map((p) => unterwegs(p, a, b, lokal)),
      farbig: umgeklappt ? !k.farbig : k.farbig,
      key: `k${i}`,
    }));
    const fest = sortiert(bleibt, 'b');
    inhalt = f.hinten ? <><Papier teile={bewegt} /><Papier teile={fest} /></> : <><Papier teile={fest} /><Papier teile={bewegt} /></>;
  } else if (s.art === 'knick') {
    // falten und wieder oeffnen
    const [a, b] = s.achse;
    const mitte: Punkt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const seite: Punkt = [mitte[0] - (b[1] - a[1]) * 0.01 - 1e-3, mitte[1] + (b[0] - a[0]) * 0.01];
    const { bleibt, klappe } = aufteilen(vorher.flaechen, { achse: s.achse, bewegt: seite });
    const lokal = u < 0.5 ? u * 2 : 2 - u * 2;
    const umgeklappt = Math.cos(Math.PI * lokal * 0.95) < 0;
    const bewegt: Teil[] = klappe.map((k, i) => ({
      pts: k.pts.map((p) => unterwegs(p, a, b, lokal * 0.95)),
      farbig: umgeklappt ? !k.farbig : k.farbig,
      key: `k${i}`,
    }));
    inhalt = <><Papier teile={sortiert(bleibt, 'b')} /><Papier teile={bewegt} /></>;
  } else if (s.art === 'umdrehen') {
    const c = Math.cos(Math.PI * u);
    const teile = [...vorher.flaechen].sort((a, b) => (c < 0 ? b.z - a.z : a.z - b.z)).map((f, i) => ({
      pts: f.pts.map(([x, y]) => [100 + (x - 100) * c, y] as Punkt),
      farbig: c < 0 ? !f.farbig : f.farbig,
      key: `u${i}`,
    }));
    inhalt = <Papier teile={teile} />;
    knicke = [];
  } else if (s.art === 'neu') {
    inhalt = <><Papier teile={sortiert(vorher.flaechen, 'a')} deckkraft={1 - u} /><Papier teile={sortiert(nachher.flaechen, 'n')} deckkraft={u} /></>;
    knicke = u > 0.5 ? nachher.knicke : vorher.knicke;
  } else {
    inhalt = <Papier teile={sortiert(nachher.flaechen, 'n')} />;
    deko = nachher.deko.map((d, i) => <DekoTeil key={`d${i}`} d={d} deckkraft={i < vorher.deko.length ? 1 : u} />);
  }

  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      {inhalt}
      {knicke.map(([p, q], i) => (
        <line key={`c${i}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="#8a96b8" strokeWidth={1.2} strokeDasharray="4 4" />
      ))}
      {deko}
    </svg>
  );
}

/** Dauer eines Schritts in ms (wie in der Anleitung) */
const schrittDauer = (m: Modell, i: number) => {
  const s = m.schritte[i];
  if (!s || s.art === 'fertig') return 0;
  return s.art === 'falten' ? DAUER_FALTE * s.falten.length : s.art === 'knick' ? 1800 : 1100;
};

/**
 * Faltet eine Figur einmal ganz vor, Schritt fuer Schritt, und faengt nach
 * einer Pause wieder an (Startseite). Laeuft nur, solange `spielen` gilt;
 * bei „Bewegung reduzieren“ steht die fertige Figur da.
 */
export function FaltFilm({ art, spielen = true, className = '' }: { art: FaltungArt; spielen?: boolean; className?: string }) {
  const modell = MODELLE[art];
  const ende = modell.schritte.length;
  const [stand, setStand] = useState({ schritt: 0, t: 0 });

  useEffect(() => {
    const ruhig = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (ruhig) { setStand({ schritt: ende, t: 1 }); return; }
    if (!spielen) return;
    const PAUSE = 380;
    const SCHLUSS = 2200;
    let rahmen = 0;
    let beginn = 0;
    const plan: { schritt: number; von: number; bis: number }[] = [];
    let zeit = 300;
    for (let i = 0; i < ende; i++) {
      const d = schrittDauer(modell, i);
      if (d === 0) continue;
      plan.push({ schritt: i, von: zeit, bis: zeit + d });
      zeit += d + PAUSE;
    }
    const gesamt = zeit + SCHLUSS;
    const lauf = (jetzt: number) => {
      if (!beginn) beginn = jetzt;
      const z = (jetzt - beginn) % gesamt;
      const aktiv = plan.find((p) => z < p.bis) ?? null;
      if (!aktiv) setStand({ schritt: ende, t: 1 });
      else if (z < aktiv.von) setStand({ schritt: aktiv.schritt, t: 0 });
      else setStand({ schritt: aktiv.schritt, t: (z - aktiv.von) / (aktiv.bis - aktiv.von) });
      rahmen = requestAnimationFrame(lauf);
    };
    rahmen = requestAnimationFrame(lauf);
    return () => cancelAnimationFrame(rahmen);
  }, [modell, ende, spielen]);

  return (
    <div className={className}>
      <FaltBild modell={modell} schritt={Math.min(stand.schritt, ende)} t={stand.t} />
    </div>
  );
}

export function FaltAnleitung({ art, offen, onOpenChange }: {
  art: FaltungArt | null;
  offen: boolean;
  onOpenChange: (offen: boolean) => void;
}) {
  const modell = art ? MODELLE[art] : null;
  const [schritt, setSchritt] = useState(0);
  const [t, setT] = useState(0);
  const [lauf, setLauf] = useState(0);
  const rahmen = useRef<number | null>(null);

  useEffect(() => {
    if (offen) { setSchritt(0); setLauf((n) => n + 1); }
  }, [offen, art]);

  // Schritt vorfalten: kurz warten, dann animieren
  useEffect(() => {
    if (!modell || !offen) return;
    const s = modell.schritte[schritt];
    const ruhig = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (ruhig || !s || s.art === 'fertig') { setT(1); return; }
    const dauer = s.art === 'falten' ? DAUER_FALTE * s.falten.length : s.art === 'knick' ? 1800 : 1100;
    setT(0);
    let start = 0;
    const warte = window.setTimeout(() => {
      const schrittBild = (jetzt: number) => {
        if (!start) start = jetzt;
        const neu = Math.min(1, (jetzt - start) / dauer);
        setT(neu);
        if (neu < 1) rahmen.current = requestAnimationFrame(schrittBild);
      };
      rahmen.current = requestAnimationFrame(schrittBild);
    }, 450);
    return () => {
      window.clearTimeout(warte);
      if (rahmen.current) cancelAnimationFrame(rahmen.current);
    };
  }, [modell, schritt, offen, lauf]);

  if (!modell || !art) return null;
  const anzahl = modell.schritte.length;
  const s = modell.schritte[schritt];

  return (
    <Dialog open={offen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>So faltest du {FALTUNG_MIT_ARTIKEL[art]}</DialogTitle>
          <DialogDescription>Du brauchst {modell.papier}.</DialogDescription>
        </DialogHeader>
        <div className="heft-karo aspect-square w-full overflow-hidden rounded-2xl bg-background ring-1 ring-inset ring-karo">
          <FaltBild modell={modell} schritt={schritt} t={t} />
        </div>
        <p className="text-xs font-bold text-muted-foreground">Schritt {schritt + 1} von {anzahl}</p>
        <p aria-live="polite" className="font-hand min-h-[3.5rem] text-[17px] leading-snug text-tinte">{s.text}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Zurück" disabled={schritt === 0} onClick={() => setSchritt((n) => Math.max(0, n - 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => setLauf((n) => n + 1)}>
            <RotateCcw className="h-4 w-4" /> Nochmal zeigen
          </Button>
          {schritt < anzahl - 1 ? (
            <Button size="icon" aria-label="Weiter" onClick={() => setSchritt((n) => Math.min(anzahl - 1, n + 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          ) : (
            <Button onClick={() => onOpenChange(false)}>Fertig</Button>
          )}
        </div>
        {modell.papier.includes('quadratisch') && schritt === 0 && (
          <p className="text-xs text-muted-foreground">
            Tipp: Aus einem A4-Blatt wird ein Quadrat, wenn du eine Ecke schräg zur anderen Kante faltest und den Streifen abschneidest.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

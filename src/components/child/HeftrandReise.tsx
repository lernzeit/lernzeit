/*
 * Klecksis Heftrand-Reise auf dem Kind-Start (11.10.2026, Entwurf im Artefakt
 * „Klecksi und die Heftrand-Reise“). Eine Seite mit 12 Heftrand-Kritzeln auf
 * einem Pfad von unten nach oben; ausgemalt in der Heftfarbe des Fachs, Stern
 * = Lernplan oder Schwerpunkt (doppelt weit). Klecksi steht auf dem naechsten
 * Feld, oben wartet, was er am Seitenende faltet. Regeln: lib/reise.ts.
 */
import { useEffect, useId, useState } from 'react';
import { Klecksi } from '@/components/klecksi/Klecksi';
import { useKlecksiAn } from '@/hooks/useKlecksi';
import type { LernStand } from '@/lib/klecksiLernstand';
import { Faltung } from '@/components/child/Faltung';
import { FaltAnleitung } from '@/components/child/FaltAnleitung';
import {
  BUNT_AB_FAECHERN, FALTUNG_NAME, FELDER_JE_SEITE, faecherAufSeite, faltungFuer, istDoppelt,
  type ReiseFeld, type ReiseSeite,
} from '@/lib/reise';
import { FALTUNG_MIT_ARTIKEL } from '@/lib/klecksi';

const B = 326;
const H = 392;
const TINTE = '#1a2b6d';
const BLAU = '#2563eb';
const BLEISTIFT = '#8a96b8';

const FELDER: [number, number][] = [
  [52, 352], [163, 340], [274, 352],
  [274, 268], [163, 256], [52, 268],
  [52, 184], [163, 172], [274, 184],
  [274, 100], [163, 88], [52, 100],
];
const ZIEL: [number, number] = [176, 30];
const FORMEN = ['quadrat', 'kreis', 'dreieck', 'herz', 'stern', 'wuerfel', 'raute', 'wolke', 'blitz', 'mond', 'haus', 'fisch'] as const;
type Form = (typeof FORMEN)[number];

function weg([x1, y1]: [number, number], [x2, y2]: [number, number]) {
  if (Math.abs(y1 - y2) < 30) {
    const mx = (x1 + x2) / 2;
    return `M${x1} ${y1} C${mx} ${y1 + 18} ${mx} ${y2 - 18} ${x2} ${y2}`;
  }
  const k = x1 > 160 ? 318 : 8;
  return `M${x1} ${y1} C${k} ${y1} ${k} ${y2} ${x2} ${y2}`;
}

const sternPunkte = (r1: number, r2: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? r1 : r2;
    return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');

function Kritzel({ form, x, y, zustand, farbe }: {
  form: Form; x: number; y: number; zustand: 'fertig' | 'jetzt' | 'offen'; farbe?: string;
}) {
  const st =
    zustand === 'fertig' ? { fill: farbe, stroke: TINTE, strokeWidth: 2.4, strokeLinejoin: 'round' as const }
    : zustand === 'jetzt' ? { fill: '#ffffff', stroke: TINTE, strokeWidth: 2.6, strokeLinejoin: 'round' as const }
    : { fill: '#ffffff', fillOpacity: 0.8, stroke: BLEISTIFT, strokeWidth: 2, strokeDasharray: '4 3', strokeLinejoin: 'round' as const };
  const inhalt = (() => {
    switch (form) {
      case 'quadrat':
        return (
          <>
            <rect x={-15} y={-15} width={30} height={30} rx={3} {...st} />
            {zustand === 'fertig' && <path d="M-15 0 H15 M0 -15 V15" stroke={TINTE} strokeWidth={1.6} opacity={0.5} />}
          </>
        );
      case 'kreis': return <circle r={17} {...st} />;
      case 'dreieck': return <path d="M0 -18 L18 14 L-18 14 Z" {...st} />;
      case 'herz': return <path d="M0 16 C-22 2 -17 -19 0 -7 C17 -19 22 2 0 16 Z" {...st} />;
      case 'stern': return <polygon points={sternPunkte(19, 8.5)} {...st} />;
      case 'wuerfel':
        return (
          <>
            <path d="M-15 -8 L-6 -16 L16 -16 L7 -8 Z" {...st} />
            <path d="M7 -8 L16 -16 L16 7 L7 15 Z" {...st} />
            <rect x={-15} y={-8} width={22} height={23} {...st} />
          </>
        );
      case 'raute': return <path d="M0 -19 L16 0 L0 19 L-16 0 Z" {...st} />;
      case 'wolke': return <path d="M-14 12 C-22 12 -22 0 -14 -1 C-15 -11 -3 -15 2 -8 C6 -15 18 -12 16 -2 C24 -1 23 12 15 12 Z" {...st} />;
      case 'blitz': return <path d="M5 -19 L-11 3 L-1 3 L-5 19 L11 -3 L1 -3 Z" {...st} />;
      case 'mond': return <path d="M5 -18 C-21 -15 -21 15 5 18 C-7 11 -7 -11 5 -18 Z" {...st} />;
      case 'haus': return <path d="M-14 16 L-14 -2 L0 -17 L14 -2 L14 16 Z" {...st} />;
      case 'fisch': return <path d="M-12 0 C-6 -12 10 -12 15 0 C10 12 -6 12 -12 0 L-20 -9 L-20 9 Z" {...st} />;
    }
  })();
  return <g transform={`translate(${x} ${y})`}>{inhalt}</g>;
}

/** Zeitplan beim Ausmalen (ms): warten, ein Feld malen, zum naechsten huepfen */
export const MAL_PAUSE = 700;
export const MAL_DAUER = 1100;
export const MAL_HUEPFEN = 750;

/**
 * Das Spielbrett der Reise: Pfad mit 12 Feldern, Klecksi auf dem naechsten
 * Feld, oben die Faltfigur. Auch auf der Startseite (landing/KlecksiReise).
 *
 * `neuAb` (Rundenende, 21.10.2026): Felder ab diesem Index sind neu. Klecksi
 * stellt sich neben jedes neue Feld und malt es mit dem Pinsel aus (Maske
 * wie ein Pinselstrich), dann huepft er weiter. Bei „Bewegung reduzieren“
 * steht sofort das Ergebnis da.
 */
export function ReisePfad({ seite, felder, farbe, zielFertig = false, stand, neuAb, bereit = true, className = '' }: {
  seite: number;
  felder: ReiseFeld[];
  farbe: (fach: string) => string;
  /** Lernstand: blass oder ausgetrocknet steht Klecksi still und ist blass (Groesse bleibt) */
  stand?: LernStand;
  /** Faltfigur oben schon fertig (Seite voll) statt mit Bleistift */
  zielFertig?: boolean;
  /** Felder ab diesem Index nacheinander ausmalen (Animation) */
  neuAb?: number;
  /** Ausmalen erst starten, wenn sichtbar (ReiseAusmalen) */
  bereit?: boolean;
  className?: string;
}) {
  const maskeId = useId().replace(/:/g, '');
  const [schritt, setSchritt] = useState<{ gezeigt: number; malt: number | null }>(
    () => ({ gezeigt: neuAb != null ? Math.min(neuAb, felder.length) : felder.length, malt: null }),
  );
  useEffect(() => {
    if (neuAb == null || neuAb >= felder.length) { setSchritt({ gezeigt: felder.length, malt: null }); return; }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setSchritt({ gezeigt: felder.length, malt: null }); return; }
    setSchritt({ gezeigt: neuAb, malt: null });
    if (!bereit) return;
    const uhr: number[] = [];
    let t = MAL_PAUSE;
    for (let i = neuAb; i < felder.length; i++) {
      uhr.push(window.setTimeout(() => setSchritt({ gezeigt: i, malt: i }), t));
      t += MAL_DAUER;
      uhr.push(window.setTimeout(() => setSchritt({ gezeigt: i + 1, malt: null }), t));
      t += MAL_HUEPFEN;
    }
    return () => uhr.forEach((u) => window.clearTimeout(u));
  }, [neuAb, felder.length, bereit]);

  const gemalt = schritt.gezeigt;
  const malt = schritt.malt;
  const faltung = faltungFuer(seite);
  const [fx, fy] = FELDER[Math.min(gemalt, FELDER_JE_SEITE - 1)];
  // Solange noch Felder auszumalen sind, steht Klecksi neben dem naechsten
  // (rechts, in der rechten Spalte links), danach wieder auf dem Feld.
  const laeuft = neuAb != null && gemalt < felder.length;
  const seitlich = !laeuft ? 0 : fx > 200 ? -1 : 1;
  const kx = seitlich === 0 ? fx : fx + seitlich * 42;
  const ky = seitlich === 0 ? fy : fy + 8;
  const mitKlecksi = useKlecksiAn();
  return (
    <div className={`heft-karo relative overflow-hidden rounded-2xl ring-1 ring-inset ring-karo ${className}`} style={{ aspectRatio: `${B} / ${H}` }}>
      <svg viewBox={`0 0 ${B} ${H}`} className="absolute inset-0 h-full w-full" role="img"
        aria-label={`Seite ${seite}: ${gemalt} von ${FELDER_JE_SEITE} Feldern ausgemalt. Am Seitenende faltet Klecksi ${FALTUNG_MIT_ARTIKEL[faltung]}.`}>
        {/* roter Heftrand */}
        <path d={`M296 0 V${H}`} stroke="#d4483b" strokeWidth={1.6} opacity={0.55} />
        <path d={`M300 0 V${H}`} stroke="#d4483b" strokeWidth={1.6} opacity={0.55} />
        {FELDER.slice(0, -1).map((p, i) => {
          const d = weg(p, FELDER[i + 1]);
          return i < gemalt ? (
            <g key={i}>
              <path d={d} fill="none" stroke={BLAU} strokeWidth={6} strokeLinecap="round" />
              <path className="reise-spur" d={d} fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeDasharray="2 14" opacity={0.6} />
            </g>
          ) : (
            <path key={i} d={d} fill="none" stroke={TINTE} strokeWidth={2.6} strokeLinecap="round" strokeDasharray="0.5 9" opacity={0.55} />
          );
        })}
        <path
          d={`M${FELDER[11][0]} ${FELDER[11][1]} C${FELDER[11][0] - 30} ${FELDER[11][1] - 50} ${ZIEL[0] - 80} ${ZIEL[1] + 6} ${ZIEL[0] - 38} ${ZIEL[1] + 6}`}
          fill="none" stroke={TINTE} strokeWidth={2.6} strokeLinecap="round" strokeDasharray="0.5 9" opacity={0.55}
        />
        {/* Ziel der Seite: mit Bleistift, bis die Seite voll ist */}
        <g transform={`translate(${ZIEL[0] - 38} ${ZIEL[1] - 30}) scale(2)`}>
          <Faltung art={faltung} offen={!zielFertig} groesse={38} />
        </g>
        {FELDER.map(([x, y], i) => {
          const f = felder[i];
          if (f && i === malt) {
            return (
              <g key={i}>
                <mask id={`${maskeId}-${i}`} maskUnits="userSpaceOnUse" x={x - 30} y={y - 30} width={60} height={60}>
                  <path transform={`translate(${x} ${y})`} d="M-24 -15 L22 -17 L-22 -5 L23 -6 L-23 6 L22 5 L-21 17 L20 18"
                    fill="none" stroke="#fff" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round"
                    pathLength={1} strokeDasharray="1 1" strokeDashoffset={1}>
                    <animate attributeName="stroke-dashoffset" from="1" to="0" dur={`${(MAL_DAUER - 200) / 1000}s`} begin="indefinite" fill="freeze"
                      ref={(el) => { try { (el as unknown as { beginElement?: () => void } | null)?.beginElement?.(); } catch { /* ohne SMIL: sofort fertig */ } }} />
                  </path>
                </mask>
                <Kritzel form={FORMEN[i]} x={x} y={y} zustand="jetzt" />
                <g mask={`url(#${maskeId}-${i})`}>
                  <Kritzel form={FORMEN[i]} x={x} y={y} zustand="fertig" farbe={farbe(f.fach)} />
                </g>
              </g>
            );
          }
          if (f && i < gemalt) {
            return (
              <g key={i}>
                <Kritzel form={FORMEN[i]} x={x} y={y} zustand="fertig" farbe={farbe(f.fach)} />
                {istDoppelt(f.quelle) && (
                  <polygon transform={`translate(${x + 16} ${y - 16})`} points={sternPunkte(6.5, 2.9)} fill="#eaa315" stroke={TINTE} strokeWidth={1.4} strokeLinejoin="round" />
                )}
              </g>
            );
          }
          return <Kritzel key={i} form={FORMEN[i]} x={x} y={y} zustand={i === gemalt && malt == null ? 'jetzt' : 'offen'} />;
        })}
        {/* Ohne Klecksi: ein Tintentropfen ueber dem naechsten Feld */}
        {!mitKlecksi && gemalt < FELDER_JE_SEITE && (
          <path transform={`translate(${kx} ${ky - 30})`} d="M0 -11 C5 -4 8 0 8 4 A8 8 0 0 1 -8 4 C-8 0 -5 -4 0 -11 Z" fill={BLAU} stroke={TINTE} strokeWidth={1.5} />
        )}
      </svg>
      {/* Klecksi steht auf dem naechsten Feld */}
      {mitKlecksi && <div className={`reise-klecksi ${malt != null ? 'reise-malt' : ''} pointer-events-none absolute transition-[left,top] duration-700 ease-out motion-reduce:transition-none`}
        style={{ left: `${((kx - 26) / B) * 100}%`, top: `${((ky - 58) / H) * 100}%`, width: `${(52 / B) * 100}%` }}>
        <Klecksi groesse="voll" stand={stand} festeGroesse
          pinsel={malt != null && felder[malt] ? { farbe: farbe(felder[malt].fach), seite: seitlich > 0 ? 'links' : 'rechts' } : undefined} />
      </div>}
    </div>
  );
}

/**
 * Ausschnitt der Seite am Rundenende (21.10.2026): nur die Reihen um die
 * neuen Felder, darin malt Klecksi sie aus (ReisePfad mit `neuAb`).
 */
const FENSTER = 210;
export function ReiseAusmalen({ seite, felder, neuAb, farbe }: {
  seite: number;
  /** alle Felder der Seite, die neuen zuletzt */
  felder: ReiseFeld[];
  neuAb: number;
  farbe: (fach: string) => string;
}) {
  const erstes = FELDER[Math.min(neuAb, FELDER_JE_SEITE - 1)][1];
  const letztes = FELDER[Math.min(Math.max(neuAb, felder.length - 1), FELDER_JE_SEITE - 1)][1];
  const oben = Math.max(0, Math.min(H - FENSTER, (erstes + letztes) / 2 - FENSTER / 2 + 10));
  const [rahmen, setRahmen] = useState<HTMLDivElement | null>(null);
  const [sichtbar, setSichtbar] = useState(false);
  useEffect(() => {
    if (!rahmen || sichtbar) return;
    if (typeof IntersectionObserver === 'undefined') { setSichtbar(true); return; }
    const beobachter = new IntersectionObserver(([e]) => { if (e?.isIntersecting) setSichtbar(true); }, { threshold: 0.6 });
    beobachter.observe(rahmen);
    return () => beobachter.disconnect();
  }, [rahmen, sichtbar]);
  return (
    <div ref={setRahmen} className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: `${B} / ${FENSTER}` }}>
      <div className="absolute inset-x-0" style={{ top: `${(-oben / FENSTER) * 100}%` }}>
        <ReisePfad seite={seite} felder={felder} farbe={farbe} neuAb={neuAb} bereit={sichtbar} />
      </div>
    </div>
  );
}

export function HeftrandReise({ seite, felder, seiten, farbe, fachName, stand }: {
  seite: number;
  stand?: LernStand;
  /** Felder der aktuellen Seite */
  felder: ReiseFeld[];
  /** Fertige Seiten (Regal) */
  seiten: ReiseSeite[];
  farbe: (fach: string) => string;
  fachName: (fach: string) => string;
}) {
  const gemalt = felder.length;
  const faltung = faltungFuer(seite);
  const faecher = faecherAufSeite(felder);
  const fehlen = Math.max(0, BUNT_AB_FAECHERN - faecher.length);
  const regal = seiten.slice(-3);
  const [anleitung, setAnleitung] = useState<ReiseSeite['faltung'] | null>(null);
  const mitKlecksi = useKlecksiAn();

  return (
    <section aria-labelledby="reise-titel" className="rounded-[28px] bg-card p-4 ring-1 ring-inset ring-karo">
      <h2 id="reise-titel" className="text-xl font-extrabold leading-tight">{mitKlecksi ? 'Klecksis Heftrand-Reise' : 'Deine Lernreise'}</h2>
      <p className="text-sm font-semibold text-muted-foreground">
        Seite {seite} · {gemalt} von {FELDER_JE_SEITE} Feldern
      </p>

      <ReisePfad seite={seite} felder={felder} farbe={farbe} stand={stand} className="mt-3" />
      <p className="font-hand mt-2 text-center text-sm text-muted-foreground">
        {mitKlecksi ? <>Oben faltet Klecksi {FALTUNG_MIT_ARTIKEL[faltung]} für dich.</> : <>Am Seitenende: {FALTUNG_NAME[faltung]} zum Nachfalten.</>}
      </p>

      {/* Faecher dieser Seite */}
      <div className="mt-3 space-y-2 rounded-2xl bg-background px-3 py-3">
        <div className="flex flex-wrap gap-x-3.5 gap-y-2">
          {faecher.map((f) => (
            <span key={f.fach} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-tinte">
              <span className="h-3.5 w-3.5 rounded-[4px] ring-2 ring-tinte" style={{ backgroundColor: farbe(f.fach) }} />
              {fachName(f.fach)} {f.anzahl}
            </span>
          ))}
          {Array.from({ length: fehlen }, (_, i) => (
            <span key={`leer${i}`} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted-foreground">
              <span className="h-3.5 w-3.5 rounded-[4px] border-2 border-dashed" style={{ borderColor: BLEISTIFT }} />
              noch ein Fach
            </span>
          ))}
        </div>
        <p className="text-[13px] leading-snug text-muted-foreground">
          {fehlen > 0
            ? <>Mit {BUNT_AB_FAECHERN} Fächern wird die Seite <b className="text-tinte">bunt: +20 Tinte</b>. </>
            : <><b className="text-tinte">Bunte Seite!</b> Am Seitenende gibt es +20 Tinte extra. </>}
          Sterne: Lernplan oder Schwerpunkt, doppelt weit.
        </p>
      </div>

      {/* Regal mit dem, was Klecksi schon gefaltet hat */}
      <div className="mt-3">
        <h3 className="text-[13px] font-extrabold text-tinte">Schon gefaltet</h3>
        <div className="mt-1 flex items-end justify-between gap-1 border-b-4 border-tinte px-1 pb-2 pt-2">
          {regal.map((s) => (
            <button
              key={s.seite}
              type="button"
              onClick={() => setAnleitung(s.faltung)}
              aria-label={`${FALTUNG_NAME[s.faltung]} nachfalten`}
              className="flex w-[70px] flex-col items-center gap-0.5 rounded-xl text-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Faltung art={s.faltung} bunt={s.bunt} />
              <span className="text-xs font-bold leading-tight text-tinte">{FALTUNG_NAME[s.faltung]}</span>
              <span className="text-[11px] font-semibold text-primary">Nachfalten</span>
            </button>
          ))}
          <figure className="flex w-[70px] flex-col items-center gap-0.5 text-center">
            <Faltung art={faltung} offen />
            <figcaption className="text-xs font-bold leading-tight text-muted-foreground">{FALTUNG_NAME[faltung]}</figcaption>
            <span className="text-[11px] font-semibold text-muted-foreground">Seite {seite}</span>
          </figure>
          {regal.length < 3 && <span className="flex-1" />}
        </div>
        {regal.length > 0 && <p className="mt-1.5 text-xs text-muted-foreground">{mitKlecksi ? 'Tipp drauf: Klecksi zeigt dir, wie du es nachfaltest.' : 'Tipp drauf: So faltest du es nach.'}</p>}
      </div>
      <FaltAnleitung art={anleitung} offen={anleitung !== null} onOpenChange={(o) => !o && setAnleitung(null)} />
    </section>
  );
}

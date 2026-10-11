/*
 * Kleckis Heftrand-Reise auf dem Kind-Start (11.10.2026, Entwurf im Artefakt
 * „Klecksi und die Heftrand-Reise“). Eine Seite mit 12 Heftrand-Kritzeln auf
 * einem Pfad von unten nach oben; ausgemalt in der Heftfarbe des Fachs, Stern
 * = Lernplan oder Schwerpunkt (doppelt weit). Klecksi steht auf dem naechsten
 * Feld, oben wartet, was er am Seitenende faltet. Regeln: lib/reise.ts.
 */
import { useState } from 'react';
import { Klecksi } from '@/components/klecksi/Klecksi';
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

export function HeftrandReise({ seite, felder, seiten, farbe, fachName }: {
  seite: number;
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
  const [kx, ky] = FELDER[Math.min(gemalt, FELDER_JE_SEITE - 1)];
  const regal = seiten.slice(-3);
  const [anleitung, setAnleitung] = useState<ReiseSeite['faltung'] | null>(null);

  return (
    <section aria-labelledby="reise-titel" className="rounded-[28px] bg-card p-4 ring-1 ring-inset ring-karo">
      <h2 id="reise-titel" className="text-xl font-extrabold leading-tight">Kleckis Heftrand-Reise</h2>
      <p className="text-sm font-semibold text-muted-foreground">
        Seite {seite} · {gemalt} von {FELDER_JE_SEITE} Feldern
      </p>

      <div className="heft-karo relative mt-3 overflow-hidden rounded-2xl ring-1 ring-inset ring-karo" style={{ aspectRatio: `${B} / ${H}` }}>
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
          {/* Ziel der Seite, noch mit Bleistift */}
          <g transform={`translate(${ZIEL[0] - 38} ${ZIEL[1] - 30}) scale(2)`}>
            <Faltung art={faltung} offen groesse={38} />
          </g>
          {FELDER.map(([x, y], i) => {
            const f = felder[i];
            if (f) {
              return (
                <g key={i}>
                  <Kritzel form={FORMEN[i]} x={x} y={y} zustand="fertig" farbe={farbe(f.fach)} />
                  {istDoppelt(f.quelle) && (
                    <polygon transform={`translate(${x + 16} ${y - 16})`} points={sternPunkte(6.5, 2.9)} fill="#eaa315" stroke={TINTE} strokeWidth={1.4} strokeLinejoin="round" />
                  )}
                </g>
              );
            }
            return <Kritzel key={i} form={FORMEN[i]} x={x} y={y} zustand={i === gemalt ? 'jetzt' : 'offen'} />;
          })}
        </svg>
        {/* Klecksi steht auf dem naechsten Feld */}
        <div className="reise-klecksi pointer-events-none absolute"
          style={{ left: `${((kx - 26) / B) * 100}%`, top: `${((ky - 58) / H) * 100}%`, width: `${(52 / B) * 100}%` }}>
          <Klecksi groesse="voll" />
        </div>
      </div>
      <p className="font-hand mt-2 text-center text-sm text-muted-foreground">
        Oben faltet Klecksi {FALTUNG_MIT_ARTIKEL[faltung]} für dich.
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
        {regal.length > 0 && <p className="mt-1.5 text-xs text-muted-foreground">Tipp drauf: Klecksi zeigt dir, wie du es nachfaltest.</p>}
      </div>
      <FaltAnleitung art={anleitung} offen={anleitung !== null} onOpenChange={(o) => !o && setAnleitung(null)} />
    </section>
  );
}

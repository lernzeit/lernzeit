/*
 * Was Klecksi am Ende einer Reise-Seite aus Papier faltet (lib/reise.ts).
 * Das kleine Bild ist das Ergebnis der Faltanleitung (lib/falten.ts), damit
 * Regal und Anleitung immer gleich aussehen. offen = gestrichelt wie mit
 * Bleistift (noch nicht gefaltet).
 */
import { useMemo } from 'react';
import { MODELLE, zustandNach, type Deko, type Zustand } from '@/lib/falten';
import type { Faltung as FaltungArt } from '@/lib/reise';

export const PAPIER_WEISS = '#ffffff';
export const PAPIER_FARBIG = '#a9c4ff';
const TINTE = '#1a2b6d';
const BLEISTIFT = '#8a96b8';

export function DekoTeil({ d, deckkraft = 1 }: { d: Deko; deckkraft?: number }) {
  if (d.typ === 'kreis') return <circle cx={d.x} cy={d.y} r={d.r} fill={d.farbe} opacity={deckkraft} />;
  if (d.typ === 'linie') {
    return <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={d.farbe} strokeWidth={d.breite} strokeLinecap="round" opacity={deckkraft} />;
  }
  return <path d={d.d} stroke={d.farbe} fill={d.fuellung ?? 'none'} strokeWidth={d.breite ?? 1.5} strokeLinejoin="round" opacity={deckkraft} />;
}

/** Rahmen um alle Flaechen, fuer das kleine Bild */
function rahmen(z: Zustand) {
  const xs = z.flaechen.flatMap((f) => f.pts.map((p) => p[0]));
  const ys = z.flaechen.flatMap((f) => f.pts.map((p) => p[1]));
  for (const d of z.deko) {
    if (d.typ === 'kreis') { xs.push(d.x - d.r, d.x + d.r); ys.push(d.y - d.r, d.y + d.r); }
    if (d.typ === 'linie') { xs.push(d.x1, d.x2); ys.push(d.y1, d.y2); }
  }
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const rand = 4;
  return `${minX - rand} ${minY - rand} ${maxX - minX + 2 * rand} ${maxY - minY + 2 * rand}`;
}

export function Faltung({ art, offen = false, bunt = false, groesse = 38 }: {
  art: FaltungArt;
  offen?: boolean;
  bunt?: boolean;
  groesse?: number;
}) {
  const z = useMemo(() => {
    const m = MODELLE[art] ?? MODELLE.papierflieger;
    return zustandNach(m, m.schritte.length);
  }, [art]);
  const farbig = bunt ? '#ffd27a' : PAPIER_FARBIG;
  return (
    <svg width={groesse} height={(groesse * 34) / 38} viewBox={rahmen(z)} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {[...z.flaechen].sort((a, b) => a.z - b.z).map((f, i) => (
        <polygon
          key={i}
          points={f.pts.map((p) => p.join(',')).join(' ')}
          fill={offen ? '#ffffff' : f.farbig ? farbig : PAPIER_WEISS}
          stroke={offen ? BLEISTIFT : TINTE}
          strokeWidth={offen ? 4 : 4.5}
          strokeDasharray={offen ? '9 7' : undefined}
          strokeLinejoin="round"
        />
      ))}
      {!offen && z.deko.map((d, i) => <DekoTeil key={i} d={d} />)}
    </svg>
  );
}

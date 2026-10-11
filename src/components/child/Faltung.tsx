/*
 * Was Klecksi am Ende einer Reise-Seite aus Papier faltet (lib/reise.ts).
 * Flache Zeichnungen mit Tinte-Rand; offen = gestrichelt wie mit Bleistift.
 */
import type { Faltung as FaltungArt } from '@/lib/reise';

const TINTE = '#1a2b6d';
const BLEISTIFT = '#8a96b8';

export function Faltung({ art, offen = false, bunt = false, groesse = 38 }: {
  art: FaltungArt;
  offen?: boolean;
  bunt?: boolean;
  groesse?: number;
}) {
  const papier = offen ? '#ffffff' : bunt ? '#fff4c9' : '#ffffff';
  const st = offen
    ? { fill: papier, stroke: BLEISTIFT, strokeWidth: 2, strokeDasharray: '3 3', strokeLinejoin: 'round' as const }
    : { fill: papier, stroke: TINTE, strokeWidth: 2, strokeLinejoin: 'round' as const };
  const linie = offen
    ? { stroke: BLEISTIFT, strokeWidth: 1.4, strokeDasharray: '2 3' }
    : { stroke: TINTE, strokeWidth: 1.4 };
  const gruen = offen ? papier : '#15a05a';

  const teile = (() => {
    switch (art) {
      case 'papierflieger':
        return <><path d="M3 18 L35 4 L22 30 L17 21 Z" {...st} /><path d="M17 21 L35 4" {...linie} /></>;
      case 'frosch':
        return (
          <>
            <path d="M6 28 C4 16 12 10 19 10 C26 10 34 16 32 28 Z" {...st} fill={gruen} />
            <circle cx="13" cy="11" r="4.5" {...st} /><circle cx="25" cy="11" r="4.5" {...st} />
            {!offen && <><circle cx="13" cy="11" r="1.6" fill={TINTE} /><circle cx="25" cy="11" r="1.6" fill={TINTE} /></>}
          </>
        );
      case 'himmel_hoelle':
        return <><path d="M19 4 L34 17 L19 30 L4 17 Z" {...st} /><path d="M19 4 V30 M4 17 H34" {...linie} /></>;
      case 'papierschiff':
        return <><path d="M3 20 L35 20 L28 30 L10 30 Z" {...st} /><path d="M11 20 L19 5 L27 20" {...st} /></>;
      case 'kranich':
        return (
          <>
            <path d="M10 20 L19 12 L28 20 L19 26 Z" {...st} />
            <path d="M19 12 L22 4 L25 6 Z M10 20 L3 10 L8 19 Z M28 20 L35 9 L30 19 Z" {...st} />
          </>
        );
      case 'fisch':
        return <><path d="M6 17 L18 8 L30 17 L18 26 Z" {...st} /><path d="M30 17 L36 10 L36 24 Z" {...st} /><path d="M18 8 V26" {...linie} /></>;
      case 'hut':
        return <><path d="M8 26 L19 5 L30 26 Z" {...st} /><path d="M4 26 H34 V30 H4 Z" {...st} /></>;
      case 'stern':
        return (
          <>
            <path d="M19 3 L23 13 L34 13 L25 20 L29 31 L19 24 L9 31 L13 20 L4 13 L15 13 Z" {...st} />
            <path d="M19 3 V24 M4 13 L25 20 M34 13 L13 20" {...linie} />
          </>
        );
      case 'herz':
        return <><path d="M19 30 C3 20 6 6 13 6 C16 6 18 8 19 11 C20 8 22 6 25 6 C32 6 35 20 19 30 Z" {...st} /><path d="M19 11 V30" {...linie} /></>;
      case 'becher':
        return <><path d="M8 6 L30 6 L26 30 L12 30 Z" {...st} /><path d="M8 6 L19 14 L30 6" {...linie} /></>;
    }
  })();

  return (
    <svg width={groesse} height={(groesse * 34) / 38} viewBox="0 0 38 34" aria-hidden="true">
      {teile}
    </svg>
  );
}

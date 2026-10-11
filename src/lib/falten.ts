/*
 * Faltanleitungen zum Nachmachen (11.10.2026): Was Klecksi am Ende einer
 * Reise-Seite faltet, koennen Kinder Schritt fuer Schritt nachfalten.
 *
 * Ein kleiner Falt-Simulator fuer flache Faltungen: Das Papier besteht aus
 * Flaechen (Vieleck, sichtbare Seite, Ebene). Ein Faltschritt teilt jede
 * Flaeche an der Faltlinie und spiegelt den beweglichen Teil auf die andere
 * Seite (Talfalte nach vorn, Bergfalte nach hinten). So ergibt sich jedes Bild
 * aus dem vorigen; nur Schritte, die nicht flach sind (Hut aufziehen, Becher
 * oeffnen), sind fertig gezeichnet. Animiert wird in FaltAnleitung.tsx.
 */

export type Punkt = [number, number];

export interface Flaeche {
  pts: Punkt[];
  /** true: die farbige Seite ist zu sehen */
  farbig: boolean;
  /** Ebene: groesser = weiter vorn */
  z: number;
}

export interface Faltung {
  achse: [Punkt, Punkt];
  /** Ein Punkt auf der Seite, die sich bewegt */
  bewegt: Punkt;
  /** nur die vorderste Lage falten (true), oder die vordersten n Lagen */
  oben?: boolean | number;
  /** Bergfalte: der Teil geht nach hinten */
  hinten?: boolean;
}

export type Deko =
  | { typ: 'kreis'; x: number; y: number; r: number; farbe: string }
  | { typ: 'linie'; x1: number; y1: number; x2: number; y2: number; farbe: string; breite: number }
  | { typ: 'pfad'; d: string; farbe: string; fuellung?: string; breite?: number };

export type Schritt =
  | { art: 'falten'; text: string; falten: Faltung[] }
  | { art: 'knick'; text: string; achse: [Punkt, Punkt] }
  | { art: 'umdrehen'; text: string }
  | { art: 'neu'; text: string; flaechen: Flaeche[]; knicke?: [Punkt, Punkt][] }
  | { art: 'malen'; text: string; deko: Deko[] }
  | { art: 'fertig'; text: string };

export interface Modell {
  name: string;
  papier: string;
  start: Flaeche[];
  schritte: Schritt[];
}

export interface Zustand {
  flaechen: Flaeche[];
  knicke: [Punkt, Punkt][];
  deko: Deko[];
}

// ── Geometrie ────────────────────────────────────────────────────────────────

const kreuz = (a: Punkt, b: Punkt, p: Punkt) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

export function flaecheninhalt(pts: Punkt[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

/** Teil des Vielecks auf der Seite mit Vorzeichen `seite` (Sutherland-Hodgman an einer Geraden). */
function abschneiden(pts: Punkt[], a: Punkt, b: Punkt, seite: number): Punkt[] {
  const aus: Punkt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const cp = kreuz(a, b, p) * seite;
    const cq = kreuz(a, b, q) * seite;
    if (cp >= 0) aus.push(p);
    if ((cp > 0 && cq < 0) || (cp < 0 && cq > 0)) {
      const t = cp / (cp - cq);
      aus.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return aus;
}

/** Spiegelung an der Geraden a-b */
export function spiegeln(p: Punkt, a: Punkt, b: Punkt): Punkt {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const fx = a[0] + t * dx;
  const fy = a[1] + t * dy;
  return [2 * fx - p[0], 2 * fy - p[1]];
}

/**
 * Punkt waehrend der Faltung (t 0…1): Er klappt um die Faltlinie, von oben
 * gesehen wandert er senkrecht zur Linie und kommt gespiegelt an.
 */
export function unterwegs(p: Punkt, a: Punkt, b: Punkt, t: number): Punkt {
  const z = spiegeln(p, a, b);
  const fx = (p[0] + z[0]) / 2;
  const fy = (p[1] + z[1]) / 2;
  const c = Math.cos(Math.PI * t);
  return [fx + (p[0] - fx) * c, fy + (p[1] - fy) * c];
}

/** Faltlinie, die Punkt `von` genau auf `nach` legt (Mittelsenkrechte). */
export function ecke(von: Punkt, nach: Punkt, extra: Partial<Faltung> = {}): Faltung {
  const mx = (von[0] + nach[0]) / 2;
  const my = (von[1] + nach[1]) / 2;
  const dx = nach[0] - von[0];
  const dy = nach[1] - von[1];
  return { achse: [[mx - dy * 4, my + dx * 4], [mx + dy * 4, my - dx * 4]], bewegt: von, ...extra };
}

// ── Falten ───────────────────────────────────────────────────────────────────

export interface Aufteilung {
  bleibt: Flaeche[];
  /** bewegliche Teile vor der Faltung (Lage wie vorher) */
  klappe: Flaeche[];
}

/** Teilt das Papier an der Faltlinie in festen und beweglichen Teil. */
export function aufteilen(flaechen: Flaeche[], f: Faltung): Aufteilung {
  const [a, b] = f.achse;
  const seite = Math.sign(kreuz(a, b, f.bewegt)) || 1;
  const teile = flaechen.map((fl) => ({
    fl,
    fest: abschneiden(fl.pts, a, b, -seite),
    beweglich: abschneiden(fl.pts, a, b, seite),
  }));
  let kandidaten = teile.filter((t) => t.beweglich.length >= 3 && flaecheninhalt(t.beweglich) > 1);
  if (f.oben && kandidaten.length) {
    const anzahl = f.oben === true ? 1 : f.oben;
    const ebenen = [...new Set(kandidaten.map((t) => t.fl.z))].sort((x, y) => y - x).slice(0, anzahl);
    kandidaten = kandidaten.filter((t) => ebenen.includes(t.fl.z));
  }
  const bewegt = new Set(kandidaten.map((t) => t.fl));
  const bleibt: Flaeche[] = [];
  const klappe: Flaeche[] = [];
  for (const t of teile) {
    if (!bewegt.has(t.fl)) {
      bleibt.push(t.fl);
      continue;
    }
    if (t.fest.length >= 3 && flaecheninhalt(t.fest) > 1) bleibt.push({ ...t.fl, pts: t.fest });
    klappe.push({ ...t.fl, pts: t.beweglich });
  }
  return { bleibt, klappe };
}

/** Lage der gefalteten Teile: Talfalte obenauf (umgekehrte Reihenfolge), Bergfalte dahinter. */
export function falten(flaechen: Flaeche[], f: Faltung): Flaeche[] {
  const { bleibt, klappe } = aufteilen(flaechen, f);
  const [a, b] = f.achse;
  const alleZ = flaechen.map((x) => x.z);
  const kz = klappe.map((x) => x.z);
  const neu = klappe.map((k) => ({
    pts: k.pts.map((p) => spiegeln(p, a, b)).reverse(),
    farbig: !k.farbig,
    z: f.hinten
      ? Math.min(...alleZ) - 1 - (k.z - Math.min(...kz))
      : Math.max(...alleZ) + 1 + (Math.max(...kz) - k.z),
  }));
  return [...bleibt, ...neu];
}

/** Papier umdrehen (um die senkrechte Mitte x = 100) */
export function umdrehen(z: Zustand): Zustand {
  return {
    flaechen: z.flaechen.map((f) => ({ pts: f.pts.map(([x, y]) => [200 - x, y] as Punkt).reverse(), farbig: !f.farbig, z: -f.z })),
    knicke: z.knicke.map(([p, q]) => [[200 - p[0], p[1]], [200 - q[0], q[1]]]),
    deko: z.deko,
  };
}

/** Zustand nach den ersten `n` Schritten */
export function zustandNach(m: Modell, n: number): Zustand {
  let z: Zustand = { flaechen: m.start, knicke: [], deko: [] };
  for (const s of m.schritte.slice(0, n)) z = schrittAnwenden(z, s);
  return z;
}

export function schrittAnwenden(z: Zustand, s: Schritt): Zustand {
  switch (s.art) {
    case 'falten':
      return { ...z, flaechen: s.falten.reduce((fl, f) => falten(fl, f), z.flaechen) };
    case 'knick':
      return { ...z, knicke: [...z.knicke, s.achse] };
    case 'umdrehen':
      return umdrehen(z);
    case 'neu':
      return { flaechen: s.flaechen, knicke: s.knicke ?? [], deko: [] };
    case 'malen':
      return { ...z, deko: [...z.deko, ...s.deko] };
    default:
      return z;
  }
}

// ── Die Figuren ──────────────────────────────────────────────────────────────

const TINTE = '#1a2b6d';
const quadratRaute = (): Flaeche[] => [{ pts: [[100, 35], [165, 100], [100, 165], [35, 100]], farbig: false, z: 0 }];
const rechteck = (x1: number, y1: number, x2: number, y2: number): Flaeche[] =>
  [{ pts: [[x1, y1], [x2, y1], [x2, y2], [x1, y2]], farbig: false, z: 0 }];

/** Kleiner Loeser (Halbierung) fuer Faltpunkte, die eine Bedingung erfuellen */
function loese(f: (s: number) => number, a: number, b: number): number {
  let fa = f(a);
  for (let i = 0; i < 60; i++) {
    const m = (a + b) / 2;
    const fm = f(m);
    if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m;
  }
  return (a + b) / 2;
}

const papierflieger: Modell = (() => {
  // A4 hochkant, Mitte x = 100
  const eckeL: Punkt = [60, 55];
  const auf: Punkt = [100, 15 + Math.hypot(40, 40)];
  return {
    name: 'Papierflieger',
    papier: 'ein Blatt im Format A4',
    start: rechteck(60, 15, 140, 128),
    schritte: [
      { art: 'knick', text: 'Falte das Blatt längs in der Mitte und klappe es wieder auf.', achse: [[100, 15], [100, 128]] },
      { art: 'falten', text: 'Falte die beiden oberen Ecken zur Mittellinie.', falten: [ecke([60, 15], [100, 55]), ecke([140, 15], [100, 55])] },
      { art: 'falten', text: 'Falte die schrägen Kanten noch einmal zur Mitte.', falten: [ecke(eckeL, auf), ecke([140, 55], auf)] },
      { art: 'falten', text: 'Falte den Flieger an der Mittellinie nach hinten zusammen.', falten: [{ achse: [[100, 0], [100, 200]], bewegt: [60, 100], hinten: true }] },
      {
        art: 'neu',
        text: 'Klappe auf beiden Seiten einen Flügel nach unten. Fertig! Wirf ihn leicht nach vorn.',
        flaechen: [
          { pts: [[25, 120], [175, 80], [120, 128]], farbig: true, z: 1 },
          { pts: [[25, 120], [120, 128], [125, 145]], farbig: false, z: 0 },
        ],
      },
    ],
  };
})();

const hund: Modell = {
  name: 'Hund',
  papier: 'ein quadratisches Blatt',
  start: quadratRaute(),
  schritte: [
    { art: 'falten', text: 'Lege das Blatt als Raute hin. Falte die obere Ecke auf die untere.', falten: [ecke([100, 35], [100, 165])] },
    { art: 'falten', text: 'Falte die linke und die rechte Ecke schräg nach unten. Das sind die Ohren.', falten: [
      { achse: [[70, 100], [48, 113]], bewegt: [35, 100] },
      { achse: [[130, 100], [152, 113]], bewegt: [165, 100] },
    ] },
    { art: 'falten', text: 'Falte die untere Spitze der vorderen Lage ein Stück nach oben.', falten: [{ achse: [[70, 148], [130, 148]], bewegt: [100, 165], oben: true }] },
    { art: 'falten', text: 'Falte die obere Kante ein kleines Stück nach hinten.', falten: [{ achse: [[30, 108], [170, 108]], bewegt: [100, 100], hinten: true }] },
    { art: 'malen', text: 'Male Augen und eine Nase. Fertig ist der Hund!', deko: [
      { typ: 'kreis', x: 88, y: 120, r: 3.6, farbe: TINTE },
      { typ: 'kreis', x: 112, y: 120, r: 3.6, farbe: TINTE },
      { typ: 'pfad', d: 'M94 138 Q100 133 106 138 Q100 145 94 138 Z', farbe: TINTE, fuellung: TINTE },
    ] },
  ],
};

const becher: Modell = (() => {
  const L: Punkt = [35, 100];
  const R: Punkt = [165, 100];
  const T: Punkt = [100, 35];
  // R wird so auf die linke Kante gelegt, dass die Oberkante der Klappe waagrecht liegt
  const aufLinks = (s: number): Punkt => [L[0] + (T[0] - L[0]) * s, L[1] + (T[1] - L[1]) * s];
  const s = loese((x) => {
    const f = ecke(R, aufLinks(x));
    return spiegeln(T, f.achse[0], f.achse[1])[1] - aufLinks(x)[1];
  }, 0.05, 0.95);
  const P = aufLinks(s);
  const hoehe = P[1];
  return {
    name: 'Becher',
    papier: 'ein quadratisches Blatt',
    start: quadratRaute(),
    schritte: [
      { art: 'falten', text: 'Lege das Blatt als Raute hin. Falte die untere Ecke auf die obere.', falten: [ecke([100, 165], [100, 35])] },
      { art: 'falten', text: 'Falte die rechte Ecke zur linken Kante. Die Oberkante liegt waagrecht.', falten: [ecke(R, P)] },
      { art: 'falten', text: 'Falte die linke Ecke genauso zur rechten Seite.', falten: [ecke(L, [200 - P[0], P[1]])] },
      { art: 'falten', text: 'Falte die vordere Spitze oben nach unten in die Tasche.', falten: [{ achse: [[50, hoehe], [150, hoehe]], bewegt: [100, 40], oben: true }] },
      { art: 'umdrehen', text: 'Dreh den Becher um.' },
      { art: 'falten', text: 'Falte auch die andere Spitze nach unten.', falten: [{ achse: [[50, hoehe], [150, hoehe]], bewegt: [100, 40], oben: true }] },
      { art: 'fertig', text: 'Drück den Becher oben vorsichtig auf. Fertig!' },
    ],
  };
})();

const hutSchritte: Schritt[] = [
  { art: 'falten', text: 'Falte das Blatt in der Mitte nach unten.', falten: [{ achse: [[0, 80.5], [200, 80.5]], bewegt: [100, 10] }] },
  { art: 'knick', text: 'Falte es senkrecht in der Mitte und klappe es wieder auf.', achse: [[100, 80.5], [100, 151]] },
  { art: 'falten', text: 'Falte die beiden oberen Ecken zur Mittellinie.', falten: [ecke([50, 80.5], [100, 130.5]), ecke([150, 80.5], [100, 130.5])] },
  { art: 'falten', text: 'Falte den unteren Streifen der vorderen Lage nach oben.', falten: [{ achse: [[40, 130.5], [160, 130.5]], bewegt: [100, 150], oben: true }] },
  { art: 'umdrehen', text: 'Dreh das Blatt um.' },
  { art: 'falten', text: 'Falte auch diesen Streifen nach oben.', falten: [{ achse: [[40, 130.5], [160, 130.5]], bewegt: [100, 150], oben: true }] },
];

const hut: Modell = {
  name: 'Papierhut',
  papier: 'ein Blatt im Format A4',
  start: rechteck(50, 10, 150, 151),
  schritte: [...hutSchritte, { art: 'fertig', text: 'Zieh den Hut unten auf. Fertig!' }],
};

const raute = (cx: number, cy: number, r: number): Punkt[] => [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]];

const papierschiff: Modell = {
  name: 'Papierschiff',
  papier: 'ein Blatt im Format A4',
  start: rechteck(50, 10, 150, 151),
  schritte: [
    ...hutSchritte.map((s, i) => (i === 0 ? { ...s, text: `Falte zuerst einen Hut. ${s.text}` } : s)),
    {
      art: 'neu',
      text: 'Zieh den Hut unten auf und drück ihn zu einer Raute zusammen.',
      flaechen: [
        { pts: raute(100, 100, 62), farbig: true, z: 0 },
        { pts: [[38, 100], [162, 100], [100, 162]], farbig: true, z: 1 },
      ],
      knicke: [[[100, 38], [100, 162]]],
    },
    { art: 'falten', text: 'Falte die untere Ecke der vorderen Lage nach oben.', falten: [{ achse: [[30, 100], [170, 100]], bewegt: [100, 150], oben: true }] },
    { art: 'umdrehen', text: 'Dreh es um.' },
    { art: 'falten', text: 'Falte auch hier die untere Ecke nach oben.', falten: [{ achse: [[30, 100], [170, 100]], bewegt: [100, 150], oben: true }] },
    {
      art: 'neu',
      text: 'Zieh es unten wieder auf und drück es zu einer kleinen Raute zusammen.',
      flaechen: [{ pts: raute(100, 100, 46), farbig: true, z: 0 }, { pts: [[54, 100], [146, 100], [100, 146]], farbig: true, z: 1 }],
    },
    {
      art: 'neu',
      text: 'Zieh die beiden oberen Spitzen vorsichtig auseinander. Fertig ist das Schiff!',
      flaechen: [
        { pts: [[30, 108], [170, 108], [146, 140], [54, 140]], farbig: true, z: 1 },
        { pts: [[70, 108], [100, 50], [130, 108]], farbig: false, z: 0 },
      ],
    },
  ],
};

const katze: Modell = {
  name: 'Katze',
  papier: 'ein quadratisches Blatt',
  start: quadratRaute(),
  schritte: [
    { art: 'falten', text: 'Lege das Blatt als Raute hin. Falte die obere Ecke auf die untere.', falten: [ecke([100, 35], [100, 165])] },
    { art: 'falten', text: 'Falte die linke Ecke zur unteren Spitze.', falten: [ecke([35, 100], [100, 165])] },
    { art: 'falten', text: 'Falte die Spitze dieser Klappe schräg nach oben. Das ist ein Ohr.', falten: [ecke([100, 165], [60, 80], { oben: 2 })] },
    { art: 'falten', text: 'Mach es rechts genauso: Ecke zur Spitze …', falten: [ecke([165, 100], [100, 165])] },
    { art: 'falten', text: '… und die Spitze schräg nach oben für das zweite Ohr.', falten: [ecke([100, 165], [140, 80], { oben: 2 })] },
    { art: 'falten', text: 'Falte die untere Spitze nach hinten.', falten: [{ achse: [[60, 140], [140, 140]], bewegt: [100, 165], hinten: true }] },
    { art: 'malen', text: 'Male Augen, Nase und Schnurrhaare. Fertig ist die Katze!', deko: [
      { typ: 'kreis', x: 89, y: 113, r: 3.4, farbe: TINTE },
      { typ: 'kreis', x: 111, y: 113, r: 3.4, farbe: TINTE },
      { typ: 'pfad', d: 'M96 122 L104 122 L100 127 Z', farbe: TINTE, fuellung: TINTE },
      { typ: 'linie', x1: 74, y1: 121, x2: 91, y2: 124, farbe: TINTE, breite: 1.4 },
      { typ: 'linie', x1: 74, y1: 129, x2: 91, y2: 127, farbe: TINTE, breite: 1.4 },
      { typ: 'linie', x1: 126, y1: 121, x2: 109, y2: 124, farbe: TINTE, breite: 1.4 },
      { typ: 'linie', x1: 126, y1: 129, x2: 109, y2: 127, farbe: TINTE, breite: 1.4 },
    ] },
  ],
};

const himmelHoelle: Modell = {
  name: 'Himmel & Hölle',
  papier: 'ein quadratisches Blatt',
  start: rechteck(40, 40, 160, 160),
  schritte: [
    { art: 'falten', text: 'Falte alle vier Ecken genau zur Mitte.', falten: [
      ecke([40, 40], [100, 100]), ecke([160, 40], [100, 100]), ecke([160, 160], [100, 100]), ecke([40, 160], [100, 100]),
    ] },
    { art: 'umdrehen', text: 'Dreh das Blatt um.' },
    { art: 'falten', text: 'Falte wieder alle vier Ecken zur Mitte.', falten: [
      ecke([100, 40], [100, 100]), ecke([160, 100], [100, 100]), ecke([100, 160], [100, 100]), ecke([40, 100], [100, 100]),
    ] },
    {
      art: 'neu',
      text: 'Falte es in der Mitte zusammen und steck Daumen und Zeigefinger in die vier Taschen. Fertig!',
      flaechen: [
        { pts: [[100, 60], [140, 100], [100, 100]], farbig: true, z: 1 },
        { pts: [[140, 100], [100, 140], [100, 100]], farbig: false, z: 1 },
        { pts: [[100, 140], [60, 100], [100, 100]], farbig: true, z: 1 },
        { pts: [[60, 100], [100, 60], [100, 100]], farbig: false, z: 1 },
      ],
    },
  ],
};

const tulpe: Modell = {
  name: 'Tulpe',
  papier: 'ein quadratisches Blatt',
  start: quadratRaute(),
  schritte: [
    { art: 'falten', text: 'Lege das Blatt als Raute hin. Falte die obere Ecke auf die untere.', falten: [ecke([100, 35], [100, 165])] },
    { art: 'falten', text: 'Falte die linke Ecke schräg nach oben.', falten: [ecke([35, 100], [78, 48])] },
    { art: 'falten', text: 'Falte die rechte Ecke genauso nach oben.', falten: [ecke([165, 100], [122, 48])] },
    { art: 'malen', text: 'Male einen Stiel und ein Blatt. Fertig ist die Tulpe!', deko: [
      { typ: 'linie', x1: 100, y1: 160, x2: 100, y2: 196, farbe: '#15a05a', breite: 4 },
      { typ: 'pfad', d: 'M100 184 C112 170 128 172 132 176 C122 186 110 188 100 184 Z', farbe: '#0b7a46', fuellung: '#15a05a' },
    ] },
  ],
};

/** Reihenfolge muss zu v_faltungen in runde_belohnen passen (lib/reise.ts FALTUNGEN). */
export const MODELLE = {
  papierflieger,
  hund,
  becher,
  hut,
  papierschiff,
  katze,
  himmel_hoelle: himmelHoelle,
  tulpe,
} as const;

/**
 * Antwortoptionen einer Auswahlfrage aus der Modellantwort lesen.
 *
 * Befund 29.09.2026: 30 Auswahlfragen im Cache hatten eckige Klammern und
 * Anfuehrungszeichen in den Optionen — Kinder sahen etwa `['my'` und
 * `'her']` als Antworten. Das Modell hatte die Optionen als Programmtext
 * geliefert statt als JSON-Liste:
 *
 *   options = ["2", "3", "4", "5"]
 *   ['my', 'mine', 'his', 'her']
 *   Die Optionen für diese Frage sind: ["…", "…"]
 *   ["[„Taiga“", "„Steppe“", …]           (Liste im ersten Eintrag begonnen)
 *
 * Der Generator hat solchen Text bisher an den Kommas zerschnitten. Hier wird
 * zuerst die Liste zwischen den Klammern gesucht und nach Anfuehrungszeichen
 * zerlegt; erst wenn das nichts ergibt, wird an Kommas geteilt.
 */

/** Umschliessende Anfuehrungszeichen, auch deutsche und typografische. */
const ANFANG = /^["'„“‚‘«»]+/;
const ENDE = /["'“”‘’«»]+$/;
/** Reste eines zerschnittenen JSON-Objekts, z. B. `question_text:`. */
const SCHLUESSEL_REST = /^[a-z_]+\s*:\s*$/i;

function saeubern(eintrag: string): string {
  let s = eintrag.trim();
  // Listenklammern am Rand, die beim Zerschneiden haengen geblieben sind.
  s = s.replace(/^\[+\s*/, '').replace(/\s*\]+$/, '').trim();
  s = s.replace(ANFANG, '').replace(ENDE, '').trim();
  return s;
}

function eindeutig(liste: string[]): string[] {
  return Array.from(new Set(liste.map(saeubern).filter((s) => s.length > 0 && !SCHLUESSEL_REST.test(s))));
}

/** Ein Eintrag, der nach Listen- oder Objektresten aussieht. */
function istVerdaechtig(eintrag: string): boolean {
  const s = eintrag.trim();
  if (/^\[/.test(s) || /\]$/.test(s)) return true;             // Listenklammer am Rand
  if (/[=:]\s*\[/.test(s)) return true;                        // options = [ … / sind: [ …
  if (SCHLUESSEL_REST.test(s)) return true;                      // question_text:
  // Doppeltes Anfuehrungszeichen am Rand ohne Gegenstueck im Eintrag —
  // typisch fuer eine an Kommas zerschnittene Liste. Apostrophe zaehlen
  // nicht ("Kids'").
  const oeffnetOhneSchluss = /^["„]/.test(s) && !/.["“”]/.test(s.slice(1));
  const schliesstOhneAnfang = /["“”]$/.test(s) && !/["„]./.test(s.slice(0, -1));
  return oeffnetOhneSchluss || schliesstOhneAnfang;
}

function ausListenText(text: string): string[] {
  const start = text.indexOf('[');
  const ende = text.lastIndexOf(']');
  const innen = start >= 0 && ende > start ? text.slice(start + 1, ende) : text;

  try {
    const geparst = JSON.parse(`[${innen}]`);
    if (Array.isArray(geparst) && geparst.every((x) => typeof x === 'string' || typeof x === 'number')) {
      const liste = eindeutig(geparst.map(String));
      if (liste.length >= 2) return liste;
    }
  } catch { /* kein gueltiges JSON — weiter mit Anfuehrungszeichen */ }

  const zitate: string[] = [];
  const muster = /"((?:[^"\\]|\\.)*)"|„([^“”"]*)[“”"]|'([^']*)'/g;
  for (const m of innen.matchAll(muster)) {
    zitate.push((m[1] ?? m[2] ?? m[3] ?? '').replace(/\\"/g, '"'));
  }
  const ausZitaten = eindeutig(zitate);
  if (ausZitaten.length >= 2) return ausZitaten;

  return eindeutig(innen.replace(/\r/g, '\n').split(/[\n,;|]+/));
}

/**
 * Optionen als saubere Liste. Nimmt eine Liste, einen JSON-Text oder
 * Programmtext entgegen; eine bereits zerschnittene Liste mit Klammerresten
 * wird wieder zusammengesetzt und neu gelesen.
 */
export function parseChoiceOptions(value: unknown): string[] {
  if (Array.isArray(value)) {
    const texte = value.map((x) => (x === null || x === undefined ? '' : String(x)));
    // Saubere Liste: nur trimmen, Inhalt nicht anfassen.
    if (!texte.some(istVerdaechtig)) {
      return Array.from(new Set(texte.map((t) => t.trim()).filter(Boolean)));
    }
    // Zerschnittene Liste: mit ", " wieder zusammensetzen — so wurde sie
    // zerlegt — und als Ganzes lesen.
    const neu = ausListenText(texte.join(', '));
    return neu.length >= 2 ? neu : eindeutig(texte);
  }
  if (typeof value !== 'string') return [];
  const text = value.trim();
  if (!text) return [];
  if (text.includes('[') && text.includes(']')) return ausListenText(text);
  return eindeutig(text.replace(/\r/g, '\n').split(/[\n,;|]+/).map((e) => e.replace(/^[\s•\-–—]*(?:[A-Z]\)|\d+[.)])?\s*/i, '')));
}

/** True, wenn in einer Option noch Klammer- oder Codereste stehen. */
export function hatCodeReste(optionen: string[]): boolean {
  return optionen.some((o) => /[\[\]]/.test(o) || /^\s*options?\s*=/i.test(o) || SCHLUESSEL_REST.test(o));
}

/**
 * Hinweis fuer das Kind oder null. Befund 29.09.2026: 27 aktive Fragen hatten
 * den Text "null" als Hinweis, eine die Optionsliste — beides zeigt die App
 * woertlich an.
 */
export function cleanHint(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!s || /^(null|undefined|none|n\/a|-)$/i.test(s)) return null;
  if (/^\[[\s\S]*\]$/.test(s) || /^\{[\s\S]*\}$/.test(s)) return null;
  return s.substring(0, 200);
}

/**
 * Text fürs Vorlesen mit der KI-Stimme aufbereiten (20.10.2026).
 *
 * Rechenzeichen und Lücken spricht eine Stimme sonst falsch oder gar nicht
 * („7 · 8“, „3 + __ = 5“). Lange Texte werden in Stücke an Satzgrenzen
 * geteilt: Das erste Stück ist schnell da und spielt, während das nächste
 * entsteht; jedes Stück wird auf dem Server einzeln zwischengespeichert.
 */

export const MAX_STUECK = 280;

/** Rechenzeichen, Lücken und Formatierung in sprechbaren Text übersetzen. */
export function sprechbar(text: string): string {
  return text
    .replace(/\(\s*(?:\.{3,}|…|_+)?\s*\)|\[\s*\]|_{2,}|\.{3,}|…/g, ' Lücke ') // ___, (...), [ ]
    .replace(/(\d)\s*[·×xX*]\s*(?=\d)/g, '$1 mal ')
    .replace(/[*_~`#]/g, '')                         // Markdown-Reste
    .replace(/(\d)\s*[:÷]\s*(?=\d)/g, '$1 geteilt durch ')
    .replace(/(\d)\s*\+\s*(?=\d|Lücke)/g, '$1 plus ')
    .replace(/(\d|Lücke)\s*[−–-]\s*(?=\d|Lücke)/g, '$1 minus ')
    .replace(/\s*=\s*/g, ' gleich ')
    .replace(/\s*<\s*/g, ' kleiner als ')
    .replace(/\s*>\s*/g, ' größer als ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Aufgabe mit Antwortmöglichkeiten: „…? 54, 56, 64 oder 48?“ */
export function aufgabeZumVorlesen(frage: string, optionen?: string[] | null): string {
  const f = sprechbar(frage);
  const o = (optionen ?? []).map((x) => sprechbar(String(x))).filter(Boolean);
  if (o.length < 2) return f;
  const liste = `${o.slice(0, -1).join(', ')} oder ${o[o.length - 1]}`;
  return `${f} ${liste}?`;
}

/** In Stücke an Satzgrenzen teilen, jedes höchstens MAX_STUECK Zeichen. */
export function inStuecke(text: string, max: number = MAX_STUECK): string[] {
  const saetze = text.match(/[^.!?]+[.!?]*\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  const stuecke: string[] = [];
  let aktuell = '';
  const dazu = (teil: string) => {
    if (!aktuell) aktuell = teil;
    else if ((aktuell + ' ' + teil).length <= max) aktuell += ' ' + teil;
    else { stuecke.push(aktuell); aktuell = teil; }
  };
  for (const satz of saetze) {
    if (satz.length <= max) { dazu(satz); continue; }
    // Überlanger Satz: an Kommas, notfalls an Wortgrenzen teilen
    for (const teil of satz.split(/(?<=,)\s+/)) {
      if (teil.length <= max) { dazu(teil); continue; }
      let rest = teil;
      while (rest.length > max) {
        const schnitt = rest.lastIndexOf(' ', max);
        const bis = schnitt > max / 2 ? schnitt : max;
        dazu(rest.slice(0, bis).trim());
        rest = rest.slice(bis).trim();
      }
      if (rest) dazu(rest);
    }
  }
  if (aktuell) stuecke.push(aktuell);
  return stuecke;
}

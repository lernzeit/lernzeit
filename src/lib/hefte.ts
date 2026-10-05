/*
 * Hefte und Sticker des Kindes (App-Redesign, 04.10.2026).
 * Faecher erscheinen als Hefte; das Kind waehlt die Umschlagfarbe und klebt
 * Sticker darauf, die es fuer eine Runde mit allen Aufgaben richtig bekommt
 * (Datenbank: kind_hefte, kind_sticker, sticker_vergeben()).
 */

export type FachId =
  | 'math' | 'german' | 'english' | 'science' | 'geography'
  | 'history' | 'physics' | 'biology' | 'chemistry' | 'latin';

export const FAECHER: { id: FachId; name: string; kurz: string }[] = [
  { id: 'math', name: 'Mathematik', kurz: 'Mathe' },
  { id: 'german', name: 'Deutsch', kurz: 'Deutsch' },
  { id: 'science', name: 'Sachkunde', kurz: 'Sachkunde' },
  { id: 'english', name: 'Englisch', kurz: 'Englisch' },
  { id: 'geography', name: 'Geographie', kurz: 'Erdkunde' },
  { id: 'history', name: 'Geschichte', kurz: 'Geschichte' },
  { id: 'physics', name: 'Physik', kurz: 'Physik' },
  { id: 'biology', name: 'Biologie', kurz: 'Bio' },
  { id: 'chemistry', name: 'Chemie', kurz: 'Chemie' },
  { id: 'latin', name: 'Latein', kurz: 'Latein' },
];

/** Umschlagfarben zum Aussuchen. Kennung wird gespeichert, nie der Farbwert. */
export const HEFTFARBEN: { id: string; name: string; farbe: string }[] = [
  { id: 'blau', name: 'Blau', farbe: '#2563eb' },
  { id: 'rot', name: 'Rot', farbe: '#d4483b' },
  { id: 'gruen', name: 'Grün', farbe: '#15a05a' },
  { id: 'gelb', name: 'Gelb', farbe: '#eaa315' },
  { id: 'orange', name: 'Orange', farbe: '#ee7a1c' },
  { id: 'lila', name: 'Lila', farbe: '#7c4ddb' },
  { id: 'pink', name: 'Pink', farbe: '#db4b8c' },
  { id: 'tuerkis', name: 'Türkis', farbe: '#0f9fb0' },
  { id: 'braun', name: 'Braun', farbe: '#8a5a3c' },
  { id: 'grau', name: 'Grau', farbe: '#66708a' },
  { id: 'tinte', name: 'Dunkelblau', farbe: '#1a2b6d' },
];

/** Ausgangsfarbe je Fach, bis das Kind selbst waehlt. */
export const STANDARD_FARBE: Record<FachId, string> = {
  math: 'blau', german: 'rot', science: 'gruen', english: 'gelb', geography: 'tuerkis',
  history: 'braun', physics: 'lila', biology: 'gruen', chemistry: 'orange', latin: 'grau',
};

export const farbeVon = (id: string | undefined, fach: FachId): string =>
  (HEFTFARBEN.find((f) => f.id === id) ?? HEFTFARBEN.find((f) => f.id === STANDARD_FARBE[fach]) ?? HEFTFARBEN[0]).farbe;

/** Muss mit dem Katalog in sticker_vergeben() und sticker_waehlen() uebereinstimmen. */
export const STICKER: Record<string, { zeichen: string; name: string }> = {
  fuchs: { zeichen: '🦊', name: 'Fuchs' },
  panda: { zeichen: '🐼', name: 'Panda' },
  einhorn: { zeichen: '🦄', name: 'Einhorn' },
  schildkroete: { zeichen: '🐢', name: 'Schildkröte' },
  krake: { zeichen: '🐙', name: 'Krake' },
  eule: { zeichen: '🦉', name: 'Eule' },
  biene: { zeichen: '🐝', name: 'Biene' },
  schmetterling: { zeichen: '🦋', name: 'Schmetterling' },
  regenbogen: { zeichen: '🌈', name: 'Regenbogen' },
  stern: { zeichen: '⭐', name: 'Stern' },
  rakete: { zeichen: '🚀', name: 'Rakete' },
  ballon: { zeichen: '🎈', name: 'Ballon' },
  erdbeere: { zeichen: '🍓', name: 'Erdbeere' },
  pizza: { zeichen: '🍕', name: 'Pizza' },
  gitarre: { zeichen: '🎸', name: 'Gitarre' },
  fussball: { zeichen: '⚽', name: 'Fußball' },
  pokal: { zeichen: '🏆', name: 'Pokal' },
  diamant: { zeichen: '💎', name: 'Diamant' },
  sonnenblume: { zeichen: '🌻', name: 'Sonnenblume' },
  kleeblatt: { zeichen: '🍀', name: 'Kleeblatt' },
  delfin: { zeichen: '🐬', name: 'Delfin' },
  dino: { zeichen: '🦖', name: 'Dino' },
  farben: { zeichen: '🎨', name: 'Farbpalette' },
  puzzle: { zeichen: '🧩', name: 'Puzzle' },
};

/** Hoechstens so viele Sticker passen auf ein Heft (wie in der Datenbank). */
export const STICKER_PRO_HEFT = 3;

/*
 * Figuren gegen Tinte (Federmaeppchen, 11.10.2026). Preise muessen zu
 * avatar_preis() in supabase/migrations/20261011200000_klecksi_reise.sql
 * passen; die Datenbank prueft beim Freischalten und beim Waehlen.
 * Bereits gewaehlte Figuren wurden beim Start als freigeschaltet eingetragen.
 */
export const AVATAR_PREIS: Record<string, number> = {
  cat: 0, dog: 0, bear: 0, fox: 0, rabbit: 0, panda: 0, happy: 0, smart: 0,
  lion: 40, monkey: 40,
  star: 50, sun: 50, flower: 50, tree: 50, wink: 50,
  cool: 60, moon: 60,
  star_eyes: 70, angel: 70,
  robot: 80, rainbow: 80,
  pirate: 90, unicorn: 100,
  wizard: 120, superhero: 120,
  crown: 150,
  // Weihnachten: nur vom 1. bis 26. Dezember freizuschalten
  rentier: 40, schneemann: 40, elf: 50, weihnachtsmann: 60, tannenbaum: 60,
};

/** Figuren, die es nur in der Weihnachtszeit gibt (wie avatar_saison()). Wer eine hat, behaelt sie. */
export const WEIHNACHTS_FIGUREN = ['weihnachtsmann', 'rentier', 'schneemann', 'elf', 'tannenbaum'];

export const avatarPreis = (id: string): number => AVATAR_PREIS[id] ?? 0;

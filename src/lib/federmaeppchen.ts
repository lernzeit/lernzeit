/*
 * Figuren gegen Tinte (Federmaeppchen, 11.10.2026). Preise muessen zu
 * avatar_preis() in supabase/migrations/20261022150000_figuren_preise.sql
 * passen (22.10.2026: 50 neue Figuren, alle Preise etwa verdreifacht); die Datenbank prueft beim Freischalten und beim Waehlen.
 * Bereits gewaehlte Figuren wurden beim Start als freigeschaltet eingetragen.
 */
export const AVATAR_PREIS: Record<string, number> = {
  cat: 0, dog: 0, bear: 0, fox: 0, rabbit: 0, panda: 0, happy: 0, smart: 0,
  lion: 150, monkey: 150, star: 200, sun: 200, flower: 200, tree: 200, wink: 200, cool: 250, moon: 250, star_eyes: 300, angel: 300, robot: 350, rainbow: 350, pirate: 400, unicorn: 500, wizard: 600, superhero: 600, crown: 1000,
  // 50 weitere (22.10.2026)
  tiger: 200, koala: 200, frog: 200, penguin: 250, owl: 250, turtle: 250, hedgehog: 300, dolphin: 300, octopus: 350, giraffe: 350, elephant: 400, zebra: 400, butterfly: 450, parrot: 500, otter: 600, sloth: 700,
  party: 200, thinking: 250, hug: 300, laugh: 350,
  ghost: 300, alien: 400, rocket: 450, ufo: 500, crystal_ball: 550, magic_wand: 600, fairy: 700, mermaid: 800, ninja: 900, astronaut: 1000, dino: 1200, dragon: 1500,
  soccer: 200, basketball: 200, tennis: 250, kite: 300, puzzle: 300, palette: 350, skateboard: 400, drum: 450, guitar: 500, trophy: 800,
  cactus: 200, sunflower: 250, mushroom: 300, snowflake: 350, lightning: 400, earth: 500, comet: 600, volcano: 700,
  // Weihnachten: nur vom 1. bis 26. Dezember freizuschalten
  rentier: 150, schneemann: 150, elf: 200, weihnachtsmann: 300, tannenbaum: 300,
};

/** Figuren, die es nur in der Weihnachtszeit gibt (wie avatar_saison()). Wer eine hat, behaelt sie. */
export const WEIHNACHTS_FIGUREN = ['weihnachtsmann', 'rentier', 'schneemann', 'elf', 'tannenbaum'];

export const avatarPreis = (id: string): number => AVATAR_PREIS[id] ?? 0;

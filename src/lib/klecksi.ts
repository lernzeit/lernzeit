/*
 * Feste, gepruefte Saetze von Klecksi (keine KI-Texte an Kinder). Ein Satz,
 * nie mehr; Antippen zeigt den naechsten.
 */
import { BUNT_AB_FAECHERN, FELDER_JE_SEITE, type Faltung } from './reise';
import type { KlecksiStimmung } from '@/components/klecksi/Klecksi';

export const FALTUNG_MIT_ARTIKEL: Record<Faltung, string> = {
  papierflieger: 'einen Papierflieger',
  hund: 'einen Hund',
  becher: 'einen Becher',
  hut: 'einen Papierhut',
  papierschiff: 'ein Papierschiff',
  katze: 'eine Katze',
  himmel_hoelle: 'ein Himmel & Hölle',
  tulpe: 'eine Tulpe',
};

export interface KlecksiLage {
  name?: string;
  /** Felder auf der aktuellen Seite */
  felderGemalt: number;
  faltung: Faltung;
  faecherAufSeite: number;
  berichtigung: number;
  lernplanFach?: string;
  schwerpunktFach?: string;
  /** Nur in der Weihnachtszeit (lib/weihnachten.ts) */
  weihnachten?: {
    /** Berliner Datum */
    monat: number;
    tag: number;
    /** Tuerchen, die heute aufgehen koennen und noch zu sind */
    tuerenZu: number;
  };
}

/** Ein Satz zur Weihnachtszeit, sonst null */
export function weihnachtsSatz(w: NonNullable<KlecksiLage['weihnachten']>): string | null {
  if (w.monat === 12 && w.tag < 23) return `Noch ${24 - w.tag} Tage bis Heiligabend!`;
  if (w.monat === 12 && w.tag === 23) return 'Morgen ist Heiligabend!';
  if (w.monat === 12 && w.tag <= 26) return 'Frohe Weihnachten!';
  return null;
}

export function startSaetze(l: KlecksiLage): string[] {
  const saetze: string[] = [];
  const offen = FELDER_JE_SEITE - l.felderGemalt;
  saetze.push(l.name ? `Hallo ${l.name}! Malen wir weiter?` : 'Hallo! Malen wir weiter?');
  if (l.weihnachten) {
    const zu = l.weihnachten.tuerenZu;
    if (zu === 1) saetze.push('Ein Türchen im Adventskalender wartet auf dich.');
    else if (zu > 1) saetze.push(`${zu} Türchen im Adventskalender warten auf dich.`);
    const satz = weihnachtsSatz(l.weihnachten);
    if (satz) saetze.push(satz);
  }
  saetze.push(
    offen === 1
      ? `Noch 1 Feld, dann falte ich dir ${FALTUNG_MIT_ARTIKEL[l.faltung]}.`
      : `Noch ${offen} Felder, dann falte ich dir ${FALTUNG_MIT_ARTIKEL[l.faltung]}.`,
  );
  const fehlen = BUNT_AB_FAECHERN - l.faecherAufSeite;
  if (l.felderGemalt > 0 && fehlen > 0) {
    saetze.push(fehlen === 1 ? 'Noch ein Fach, dann wird die Seite bunt!' : `Noch ${fehlen} Fächer, dann wird die Seite bunt!`);
  }
  if (l.lernplanFach) saetze.push(`Dein Lernplan in ${l.lernplanFach} zählt doppelt.`);
  else if (l.schwerpunktFach) saetze.push(`${l.schwerpunktFach} zählt bei dir doppelt.`);
  if (l.berichtigung === 1) saetze.push('Ein kleiner Klecks wartet in der Berichtigung.');
  else if (l.berichtigung > 1) saetze.push(`${l.berichtigung} kleine Kleckse warten in der Berichtigung.`);
  return saetze;
}

export function rundenSatz(o: {
  richtig: number;
  gesamt: number;
  geschafft: boolean;
  faltung?: Faltung | null;
  berichtigung?: boolean;
}): { satz: string; stimmung: KlecksiStimmung } {
  if (o.faltung) return { satz: `Seite fertig! Ich falte dir ${FALTUNG_MIT_ARTIKEL[o.faltung]}.`, stimmung: 'jubel' };
  if (o.gesamt > 0 && o.richtig === o.gesamt) {
    return { satz: o.berichtigung ? 'Alles berichtigt! Saubere Seite!' : `${o.richtig} von ${o.gesamt}! Saubere Seite!`, stimmung: 'jubel' };
  }
  if (o.geschafft) return { satz: 'Prima! Ich male dein Feld aus.', stimmung: 'froh' };
  return { satz: 'Fehler sind nur Kleckse. Die wischen wir in der Berichtigung weg!', stimmung: 'mut' };
}

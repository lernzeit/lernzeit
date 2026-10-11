/*
 * Klecksi an oder aus (11.10.2026). Aeltere Kinder finden das Maskottchen
 * irgendwann zu kindlich: Ab Klasse 7 ist er zuerst aus, jedes Kind kann ihn
 * in den Einstellungen selbst an- oder ausschalten (profiles.klecksi).
 * Ohne Klecksi bleibt alles gleich (Reise, Tinte, Erklaerungen, KI-Tutor),
 * nur ohne Figur und mit sachlichen Saetzen.
 */
export type KlecksiWahl = 'an' | 'aus' | null;

export const KLECKSI_AUS_AB_KLASSE = 7;

/** null = automatisch nach Klassenstufe */
export function klecksiAn(wahl: KlecksiWahl | undefined, klasse: number | null | undefined): boolean {
  if (wahl === 'an') return true;
  if (wahl === 'aus') return false;
  return (klasse ?? 1) < KLECKSI_AUS_AB_KLASSE;
}

export const alsWahl = (wert: unknown): KlecksiWahl => (wert === 'an' || wert === 'aus' ? wert : null);

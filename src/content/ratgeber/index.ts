import type { RatgeberArtikel } from './types';

// Artikel werden hier als Daten eingetragen (vorerst leer).
export const artikel: RatgeberArtikel[] = [];

// Nur veröffentlichte Artikel, deren Quellen alle geprüft sind, werden
// angezeigt, verlinkt, vorgerendert und in die Sitemap geschrieben.
export const sichtbareArtikel = (): RatgeberArtikel[] =>
  artikel
    .filter((a) => a.veroeffentlicht === true && a.quellen.every((q) => !!q.geprueftAm))
    .sort((a, b) => b.datum.localeCompare(a.datum));

export const findeSichtbarenArtikel = (slug: string): RatgeberArtikel | undefined =>
  sichtbareArtikel().find((a) => a.slug === slug);

export const formatiereDatum = (iso: string): string => {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Strukturierte Daten je Route. Eine Quelle für die Seiten (Browser) und den Build:
// react-helmet-async schreibt Skript-Blöcke beim Vorrendern nicht zuverlässig ins
// HTML (am 26.10.2026 fehlten sie auf /faq und allen Ratgeber-Artikeln). Deshalb
// setzt vite.config.ts sie nach dem Vorrendern aus diesen Daten ein (postProcess).
import {
  ORGANISATION_JSON_LD, SOFTWARE_JSON_LD, VIDEOS_JSON_LD, SITE_URL, brotkrumenJsonLd, faqJsonLd,
} from './organisation';
import { findeSeite } from './seiten';
import type { Inhaltsseite } from './seiten/types';
import { findeSichtbarenArtikel } from './ratgeber';
import type { RatgeberArtikel } from './ratgeber/types';

export const seiteJsonLd = (s: Inhaltsseite): object[] => {
  const daten: object[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: s.h1,
      description: s.beschreibung,
      url: `${SITE_URL}${s.pfad}`,
      inLanguage: 'de',
      dateModified: s.aktualisiert,
      isPartOf: { '@type': 'WebSite', name: 'LernZeit', url: SITE_URL },
      publisher: { '@id': `${SITE_URL}/#organisation` },
    },
    brotkrumenJsonLd([
      { text: 'Startseite', zu: '/start' },
      { text: s.brotkrumen[s.brotkrumen.length - 1].text, zu: s.pfad },
    ]),
  ];
  if (s.faq?.length) daten.push(faqJsonLd(s.faq));
  return daten;
};

export const artikelJsonLd = (a: RatgeberArtikel): object => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: a.titel,
  description: a.beschreibung,
  datePublished: a.datum,
  dateModified: a.aktualisiert ?? a.datum,
  author: { '@type': 'Organization', name: 'LernZeit' },
  publisher: { '@type': 'Organization', name: 'LernZeit' },
  mainEntityOfPage: `${SITE_URL}/ratgeber/${a.slug}`,
});

export const startJsonLd = (): object[] => [ORGANISATION_JSON_LD, SOFTWARE_JSON_LD, faqJsonLd(), ...VIDEOS_JSON_LD];

/** Strukturierte Daten für eine vorgerenderte Route; leer, wenn die Route keine hat. */
export function jsonLdFuerRoute(route: string): object[] {
  if (route === '/start') return startJsonLd();
  if (route === '/faq') return [faqJsonLd()];
  const artikel = route.startsWith('/ratgeber/') ? findeSichtbarenArtikel(route.slice('/ratgeber/'.length)) : undefined;
  if (artikel) return [artikelJsonLd(artikel)];
  const seite = findeSeite(route);
  return seite ? seiteJsonLd(seite) : [];
}

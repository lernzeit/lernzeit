// Strukturierte Daten für lernzeit.app (Stand 26.10.2026). Nur belegbare Angaben:
// Preise wie in PricingComparison und faq.ts, keine Bewertungen, keine Zahlen
// ohne Quelle. Die Angaben zur Sperre stehen in docs/funktionsstand.md.
import { FAQ, type FaqEintrag } from './faq';

export const SITE_URL = 'https://lernzeit.app';
export const APP_STORE_LINK = 'https://apps.apple.com/de/app/lernzeit-lernen-f%C3%BCr-handyzeit/id6789603688';
export const PLAY_STORE_LINK = 'https://play.google.com/store/apps/details?id=de.lernzeit.app';

export const ORGANISATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organisation`,
  name: 'LernZeit',
  legalName: 'LernZeit UG (haftungsbeschränkt)',
  url: SITE_URL,
  logo: `${SITE_URL}/og-logo.png`,
  email: 'info@lernzeit.app',
  description: 'LernZeit ist eine Lern-App: Kinder lösen Aufgaben und verdienen Bildschirmzeit, die Eltern genehmigen.',
};

export const SOFTWARE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': `${SITE_URL}/#app`,
  name: 'LernZeit',
  url: SITE_URL,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'iOS, Android, Web-Browser',
  inLanguage: 'de',
  description:
    'Kinder der Klassen 1 bis 10 lösen Aufgaben und verdienen pro richtiger Antwort Bildschirmzeit. Eltern genehmigen jede Anfrage. Auf dem iPhone sperrt LernZeit das Kinder-Handy und gibt genehmigte Zeit frei, auf Android läuft die Sperre über Google Family Link.',
  installUrl: [APP_STORE_LINK, PLAY_STORE_LINK],
  publisher: { '@id': `${SITE_URL}/#organisation` },
  offers: [
    {
      '@type': 'Offer',
      name: 'Kostenlos',
      price: '0',
      priceCurrency: 'EUR',
      description: 'Aufgaben in allen Fächern der Klassenstufe, Bildschirmzeit verdienen, beliebig viele Kinderprofile.',
    },
    {
      '@type': 'Offer',
      name: 'Premium monatlich',
      price: '2.99',
      priceCurrency: 'EUR',
      priceSpecification: { '@type': 'UnitPriceSpecification', price: '2.99', priceCurrency: 'EUR', billingDuration: 'P1M' },
      description: 'KI-Lernplan für Klassenarbeiten, Schwerpunktfächer, Belohnung je Fach, eigene Zeitlimits, erweiterte Lernanalyse. Die ersten 4 Wochen alle Funktionen kostenlos, ohne Zahlungsdaten.',
    },
    {
      '@type': 'Offer',
      name: 'Premium jährlich',
      price: '29.99',
      priceCurrency: 'EUR',
      priceSpecification: { '@type': 'UnitPriceSpecification', price: '29.99', priceCurrency: 'EUR', billingDuration: 'P1Y' },
      description: 'Wie Premium monatlich, im Jahr abgerechnet.',
    },
  ],
};

// Die beiden Videos auf der Startseite (public/landing). Hochgeladen laut Git am 04.10. bzw. 11.10.2026.
export const VIDEOS_JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: 'LernZeit: Aufgaben lösen und Zeit verdienen',
    description: 'Ein Kind löst Aufgaben in der LernZeit-App und sieht, wie die verdiente Bildschirmzeit wächst.',
    thumbnailUrl: `${SITE_URL}/landing/demo-aufgaben.webp`,
    contentUrl: `${SITE_URL}/landing/demo-aufgaben.mp4`,
    uploadDate: '2026-10-04',
    inLanguage: 'de',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: 'LernZeit: Die Startseite des Kindes',
    description: 'Die Startseite eines Kindes in LernZeit: verdiente Zeit, Lernpläne, Tagesaufgabe und Erfolge.',
    thumbnailUrl: `${SITE_URL}/landing/kind-start.webp`,
    contentUrl: `${SITE_URL}/landing/kind-start.mp4`,
    uploadDate: '2026-10-11',
    inLanguage: 'de',
  },
];

export const faqJsonLd = (eintraege: FaqEintrag[] = FAQ) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: eintraege.map(({ f, a }) => ({
    '@type': 'Question',
    name: f,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
});

export const brotkrumenJsonLd = (pfad: { text: string; zu: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: pfad.map((p, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: p.text,
    item: `${SITE_URL}${p.zu}`,
  })),
});

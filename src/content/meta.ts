// Titel und Beschreibung je Route. Eine Quelle für die Seiten (Seo) und den Build:
// react-helmet-async setzt beide beim Vorrendern nicht zuverlässig (am 26.10.2026
// stand auf /faq noch der Titel der Startseite), deshalb setzt vite.config.ts sie
// nach dem Vorrendern aus diesen Daten (postProcess).
import { seiten } from './seiten';
import { findeSichtbarenArtikel } from './ratgeber';

export interface RouteMeta { title: string; description: string }

export const META_START: RouteMeta = {
  title: 'LernZeit – Lernen belohnen. Handyzeit verdienen.',
  description: 'Kinder lösen Aufgaben und verdienen pro richtiger Antwort Bildschirmzeit. Lehrplanorientiert für Klasse 1–10. Jetzt starten.',
};
export const META_FAQ: RouteMeta = {
  title: 'Häufige Fragen – LernZeit',
  description: 'Antworten zu Kosten, Testphase, Bildschirmzeit, Fächern, Verbindung mit dem Kind, Datenschutz und Kontolöschung bei LernZeit.',
};
export const META_RATGEBER: RouteMeta = {
  title: 'Ratgeber – LernZeit',
  description: 'Artikel für Eltern rund um Bildschirmzeit, Smartphone und Lernen: was Fachleute empfehlen und was Studien zeigen.',
};

export const META_WIDERRUF: RouteMeta = {
  title: 'Widerrufsbelehrung – LernZeit',
  description: 'Widerrufsbelehrung und Muster-Widerrufsformular für LernZeit Premium. Vertrag direkt online widerrufen.',
};
export const META_SUPPORT: RouteMeta = {
  title: 'Support & Hilfe – LernZeit',
  description: 'Hilfe, FAQ und Kontaktformular für LernZeit. Wir helfen Eltern und Kindern bei Fragen rund um die App.',
};

export const META_IMPRESSUM: RouteMeta = {
  title: 'Impressum – LernZeit',
  description: 'Impressum und Anbieterkennzeichnung von LernZeit gemäß § 5 DDG.',
};
export const META_DATENSCHUTZ: RouteMeta = {
  title: 'Datenschutz – LernZeit',
  description: 'Datenschutzerklärung von LernZeit: welche Daten von Eltern und Kindern wir verarbeiten, wozu, auf welcher Rechtsgrundlage und welche Rechte Sie haben.',
};
export const META_NUTZUNG: RouteMeta = {
  title: 'Nutzungsbedingungen – LernZeit',
  description: 'Nutzungsbedingungen (AGB) von LernZeit: Leistungen, Testphase, Premium-Abo, Preise, Laufzeit, Kündigung und Widerruf.',
};
export const META_KUENDIGEN: RouteMeta = {
  title: 'Verträge hier kündigen – LernZeit',
  description: 'LernZeit Premium kündigen: ohne Anmeldung, mit sofortiger Eingangsbestätigung per E-Mail.',
};
export const META_KONTO: RouteMeta = {
  title: 'Konto & Daten löschen – LernZeit',
  description: 'So löschst du dein LernZeit-Konto und alle personenbezogenen Daten – direkt in der App oder per E-Mail-Antrag nach Art. 17 DSGVO.',
};

export const artikelTitel = (titel: string) => `${titel} – LernZeit Ratgeber`;

/** Meta-Angaben für Routen mit festen Texten; sonst null (dann gilt, was die Seite selbst setzt). */
export function metaFuerRoute(route: string): RouteMeta | null {
  if (route === '/start') return META_START;
  if (route === '/faq') return META_FAQ;
  if (route === '/ratgeber') return META_RATGEBER;
  if (route === '/widerruf') return META_WIDERRUF;
  if (route === '/support') return META_SUPPORT;
  if (route === '/impressum') return META_IMPRESSUM;
  if (route === '/datenschutz') return META_DATENSCHUTZ;
  if (route === '/nutzungsbedingungen') return META_NUTZUNG;
  if (route === '/kuendigen') return META_KUENDIGEN;
  if (route === '/konto-loeschen') return META_KONTO;
  const artikel = route.startsWith('/ratgeber/') ? findeSichtbarenArtikel(route.slice('/ratgeber/'.length)) : undefined;
  if (artikel) return { title: artikelTitel(artikel.titel), description: artikel.beschreibung };
  const seite = seiten.find((s) => s.pfad === route);
  return seite ? { title: seite.titel, description: seite.beschreibung } : null;
}

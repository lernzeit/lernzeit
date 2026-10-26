// Datenmodell für die Inhaltsseiten der Website (Zielseiten, Vergleich, Preise, Hilfe).
// Die Texte stehen als Daten in src/content/seiten/index.ts; die Seite rendert
// src/pages/Inhaltsseite.tsx. Alles landet beim Vorrendern im statischen HTML.
import type { FaqEintrag } from '../faq';

export interface SeitenTabelle {
  kopf: string[];
  zeilen: string[][];
}

export interface SeitenAbschnitt {
  h2: string;
  absaetze?: string[];
  /** Aufzählung nach den Absätzen */
  liste?: string[];
  /** Nummerierte Schritte nach der Aufzählung */
  schritte?: string[];
  tabelle?: SeitenTabelle;
  /** Absätze nach Liste und Tabelle */
  nachher?: string[];
}

export interface Inhaltsseite {
  /** Pfad mit führendem Schrägstrich, z. B. /bildschirmzeit-kind */
  pfad: string;
  /** <title>, höchstens etwa 60 Zeichen */
  titel: string;
  /** Meta-Description, höchstens 155 Zeichen */
  beschreibung: string;
  h1: string;
  einleitung: string;
  abschnitte: SeitenAbschnitt[];
  faq?: FaqEintrag[];
  /** Stand der Texte, ISO-Datum */
  aktualisiert: string;
  /** Brotkrumen nach „Startseite“ */
  brotkrumen: { text: string; zu?: string }[];
  /** Wert für landing_cta_click.position */
  position: string;
  /** Beschriftung des Knopfs im Kopf */
  knopf?: string;
  weiterfuehrend: { text: string; zu: string; zusatz?: string }[];
}

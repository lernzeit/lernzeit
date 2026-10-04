// Datenmodell für Ratgeber-Artikel. Die Inhalte werden als Daten in
// src/content/ratgeber/index.ts eingetragen.
export interface RatgeberQuelle {
  nr: number;
  titel: string;
  herausgeber: string;
  jahr: string;
  url: string;
  geprueftAm: string | null;
}

export interface RatgeberAbschnitt {
  ueberschrift?: string;
  absaetze: string[];
}

export interface RatgeberArtikel {
  slug: string;
  titel: string;
  /** Für die Meta-Description, höchstens 155 Zeichen */
  beschreibung: string;
  veroeffentlicht: boolean;
  /** ISO-Datum */
  datum: string;
  aktualisiert?: string;
  lesezeitMinuten: number;
  abschnitte: RatgeberAbschnitt[];
  quellen: RatgeberQuelle[];
}

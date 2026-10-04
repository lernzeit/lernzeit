/**
 * Kaufaussicht einer Familie fuer das Nutzungs-Dashboard im Admin-Bereich.
 *
 * Eine Faustregel aus Nutzungssignalen, kein Modell: Es gibt noch zu wenige
 * echte Kaeufe, um sie zu pruefen. Deshalb nennt jede Einstufung ihre
 * Gruende, und die Regeln stehen hier offen:
 *
 *   Kind lernt an 5+ von 14 Tagen   +2   (an 2-4 Tagen +1)
 *   Eltern geben Bildschirmzeit frei +1   (mind. eine Freigabe in 28 Tagen)
 *   Eltern an 2+ Tagen aktiv         +1   (in 14 Tagen)
 *   Kauf begonnen, nicht beendet     +2
 *
 *   hoch ab 4 Punkten, mittel ab 2, sonst gering.
 *
 * Gedanke dahinter: LernZeit wirkt erst, wenn die Schleife laeuft — das Kind
 * lernt, die Eltern geben Zeit frei. Familien, bei denen beides passiert,
 * haben einen Grund zu zahlen. Ohne verknuepftes Kind gibt es keinen.
 */

export type Stufe = 'zahlt' | 'hoch' | 'mittel' | 'gering' | 'keine';

export interface FamilienSignale {
  art: string;
  kinder: number;
  lerntage_14: number;
  eltern_tage_14: number;
  freigaben_28: number;
  paywall_gesehen: boolean;
  kauf_begonnen: boolean;
  abo_status: string;
  testphase_ende: string | null;
}

export interface Aussicht {
  stufe: Stufe;
  punkte: number;
  gruende: string[];
  /** Testphase endet in hoechstens 7 Tagen — jetzt waere der Moment. */
  endetBald: boolean;
  restTage: number | null;
}

const TAG_MS = 86_400_000;

export function kaufaussicht(f: FamilienSignale, jetzt: Date = new Date()): Aussicht {
  const restTage = f.testphase_ende
    ? Math.ceil((new Date(f.testphase_ende).getTime() - jetzt.getTime()) / TAG_MS)
    : null;
  const endetBald = f.abo_status === 'testphase' && restTage !== null && restTage >= 0 && restTage <= 7;

  if (f.abo_status === 'bezahlt') {
    return { stufe: 'zahlt', punkte: 0, gruende: ['Abo bezahlt'], endetBald: false, restTage };
  }
  if (f.art !== 'familie') {
    return { stufe: 'keine', punkte: 0, gruende: ['Kein Elternkonto – kann kein Abo abschließen'], endetBald: false, restTage };
  }
  if (f.kinder === 0) {
    return { stufe: 'gering', punkte: 0, gruende: ['Noch kein Kind verknüpft'], endetBald, restTage };
  }

  let punkte = 0;
  const gruende: string[] = [];

  if (f.lerntage_14 >= 5) {
    punkte += 2;
    gruende.push(`Kind lernt regelmäßig (${f.lerntage_14} von 14 Tagen)`);
  } else if (f.lerntage_14 >= 2) {
    punkte += 1;
    gruende.push(`Kind lernt ab und zu (${f.lerntage_14} von 14 Tagen)`);
  } else {
    gruende.push(f.lerntage_14 === 1 ? 'Kind hat in 14 Tagen nur einmal gelernt' : 'Kind hat in 14 Tagen nicht gelernt');
  }

  if (f.freigaben_28 >= 1) {
    punkte += 1;
    gruende.push(`Eltern geben Zeit frei (${f.freigaben_28}× in 28 Tagen)`);
  }

  if (f.eltern_tage_14 >= 2) {
    punkte += 1;
    gruende.push(`Eltern an ${f.eltern_tage_14} von 14 Tagen aktiv`);
  }

  if (f.kauf_begonnen) {
    punkte += 2;
    gruende.push('Kauf begonnen, nicht abgeschlossen');
  } else if (f.paywall_gesehen) {
    gruende.push('Bezahlseite gesehen');
  }

  if (f.abo_status === 'testkauf') gruende.push('Nur Testkauf (Sandbox)');
  if (f.abo_status === 'freigeschaltet') gruende.push('Premium ohne Zahlung freigeschaltet');

  const stufe: Stufe = punkte >= 4 ? 'hoch' : punkte >= 2 ? 'mittel' : 'gering';
  return { stufe, punkte, gruende, endetBald, restTage };
}

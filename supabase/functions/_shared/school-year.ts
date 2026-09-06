/**
 * Stoff, der im Schuljahr schon dran war — statt Stoff, der irgendwann drankommt.
 *
 * Anlass: Rueckmeldung, die Fragen seien zu schwer. Die Ursache steckt nicht in
 * der Schwierigkeitsstufe, sondern im Zeitpunkt. Ein Kind der 7. Klasse bekam am
 * ersten Schultag Zinsrechnung und Baumdiagramme — Themen, die im Lehrplan der
 * 7. Klasse stehen, aber erst im Fruehjahr unterrichtet werden.
 *
 * Im Code stand das woertlich so:
 *
 *   getGradeGuidelines(7) -> 'Klasse 7: Zinsrechnung, Termumformungen,
 *                             lineare Gleichungen mit Bruechen, Zuordnungen,
 *                             Zylinder/Prismen, Stochastik'
 *   Cache-Auswahl         -> .eq('grade', grade)
 *
 * Also der komplette Jahresstoff ab Tag eins, und ausschliesslich dieser. Bei
 * Klasse 6 stand sogar ausdruecklich "KEINE reinen Klasse-2-3-Rechnungen" — der
 * Code draengte aktiv vom leichteren Stoff weg.
 *
 * Verschaerft wird das durch den jaehrlichen Klassenwechsel am 1. August: Genau
 * an dem Tag springt jedes Kind eine Stufe hoch und bekommt sofort den vollen
 * Jahresstoff der neuen Klasse.
 *
 * Die Loesung braucht keine neue Verschlagwortung der 2598 vorhandenen Fragen:
 * Frueh im Schuljahr wird ueberwiegend aus der VORIGEN Klassenstufe gezogen.
 * Deren Stoff ist vollstaendig unterrichtet — das ist genau das, was ein Kind
 * im September sicher kann.
 *
 * Die Funktionen sind bewusst rein und bekommen Datum und Zufall von aussen,
 * damit sie ohne laufende Edge Function testbar bleiben.
 */

/** Das Schuljahr beginnt im August. Monat 0 = August, 11 = Juli. */
export function schoolYearMonth(now: Date = new Date()): number {
  return (now.getMonth() - 7 + 12) % 12;
}

/**
 * Anteil der Fragen, die aus der VORIGEN Klassenstufe kommen sollen.
 *
 * Die Werte sind gestuft statt gleitend, weil sie so nachvollziehbar bleiben:
 *
 *   Aug/Sep   70 %   das neue Schuljahr hat kaum begonnen
 *   Okt/Nov   50 %   erste Themen sitzen
 *   Dez/Jan   30 %   Halbjahr, gut die Haelfte ist behandelt
 *   ab Feb    15 %   der Jahresstoff ist weitgehend da
 *
 * Auch spaet im Jahr bleiben 15 Prozent: Wiederholung aelteren Stoffs ist
 * didaktisch sinnvoll und haelt die App davon ab, durchgehend fordernd zu sein.
 * Bei einer App, die Bildschirmzeit fuers Loesen vergibt, ist eine Frage, die
 * ein Kind sicher kann, kein Ausfall, sondern der Zweck.
 */
export function previousGradeShare(now: Date = new Date()): number {
  const month = schoolYearMonth(now);
  if (month <= 1) return 0.7;
  if (month <= 3) return 0.5;
  if (month <= 5) return 0.3;
  return 0.15;
}

/**
 * Aus welcher Klassenstufe soll die naechste Frage stammen?
 *
 * `roll` wird hereingereicht statt intern gewuerfelt, damit sich das Verhalten
 * im Test festnageln laesst.
 *
 * Klasse 1 hat keine Vorstufe — dort bleibt es bei der eigenen. Fuer
 * Erstklaesser im September ist das die einzige Stellschraube, die fehlt; die
 * muss ueber die Schwierigkeitsstufe kommen.
 */
export function effectiveGrade(
  grade: number,
  now: Date = new Date(),
  roll: number = Math.random(),
): number {
  if (!Number.isFinite(grade) || grade <= 1) return Math.max(1, Math.trunc(grade) || 1);
  return roll < previousGradeShare(now) ? grade - 1 : grade;
}

/**
 * Hinweis fuer den Fragen-Prompt, wenn doch die aktuelle Klassenstufe gezogen
 * wurde. Ohne ihn wuerde das Modell auch im September aus dem gesamten
 * Jahresstoff greifen.
 *
 * Bewusst ohne Monatsnamen: Das Modell soll nicht ueber Bundeslaender und
 * Ferientermine spekulieren, sondern nur den Anteil des Schuljahres kennen.
 */
export function schoolYearHint(grade: number, now: Date = new Date()): string {
  const month = schoolYearMonth(now);
  if (month >= 6) return '';
  const anteil = month <= 1 ? 'gerade erst begonnen' : month <= 3 ? 'etwa ein Viertel vorbei' : 'etwa zur Haelfte vorbei';
  return `\n\nLERNSTAND: Das Schuljahr ist ${anteil}. Nimm ausschliesslich Themen, die am ANFANG der Klasse ${grade} behandelt werden, oder Stoff der vorigen Klassenstufe. Themen, die erfahrungsgemaess erst im zweiten Halbjahr drankommen, sind hier falsch.`;
}

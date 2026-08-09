/**
 * Gemeinsame Prompt-Bausteine für die Fragengenerierung.
 *
 * Es gibt zwei Generatoren — `ai-question-generator` (live) und `cache-prefill`
 * (Batch-Vorproduktion). Beide müssen dieselben didaktischen Regeln anwenden,
 * sonst unterscheiden sich vorproduzierte und frisch erzeugte Fragen. Alles,
 * was beide brauchen, liegt deshalb hier.
 *
 * Token-Budget: Die Prompt-Blöcke sind bewusst knapp gehalten. Sie gehen bei
 * JEDER Generierung mit, weshalb jede zusätzliche Zeile direkt auf die Kosten
 * durchschlägt. Begriffsfelder sind daher nach Klassenbändern gruppiert statt
 * pro Klasse hinterlegt.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export type QuestionCategory = 'calculation' | 'theory';

/** Fächer, für die Theoriefragen überhaupt vorgesehen sind. */
export const THEORY_SUBJECTS = ['math', 'physics', 'chemistry'] as const;

/**
 * Fallback-Anteile, falls `question_category_mix` nicht erreichbar ist.
 * Spiegelt die Seed-Werte der Migration — bei Änderungen dort bitte hier
 * mitziehen, damit ein DB-Ausfall nicht das Verhalten kippt.
 */
const DEFAULT_MIX: Record<string, Record<number, number>> = {
  math: { 1: 0, 2: 0, 3: 15, 4: 20, 5: 25, 6: 30, 7: 30, 8: 35, 9: 40, 10: 40 },
  physics: { 5: 30, 6: 30, 7: 35, 8: 35, 9: 40, 10: 40 },
  chemistry: { 7: 35, 8: 40, 9: 40, 10: 45 },
};

// ── Laden der Konfiguration (60s In-Memory-Cache, Muster aus model-config.ts) ──

const CACHE_TTL_MS = 60 * 1000;
let mixCache: { data: Record<string, Record<number, number>>; expiresAt: number } | null = null;

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Lädt die Theorie-Anteile aus `question_category_mix`.
 * Fällt bei jedem Fehler stillschweigend auf DEFAULT_MIX zurück — eine nicht
 * erreichbare Tabelle darf die Fragengenerierung nie blockieren.
 */
export async function loadCategoryMix(): Promise<Record<string, Record<number, number>>> {
  if (mixCache && mixCache.expiresAt > Date.now()) return mixCache.data;

  const client = getServiceClient();
  if (!client) return DEFAULT_MIX;

  try {
    const { data, error } = await client
      .from('question_category_mix')
      .select('subject, grade, theory_percentage');

    if (error || !data || data.length === 0) return DEFAULT_MIX;

    const mix: Record<string, Record<number, number>> = {};
    for (const row of data as Array<{ subject: string; grade: number; theory_percentage: number }>) {
      (mix[row.subject] ??= {})[row.grade] = row.theory_percentage;
    }

    mixCache = { data: mix, expiresAt: Date.now() + CACHE_TTL_MS };
    return mix;
  } catch {
    return DEFAULT_MIX;
  }
}

/** Nur für Tests: setzt den In-Memory-Cache zurück. */
export function resetCategoryMixCache(): void {
  mixCache = null;
}

/**
 * Zieht die Kategorie für eine Frage.
 *
 * Rein zufällig gewichtet — über viele Fragen hinweg stellt sich der
 * konfigurierte Anteil ein, ohne dass ein Zustand pro Nutzer nötig wäre.
 */
export function pickCategory(
  subject: string,
  grade: number,
  mix: Record<string, Record<number, number>>,
): QuestionCategory {
  if (!(THEORY_SUBJECTS as readonly string[]).includes(subject)) return 'calculation';
  const pct = mix[subject]?.[grade] ?? 0;
  if (pct <= 0) return 'calculation';
  if (pct >= 100) return 'theory';
  return Math.random() * 100 < pct ? 'theory' : 'calculation';
}

// ── Begriffsfelder je Klassenband ────────────────────────────────────────────
//
// Anker für die KI, damit Theoriefragen im Lehrplan bleiben statt beliebige
// Fachwörter zu erfinden. Nach Bändern gruppiert, um den Prompt kurz zu halten.

// Jedes Band bringt sein eigenes Beispiel mit. Ein fest verdrahtetes Beispiel
// wäre fatal: Ein Hypotenuse-Beispiel im Klasse-3-Prompt verleitet das Modell
// dazu, lehrplanfremde Oberstufenbegriffe abzufragen.
interface TermBand { upTo: number; terms: string; example: string }

const TERM_BANDS: Record<string, TermBand[]> = {
  math: [
    {
      upTo: 4,
      terms: 'Summand, Differenz, Produkt, Quotient, Faktor, Dividend, rechter Winkel, Symmetrieachse',
      example: '"Wie heißt das Ergebnis einer Addition?" → "Summe"',
    },
    {
      upTo: 6,
      terms: 'Zähler, Nenner, Primzahl, Teiler, Vielfaches, Grundwert, Prozentsatz, Term, Variable',
      example: '"Wie heißt die Zahl unter dem Bruchstrich?" → "Nenner"',
    },
    {
      upTo: 8,
      terms: 'Steigung, y-Achsenabschnitt, Nullstelle, proportional, Strahlensatz, Ähnlichkeit, Zufallsexperiment',
      example: '"Wie heißt der Punkt, an dem eine Gerade die y-Achse schneidet?" → "y-Achsenabschnitt"',
    },
    {
      upTo: 10,
      terms: 'Hypotenuse, Kathete, Sinus, Kosinus, Tangens, Scheitelpunkt, Diskriminante, Wachstumsfaktor',
      example: '"Wie heißt die Seite im rechtwinkligen Dreieck, die dem rechten Winkel gegenüberliegt?" → "Hypotenuse"',
    },
  ],
  physics: [
    {
      upTo: 6,
      terms: 'Kraft, Masse, Gewicht, Stromkreis, Leiter, Isolator, Schallquelle, Reflexion',
      example: '"Wie nennt man ein Material, das Strom nicht leitet?" → "Isolator"',
    },
    {
      upTo: 8,
      terms: 'Spannung, Stromstärke, Widerstand, Dichte, Auftrieb, Hebelgesetz, Brechung, Linse',
      example: '"Welche Größe wird in Volt gemessen?" → "Spannung"',
    },
    {
      upTo: 10,
      terms: 'Beschleunigung, Trägheit, kinetische Energie, Wirkungsgrad, Induktion, Frequenz, Amplitude, Halbwertszeit',
      example: '"Welche Größe gibt die Anzahl der Schwingungen pro Sekunde an?" → "Frequenz"',
    },
  ],
  chemistry: [
    {
      upTo: 8,
      terms: 'Reinstoff, Gemisch, Element, Verbindung, Atom, Molekül, Aggregatzustand, Filtration',
      example: '"Wie nennt man einen Stoff aus nur einer Atomsorte?" → "Element"',
    },
    {
      upTo: 10,
      terms: 'Ion, Ionenbindung, Elektronenpaarbindung, Oxidation, Reduktion, Katalysator, pH-Wert, Molmasse',
      example: '"Wie nennt man die Abgabe von Elektronen?" → "Oxidation"',
    },
  ],
};

function bandFor(subject: string, grade: number): TermBand | null {
  const bands = TERM_BANDS[subject];
  if (!bands) return null;
  return bands.find((b) => grade <= b.upTo) ?? bands[bands.length - 1];
}

// ── Prompt-Blöcke ────────────────────────────────────────────────────────────

/**
 * Block für Theoriefragen. Ersetzt die „NUR Zahlen"-Regel, die für diese
 * Kategorie gerade das Falsche erzwingen würde.
 */
export function theoryInstruction(subject: string, grade: number): string {
  const band = bandFor(subject, grade);
  if (!band) return '';
  return `THEORIEFRAGE – KEINE Rechnung, KEIN Zahlenergebnis.
Frage nach einem Fachbegriff, einer Definition, einer Eigenschaft oder einer Regel.
Die Antwort ist ein Begriff oder eine kurze Aussage (max. 3 Wörter).
Begriffsfeld Klasse ${grade}: ${band.terms}
Beispiel: ${band.example}`;
}

/**
 * Block für Rechenaufgaben. Adressiert die eigentliche Beschwerde: Aufgaben
 * sollen ohne Papier lösbar bleiben.
 */
export function mentalMathConstraint(): string {
  // Das Gegenbeispiel steht bewusst drin: Sprachmodelle halten sich an eine
  // konkrete Negativvorlage deutlich zuverlässiger als an eine abstrakte Regel.
  // Genau dieses Muster (erst multiplizieren, dann das Ergebnis weiterverrechnen)
  // war in Klasse 3 der Regelfall.
  return `EIN RECHENSCHRITT – zwingend:
Genau EINE Rechenoperation. KEIN Zwischenergebnis, das weiterverwendet wird.
FALSCH: "Rechne 6 · 7 und ziehe das Ergebnis von 50 ab." (zwei Schritte)
FALSCH: "Ein Karton hat 4 Reihen zu 6 Stück. Wie viele bleiben, wenn 9 fehlen?"
RICHTIG: "Was ist 6 · 7?"
RICHTIG: "Ein Karton hat 4 Reihen zu 6 Stück. Wie viele sind es?"
Zahlen aus dem sicheren Kopfrechenbereich der Klasse, Ergebnis ganzzahlig.`;
}

/**
 * Gilt für ALLE Fächer, nicht nur die rechenlastigen.
 *
 * Eine Geschichtsfrage nach einer entlegenen Jahreszahl oder eine
 * Geografiefrage nach einer Flusslänge ist genauso demotivierend wie eine
 * mehrschrittige Rechenaufgabe: Sie ist ohne Nachschlagen nicht beantwortbar.
 * Steht im System-Prompt, gilt damit für jede Anfrage.
 */
export function answerableFromMemoryRule(): string {
  return '- SOFORT beantwortbar aus dem Unterrichtswissen der Klassenstufe: ein Denkschritt, kein Nachschlagen, keine Nebenrechnung';
}

/**
 * Der kategorieabhängige Teil des System-Prompts.
 * Bei `calculation` gilt die bisherige Zahlen-Regel weiter, bei `theory` nicht.
 */
export function answerFormatRule(category: QuestionCategory, subject: string): string {
  const isCalcSubject = (THEORY_SUBJECTS as readonly string[]).includes(subject);
  if (!isCalcSubject) return '';
  return category === 'theory'
    ? '- Theoriefragen: Antwort ist ein Fachbegriff, KEINE Zahl'
    : '- Rechenaufgaben: Antwort NUR Zahlen, keine Einheiten (z.B. "15", nicht "15 Brötchen")';
}

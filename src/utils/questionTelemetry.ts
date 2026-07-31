/**
 * Telemetrie für die Fragenherkunft.
 *
 * Protokolliert eindeutig, ob eine Frage aus dem statischen Demo-Pool, aus dem
 * geteilten Fragen-Cache (Pool) oder frisch von der KI (API) stammt – und in
 * welchem Auth-/demoMode-Zustand das passiert ist.
 */
export type QuestionSource = 'demo' | 'pool' | 'api' | 'unknown';

export interface QuestionTelemetryContext {
  demoMode: boolean;
  authenticated?: boolean;
  grade?: number;
  subject?: string;
  difficulty?: string;
  index?: number;
}

const PREFIX = '[question-telemetry]';

const stamp = () => new Date().toISOString();

/** Normalisiert das `source`-Feld der Edge-Function auf unsere Kategorien. */
export const normalizeQuestionSource = (raw: unknown): QuestionSource => {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (value === 'demo') return 'demo';
  if (value === 'cache' || value === 'cache-fallback' || value === 'pool') return 'pool';
  if (value === 'ai' || value === 'api' || value === 'generated') return 'api';
  return 'unknown';
};

/** Eine geladene Frage inkl. Herkunft protokollieren. */
export const logQuestionSource = (
  source: QuestionSource,
  questionText: string | undefined,
  context: QuestionTelemetryContext
) => {
  console.info(`${PREFIX} question_loaded`, {
    at: stamp(),
    source,
    demoMode: context.demoMode,
    authenticated: context.authenticated ?? null,
    grade: context.grade,
    subject: context.subject,
    difficulty: context.difficulty,
    index: context.index,
    questionText: (questionText || '').slice(0, 80)
  });
};

/** Start eines Ladevorgangs inkl. demoMode-Zustand protokollieren. */
export const logPreloadStart = (
  context: QuestionTelemetryContext & { plannedSource: QuestionSource; total?: number }
) => {
  console.info(`${PREFIX} preload_start`, {
    at: stamp(),
    demoMode: context.demoMode,
    authenticated: context.authenticated ?? null,
    plannedSource: context.plannedSource,
    grade: context.grade,
    subject: context.subject,
    total: context.total
  });
};

/** Auth-Wechsel inkl. Auswirkung auf den aktiven Fragen-Pool protokollieren. */
export const logAuthTransition = (details: {
  event: string;
  authenticated: boolean;
  demoMode: boolean;
  hadDemoQuestions: boolean;
  action: 'discard_demo_and_reload' | 'purge_only' | 'noop';
}) => {
  console.info(`${PREFIX} auth_transition`, { at: stamp(), ...details });
};

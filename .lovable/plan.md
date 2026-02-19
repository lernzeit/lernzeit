
# Vollständiger Skalierungs- & Bereinigungsplan

## Ausgangslage (Was heute aktiv genutzt wird)

Der aktive Datenpfad der App ist minimal und klar:

```text
Nutzer startet Spiel
  → Index.tsx → LearningGame.tsx
    → useQuestionPreloader.ts
      → Edge Function: ai-question-generator (Gemini 3 Flash)
        → 5 Fragen per KI generiert
    → useAIExplanation.ts
      → Edge Function: ai-explain (bei falscher Antwort)
    → useGameSessionSaver.ts
      → Supabase: game_sessions (gespeichert)
```

Alles andere — Templates, CategoryMathProblem, MathProblem, MathProblemOptimized, Balancer, CurriculumManager etc. — ist **toter Code**.

---

## Phase 1: Legacy-Bereinigung (Priorität: Hoch)

### 1A — Edge Functions löschen (25 von 31 sind nicht mehr in Verwendung)

**Aktiv genutzt (behalten):**
- `ai-question-generator` — Kernfunktion
- `ai-explain` — Erklärungen
- `ai-tutor` — KI-Tutor
- `validate-question` — optional, aber sauber
- `screen-time-request` — Eltern-Kind-Funktion
- `annual-grade-upgrade` — Jahresupgrade
- `create-checkout` — Stripe
- `check-subscription` — Stripe
- `customer-portal` — Stripe

**Zu löschen (veraltet, template-basiert):**
- `auto-question-generator`
- `auto-template-repair`
- `batch-generate-questions`
- `batch-question-generator`
- `cleanup-duplicates`
- `cleanup-faulty-questions`
- `cleanup-negative-templates`
- `cleanup-todays-templates`
- `curriculum-aware-generator`
- `curriculum-coverage-analyzer`
- `direct-template-generator`
- `explain-answer` ← alt (ersetzt durch `ai-explain`)
- `first-grade-cron`
- `first-grade-math-generator`
- `generate-question-realtime` ← alt (ersetzt durch `ai-question-generator`)
- `generate-questions` ← alt
- `openai-proxy` ← alt
- `question-generator-cron`
- `recount-template-stats`
- `template-mass-generator`
- `template-rotator-cron`

### 1B — Frontend-Hooks löschen (nicht mehr referenziert oder nur von Legacy-Code verwendet)

```text
src/hooks/
  LÖSCHEN:
  - useAIQuestion.ts           ← alt
  - useBalancedQuestionGeneration.ts
  - useBalancedTemplateSelection.ts
  - useEnhancedCurriculumGeneration.ts
  - useIntelligentQualitySystem.ts
  - useParametrizedQuestionGeneration.ts
  - usePreGenerationValidator.ts
  - useQuestionEventLogging.ts
  - useQuestionGenerationManager.ts
  - useQuestionValidation.ts
  - useQuestions.ts            ← alt (topics-basiert)
  - useRealtimeQuestion.ts     ← alt
  - useSessionDuplicatePrevention.ts
  - useSystematicTemplateGeneration.ts
  - useTemplateBankGeneration.ts
  - useTemplateQuestionGeneration.ts
  - useTemplateRotation.ts
  - useTopics.ts               ← alt
  - useExplanation.ts          ← alt (ersetzt durch useAIExplanation)

  BEHALTEN:
  - useAIExplanation.ts        ✓ aktiv
  - useAchievementTracker.ts   ✓ aktiv
  - useAchievements.ts         ✓ aktiv
  - useActiveTimer.ts          ✓ aktiv
  - useAdaptiveDifficultySystem.ts ✓ aktiv (in CategoryMathProblem)
  - useAuth.ts                 ✓ aktiv
  - useChildSettings.ts        ✓ aktiv
  - useEarnedMinutesTracker.ts ✓ aktiv
  - useFamilyLinking.ts        ✓ aktiv
  - useGameSessionSaver.ts     ✓ aktiv
  - use-mobile.tsx             ✓ aktiv
  - use-toast.ts               ✓ aktiv
  - usePushNotifications.ts    ✓ aktiv
  - useQuestionPreloader.ts    ✓ KERNHOOK
  - useQuestionReport.ts       ✓ aktiv
  - useScreenTime.ts           ✓ aktiv
  - useScreenTimeLimit.ts      ✓ aktiv
  - useScreenTimeRequests.ts   ✓ aktiv
  - useStreak.ts               ✓ aktiv
  - useSubscription.ts         ✓ aktiv
```

### 1C — Frontend-Komponenten löschen

```text
src/components/
  LÖSCHEN:
  - CategoryMathProblem.tsx     ← template-basiert, nicht in Index.tsx genutzt
  - MathProblem.tsx             ← DEPRECATED (selbst markiert)
  - MathProblemOptimized.tsx    ← template-basiert
  - EnhancedGenerationDisplay.tsx
  - FallbackStatistics.tsx
  - IntelligentQualityDashboard.tsx
  - QualityDashboardModal.tsx
  - RealtimeQuestionGame.tsx    ← alt
  - SimplifiedQuestionRenderer.tsx ← alt
  - game/EnhancedTemplateSelector.tsx
  - game/QuestionGenerationInfo.tsx
  - admin/QualityDashboard.tsx
  - admin/QualityMonitoringDashboard.tsx
  - admin/SimplifiedAdminDashboard.tsx
  - admin/SystematicGenerationControl.tsx
  - admin/TemplateBankDashboard.tsx  ← referenziert templates-Tabelle
  - question-types/FirstGradeQuestionWrapper.tsx ← template-basiert

  BEHALTEN:
  - LearningGame.tsx            ✓ KERNKOMPONENTE
  - GameCompletionScreen.tsx    ✓ aktiv
  - game/QuestionRenderer.tsx   ✓ aktiv
  - game/GameFeedback.tsx       ✓ aktiv
  - game/GameTimer.tsx          ✓ aktiv
  - game/KITutorDialog.tsx      ✓ aktiv
  - game/QuestionReportDialog.tsx ✓ aktiv
  - game/AchievementAnimation.tsx ✓ aktiv
  - admin/AdminDashboard.tsx    ✓ bereinigen (templates-Stats entfernen)
  - admin/ApiStatusPanel.tsx    ✓ aktiv
  - alle auth/*, ui/*, layout/* ✓ aktiv
```

### 1D — Services und Utils löschen

```text
src/services/
  LÖSCHEN (alle template-basierten Services):
  - AdvancedTemplateValidator.ts
  - BatchTemplateGenerator.ts
  - ConsolidatedFirstGradeValidator.ts
  - ContentValidator.ts
  - CurriculumManager.ts
  - MultiProviderAIService.ts
  - ParametrizedTemplateService.ts
  - PostGenerationReviewer.ts
  - QualityAssurancePipeline.ts
  - SessionDuplicatePrevention.ts
  - SmartTemplateSelector.ts
  - TemplatePoolManager.ts
  - TemplateQualityPipeline.ts
  - TemplateRotator.ts
  - templateBankService.ts

  BEHALTEN:
  - familyLink.ts               ✓ aktiv
  - openAIService.ts            ✓ prüfen ob noch referenziert
  - parentalControlsService.ts  ✓ aktiv

src/utils/templates/ (gesamtes Verzeichnis löschen):
  LÖSCHEN: Alle 23 Dateien in diesem Verzeichnis

src/maintenance/ (gesamtes Verzeichnis löschen):
  LÖSCHEN: Alle 5 Dateien (templateBankRunner, migrationRunner etc.)

src/data/
  LÖSCHEN:
  - templateBank.ts
  - templateMetrics.ts
  BEHALTEN:
  - avatars.ts                  ✓ aktiv

src/prompt/ + src/prompts/
  LÖSCHEN: Alle Prompt-Dateien (Generierung läuft jetzt in Edge Functions)

src/knowledge/
  LÖSCHEN: knowledge.ts (knowledge-card-basierter Ansatz)
```

### 1E — Datenbank-Bereinigung

**Tabellen, die nicht mehr benötigt werden (nach Prüfung auf Live-Daten):**
- `templates` — 24.959 Einträge, aber nicht mehr vom aktiven Code genutzt. Vor dem Löschen: Nutzer sollte im Live-Supabase-Dashboard prüfen, ob irgendwelche Daten erhalten bleiben sollen. Empfehlung: Tabelle deaktivieren (Status: ARCHIVED) statt sofort löschen.
- `curriculum_parameter_rules` — nur vom CurriculumManager genutzt (wird gelöscht)
- `scenario_families` — nur vom alten System genutzt
- `user_context_history` — nur vom alten System genutzt
- `question_quality_metrics` — nur vom alten System genutzt
- `template_scores` — View auf templates-Tabelle

**Tabellen behalten:**
- `game_sessions` ✓
- `learning_sessions` ✓
- `profiles` ✓
- `subscriptions` ✓
- `user_achievements` + `achievements_template` ✓
- `question_feedback` ✓ (Feedback-Funktion im Spiel)
- `screen_time_requests` ✓
- `parent_child_relationships` ✓
- `child_settings` ✓
- `child_subject_visibility` ✓
- `invitation_codes` ✓
- `user_earned_minutes` ✓
- `user_difficulty_profiles` ✓
- `daily_request_summary` ✓
- `topics` + `questions` ✓ (für späteres Caching)

**Migrations-SQL vorbereiten (zur manuellen Ausführung im SQL Editor):**
```sql
-- SCHRITT 1: Templates-Tabelle archivieren (NICHT löschen - Datensicherheit)
-- Erst prüfen, dann entscheiden
SELECT COUNT(*), status FROM templates GROUP BY status;

-- SCHRITT 2: Verwaiste Tabellen löschen
DROP TABLE IF EXISTS curriculum_parameter_rules CASCADE;
DROP TABLE IF EXISTS scenario_families CASCADE;
DROP TABLE IF EXISTS user_context_history CASCADE;
DROP TABLE IF EXISTS question_quality_metrics CASCADE;

-- SCHRITT 3: Templates-Tabelle - Entscheidung nach Prüfung
-- Option A: Alle deaktivieren
UPDATE templates SET status = 'ARCHIVED';
-- Option B: Tabelle löschen (erst nach Datensicherung)
-- DROP TABLE templates CASCADE;
```

---

## Phase 2: Fragen-Duplikat-Prävention (Kernziel: Keine Wiederholungen)

### Warum die aktuelle Lösung Duplikate nicht verhindert

`useQuestionPreloader` übergibt an `ai-question-generator` nur `grade`, `subject` und `difficulty`. Die KI bekommt keinerlei Information darüber, welche Fragen in der aktuellen Session oder vergangenen Sessions bereits gestellt wurden. Zufällig können die gleichen Fragen entstehen.

### Lösung: Lokale Session-Deduplizierung + DB-gestützte Langzeit-Deduplizierung

**Schritt 2A: Neue Datenbanktabelle `ai_question_cache`**

Diese Tabelle ist der Kern des gesamten Skalierungskonzepts — sie speichert erfolgreich generierte Fragen und verhindert Wiederholungen:

```sql
CREATE TABLE ai_question_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade INTEGER NOT NULL,
  subject TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  correct_answer JSONB NOT NULL,
  options JSONB,
  hint TEXT,
  task TEXT,
  times_served INTEGER DEFAULT 0,
  last_served_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index für schnelle Lookups
CREATE INDEX idx_ai_question_cache_lookup 
  ON ai_question_cache(grade, subject, difficulty);

-- Index für Rotation (zuletzt gezeigt)
CREATE INDEX idx_ai_question_cache_rotation 
  ON ai_question_cache(grade, subject, last_served_at);

-- RLS: Jeder eingeloggte Nutzer kann lesen (Fragen sind nicht nutzerspezifisch)
ALTER TABLE ai_question_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cache"
  ON ai_question_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manages cache"
  ON ai_question_cache FOR ALL
  TO service_role
  USING (true);
```

**Schritt 2B: `useQuestionPreloader` — Duplikat-Schutz auf Session-Ebene**

Während einer Sitzung (5 Fragen) wird verhindert, dass die gleiche Frage doppelt erscheint. Dies geschieht lokal via `Set<string>` auf dem `questionText`.

```typescript
// Neu: Session-Tracking innerhalb des Hooks
const seenQuestionTextsRef = useRef<Set<string>>(new Set());

// Nach jeder geladenen Frage:
if (seenQuestionTextsRef.current.has(question.questionText)) {
  // Neue Frage anfordern
} else {
  seenQuestionTextsRef.current.add(question.questionText);
}
```

**Schritt 2C: `ai-question-generator` — Fire-and-forget Caching + Ausschluss-Liste**

Die Edge Function wird erweitert um:

1. **Zufällige Frage aus Cache laden** (falls Cache voll genug): `SELECT * FROM ai_question_cache WHERE grade=$1 AND subject=$2 ORDER BY last_served_at ASC NULLS FIRST LIMIT 20` → zufällig eine auswählen → `last_served_at` aktualisieren
2. **Neue Frage generieren** (falls Cache leer oder bei KI-Anteil):
3. **Frage in Cache speichern** (nicht-blockierend, `waitUntil`):

```typescript
// In ai-question-generator: Nach erfolgreicher KI-Generierung
const saveToCache = supabaseAdmin.from('ai_question_cache').insert({
  grade, subject, difficulty,
  question_text: enhancedQuestion.questionText,
  question_type: enhancedQuestion.questionType,
  correct_answer: enhancedQuestion.correctAnswer,
  options: enhancedQuestion.options,
  hint: enhancedQuestion.hint,
  task: enhancedQuestion.task
});
// Non-blocking: Nutzer wartet nicht auf DB-Write
EdgeRuntime.waitUntil(saveToCache);
```

**Schritt 2D: Rotations-Logik — Fragen werden "round-robin" ausgespielt**

Um zu verhindern, dass Nutzer immer die gleichen 5 Fragen aus dem Cache bekommen:
- Sortierung: `ORDER BY last_served_at ASC NULLS FIRST` → zuletzt gesehene kommen zuletzt
- Nach dem Abrufen: `UPDATE ai_question_cache SET last_served_at = now(), times_served = times_served + 1 WHERE id = $1`
- So werden Fragen gleichmäßig rotiert

**Schritt 2E: Nutzer-spezifische Session-Deduplizierung (optional, Phase 3)**

Um zu verhindern, dass ein einzelner Nutzer in aufeinanderfolgenden Sitzungen die gleiche Frage sieht, wird eine leichtgewichtige Lösung mit `localStorage` verwendet:

```typescript
// Im useQuestionPreloader: Letzte 20 gesehene Fragen merken
const recentQuestions = JSON.parse(
  localStorage.getItem(`recent_questions_${grade}_${subject}`) || '[]'
);
// Beim Laden aus Cache: Exclude these IDs
// Nach Session: Update localStorage
```

---

## Phase 3: Smart Cache — Aktivierung bei Wachstum

Dieser Schritt wird erst bei ca. 500+ täglichen aktiven Nutzern aktiviert.

### Tiered Logik in `useQuestionPreloader`

```typescript
// Pseudo-Code der finalen Logik
async function determineQuestionSources(grade, subject, totalQuestions=5) {
  const { count } = await supabase
    .from('ai_question_cache')
    .select('*', { count: 'exact', head: true })
    .eq('grade', grade)
    .eq('subject', subject);

  // Schwellenwerte
  if (count >= 1000) return { dbCount: 5, aiCount: 0 };
  if (count >= 500)  return { dbCount: 4, aiCount: 1 };
  if (count >= 200)  return { dbCount: 3, aiCount: 2 };
  if (count >= 50)   return { dbCount: 2, aiCount: 3 };
  return { dbCount: 0, aiCount: 5 }; // Noch kein Cache
}
```

### Performance durch Parallelladung

DB-Abfrage und KI-Calls werden **gleichzeitig** gestartet:
```typescript
const [dbQuestions, aiQuestion1] = await Promise.all([
  loadFromCache(grade, subject, dbCount),
  generateSingleQuestion(difficulty, signal)  // Erste KI-Frage parallel
]);
```

---

## Phase 4: Admin Dashboard bereinigen

Das aktuelle `AdminDashboard.tsx` zeigt `templates`-Statistiken an. Nach der Bereinigung:

**Entfernen:** Templates-Stats, Cron-Job-Status für Template-Generierung

**Hinzufügen:** Cache-Statistiken aus `ai_question_cache`:
- Fragen im Cache pro Fach/Klasse
- Durchschnittliche `times_served`-Rate
- Wachstumskurve (Fragen pro Tag)

---

## Implementierungsreihenfolge

```text
Phase 1 (Bereinigung) → Sicherheit + Wartbarkeit
  └── 1A: Edge Functions löschen (supabase dashboard + config.toml)
  └── 1B: Legacy-Hooks löschen
  └── 1C: Legacy-Komponenten löschen
  └── 1D: Services/Utils löschen
  └── 1E: DB-Tabellen bereinigen (nach manueller Prüfung)

Phase 2 (Duplikat-Prävention) → Sofortiger Nutzernutzen
  └── 2A: ai_question_cache Tabelle anlegen (Migration)
  └── 2B: useQuestionPreloader — Session-Deduplizierung
  └── 2C: ai-question-generator — Cache-Write (fire-and-forget)
  └── 2D: Rotations-Logik (last_served_at)
  └── 2E: localStorage für nutzer-spezifische History

Phase 3 (Skalierung) → Bei 500+ Nutzern/Tag aktivieren
  └── 3A: Tiered-Logik in useQuestionPreloader
  └── 3B: Cache-Lesepfad in ai-question-generator

Phase 4 (Admin) → Nach Phase 1+2
  └── 4A: AdminDashboard auf Cache-Stats umstellen
```

---

## Wichtige Hinweise vor der Ausführung

1. **DB-Tabellen: Vor dem Löschen prüfen** — Im Supabase Dashboard unter "Live" die Tabelle `templates` auf tatsächliche Nutzung prüfen. Die `game_sessions`-Tabelle zeigt, welche Fragen-Quellen (`question_source`) in den letzten Sessions genutzt wurden.

2. **Edge Functions: Erst aus `config.toml` entfernen, dann löschen** — Sonst entstehen 404-Fehler bei Cron-Jobs, die noch aktiv sind.

3. **Kein Breaking Change** — Das aktuelle Spiel (LearningGame + useQuestionPreloader + ai-question-generator) bleibt vollständig funktionsfähig während der gesamten Bereinigung. Die Phasen können unabhängig voneinander ausgeführt werden.

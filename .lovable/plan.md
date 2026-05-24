
# Plan: Schnellere & günstigere Fragen-Generierung (Fokus Deutsch)

## Beobachtungen (aus Code & DB)

- **Modell**: `question_generator` läuft auf `openrouter/free` (Auto-Router). Avg-Latenz in `ai_model_metrics` ist zwar ~1,2 s, aber Free-Modelle haben sehr hohe P95/P99 (Warteschlange, gelegentlich 30–60 s+) — das erklärt die gemeldeten Hänger.
- **Sequentieller Preload**: `PARALLEL_BATCH_SIZE = 1` in `useQuestionPreloader.ts` — alle 5 Fragen werden nacheinander generiert.
- **Cache wird nur als Fallback genutzt**, nicht als Erstquelle. Es liegen bereits 508 Deutsch-Fragen, 740 Mathe-Fragen etc. im `ai_question_cache`.
- **Großer Prompt**: System-Prompt + Regel-Block (5 Rules aus DB) + `excludeTexts` (bis zu 10×80 Zeichen) + Typ-Instruktionen + Scope. Pro Call viele Input-Tokens.
- **Deutsch hat häufiger FILL_BLANK/MATCH/SORT** (siehe `selectQuestionType`) — diese haben strengere Validierung in `isRenderableQuestionPayload`. Bei Fehlern → Cache-Fallback, also extra DB-Roundtrip.
- **Tool-Calls**: `tool_choice` mit Funktions-Schema ist auf Free-Modellen langsamer als reines JSON-Mode-Output.

## Ziel

P95 < 2 s pro Frage, Kosten ↓, inhaltlich korrekt, Regeln eingehalten.

---

## Phase 1 — Cache-First Strategie (größter Hebel, sofort wirksam)

In `supabase/functions/ai-question-generator/index.ts`:

1. **Cache zuerst abfragen** (statt erst nach AI-Failure).
2. Strategie pro Request:
   - 70 % Wahrscheinlichkeit → least-served Cache-Eintrag servieren (wenn ≥ 15 Einträge für `grade/subject/difficulty` vorhanden).
   - 30 % → frische Generierung via AI.
   - Wenn Cache < 15 Einträge → immer AI generieren (Cache füllen).
3. **Dedupe gegen `excludeTexts`** beim Cache-Pick: SQL `not in` oder client-seitig filtern.
4. **`times_served` & `last_served_at`** asynchron via `EdgeRuntime.waitUntil` aktualisieren — kein Wartezeit-Impact.
5. Bei `topicHint` (Lernplan) → **immer AI**, da Cache nicht themenspezifisch.

Erwarteter Effekt für Deutsch: 70 % der Anfragen antworten in < 200 ms (DB-Pick) statt 1–30 s (AI).

## Phase 2 — Modellwechsel für `question_generator`

In `ai_model_config` per Migration:
- `primary_model`: `google/gemini-2.5-flash-lite` (schnell, billig, ausreichend für Schul-Fragen)
- `provider_order`: `["gemini_direct", "openrouter", "lovable"]` — Gemini Direct hat niedrigste TTFB.
- `temperature`: 0.8 (etwas konservativer als aktuell 0.9 → weniger Validierungs-Failures).

Free-Modell bleibt als Notfall im Fallback der Edge Function (über Provider-Chain abgedeckt).

## Phase 3 — Paralleler Preload im Frontend

`src/hooks/useQuestionPreloader.ts`:
- `PARALLEL_BATCH_SIZE` von **1 → 3** erhöhen.
- Begründung: nach Cache-First sind die meisten Calls DB-Reads → kein WORKER_LIMIT-Risiko mehr.
- Q1 weiter sequentiell (blockiert UI), Q2–Q5 in einem Batch parallel.

Erwarteter Effekt: Gesamt-Preload-Zeit für 5 Fragen von 5–15 s → 1–4 s.

## Phase 4 — Prompt-Schlankheit

In `buildQuestionPrompt`:
- `excludeTexts` von max 10 → **max 5** Einträge, jeweils auf 50 Zeichen kürzen.
- Regel-Block (`prompt_rules`) von 5 → **3** Regeln laden (sind ohnehin nach Relevanz sortiert).
- `subjectScope` redundant zu `gradeGuidelines` an mehreren Stellen → einmal zusammenfassen.
- Erwartung: −30 % Prompt-Tokens, schnellere TTFB.

## Phase 5 — Hintergrund-Refill des Caches

Wenn Cache-First greift und `times_served` für gewählten Eintrag jetzt > 5 ist UND Cache-Größe für `grade/subject/difficulty` < 30:
- Via `EdgeRuntime.waitUntil` einen Generierungs-Call anstoßen (nicht blockierend für User-Response).
- So wächst der Cache organisch dort, wo er gebraucht wird.

## Technische Details

**Geänderte Dateien**
- `supabase/functions/ai-question-generator/index.ts` (Cache-First-Logik, Refill)
- `src/hooks/useQuestionPreloader.ts` (PARALLEL_BATCH_SIZE=3, excludeTexts kürzen)
- Neue DB-Migration: Update `ai_model_config` für `question_generator`
- (Optional) Index `ai_question_cache (grade, subject, difficulty, times_served)` falls noch nicht vorhanden

**Risiken / Mitigationen**
- Cache-Fragen können sich wiederholen → `excludeTexts` + `seenTextsRef` im Client + `order by times_served asc` + zufällige Auswahl aus den 10 wenigst-genutzten.
- Qualität: bestehende Cache-Fragen wurden früher mit voller Validierung erzeugt → unverändert valide.
- Lernplan-Modus (`topicHint`) bleibt 100 % AI → kein Qualitätsverlust dort.

## Rollout

1. Migration (Modell-Config) + Code-Änderung Edge Function deployen.
2. Frontend Preloader-Batch-Size hochsetzen.
3. 24 h `ai_model_metrics` beobachten (Latenz, Erfolgsrate); Cache-Hit-Rate via neues Log-Feld messen.
4. Bei Erfolg: 70/30-Verhältnis nachjustieren (z. B. 80/20 für hohe Volumen-Klassen).

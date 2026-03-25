

## Diagnose

**Cache-Bestand ist unzureichend für Cache-First:**

| Grade | Gut bestückt | Lückenhaft/leer |
|-------|-------------|-----------------|
| 1 | math (163) | german (15), science (23) |
| 2 | math (133) | english (19), german (19), rest <10 |
| 3 | math (205), german (98) | - |
| 4 | **komplett leer** | alle Fächer |
| 5 | german (59) | math (14), rest <6 |
| 6 | geography (300), german (72), history (64) | rest <41 |
| 7-10 | **fast komplett leer** | nur 1 history-Frage in Kl.7 |

Cache-First würde für ~60% der Kombinationen sofort scheitern oder endlos die gleichen Fragen wiederholen.

**Wahre Ursache des Ladeproblems:** 5 parallele Edge-Function-Aufrufe × 3 Retries × 2 Modelle = bis zu 30 AI-Calls gleichzeitig → WORKER_LIMIT / 402 Fehler.

## Plan: AI-First beibehalten, Last reduzieren

### 1. Edge Function vereinfachen (`ai-question-generator/index.ts`)

- **Retry-Loop von 3×2=6 auf 1 Versuch reduzieren**: `callAI` hat bereits eingebauten Lovable→Gemini-Fallback. Bei Fehlschlag direkt zum bestehenden Cache-Fallback.
- Validierung und Normalisierung (`isRenderableQuestionPayload`, `tryParseStructuredValue`, MATCH/SORT-Rekonstruktion) bleiben vollständig erhalten.
- Gesamtlänge sinkt von ~939 auf ~700 Zeilen.

### 2. Preloader entschärfen (`useQuestionPreloader.ts`)

- **Erste Frage einzeln laden** (wie bisher), dann restliche Fragen in **Batches von 2** statt alle 4 gleichzeitig.
- **Timeout von 20s auf 30s erhöhen** (Gemini-Fallback braucht Zeit).
- Gesamte Normalisierungs- und Renderability-Logik bleibt unverändert.

### 3. Konkreter Ablauf

```text
Client: Frage 1 laden (einzeln, 30s Timeout)
  → Edge Function: 1x callAI → Erfolg? Zurückgeben + Cache-Write
                               → Fehlschlag? Cache-Fallback (least-served)
Client: Frage 1 anzeigen, isInitialLoading = false
Client: Fragen 2+3 parallel laden (Batch 1)
Client: Fragen 4+5 parallel laden (Batch 2)
```

Maximale gleichzeitige Edge-Function-Aufrufe: **2** (statt 5).
Maximale AI-Calls pro Request: **1** (statt 6).
Worst-Case gesamt: 5 sequentielle Requests statt 30 parallele.

### Dateien

| Datei | Änderung |
|-------|----------|
| `supabase/functions/ai-question-generator/index.ts` | Retry-Loop auf 1 Versuch, Rest bleibt |
| `src/hooks/useQuestionPreloader.ts` | Batch-Loading (max 2 parallel), 30s Timeout |

### Was NICHT geändert wird
- `LearningGame.tsx` (Rendering funktioniert)
- `normalizeQuestionPayload`, `isQuestionRenderable` im Preloader
- `callAI` shared client
- Cache-Prefill und Cleanup Funktionen


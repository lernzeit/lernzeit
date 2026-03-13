

## Plan: Fachspezifische adaptive Schwierigkeit mit Difficulty-Mix statt Maximum

### Zusammenfassung
Statt bei guten Schülern permanent auf "hard" zu gehen, wird ein **Difficulty-Mix** verwendet: Der `difficultyLevel` (0.0–1.0) bestimmt die **Wahrscheinlichkeit** für schwere Fragen (max 80%). Der Anstieg ist langsamer als die Herabsenkung. Das System ist pro Fach separat, da `user_difficulty_profiles` bereits per `category` gespeichert wird.

### Änderungen

#### 1. `analyze-feedback/index.ts` — `too_hard`/`too_easy` aus Clustering ausschließen
- Beim Clustering (Zeile 88–107) Feedbacks mit `feedback_type === 'too_hard'` oder `'too_easy'` überspringen
- Diese werden weiterhin in der DB gespeichert und als `analyzed_at` markiert, aber erzeugen keine globalen Prompt-Regeln

#### 2. `useAdaptiveDifficultySystem.ts` — Asymmetrische Anpassung + Difficulty-Mix
- **Langsamerer Anstieg**: Positive Adjustments um Faktor 0.6 reduzieren (z.B. +0.1 → +0.06)
- **Schnellere Herabsenkung**: Negative Adjustments bleiben wie bisher
- **Neue Funktion `selectDifficultyForQuestion()`**: Statt direkt den Level als Difficulty zu mappen, einen **probabilistischen Mix** verwenden:

```text
difficultyLevel 0.8 → 80% hard, 15% medium, 5% easy
difficultyLevel 0.5 → 20% hard, 60% medium, 20% easy  
difficultyLevel 0.2 → 5% hard, 15% medium, 80% easy
```

- Max Hard-Quote: 80% (nie 100% schwere Fragen)
- Exportiere `selectDifficultyForQuestion()` als neue Methode

#### 3. `LearningGame.tsx` — Adaptive System integrieren
- `useAdaptiveDifficultySystem(subject, grade, user.id)` importieren und aufrufen
- Initiale Difficulty aus `getRecommendedDifficulty()` laden statt hardcoded `'medium'`
- Bei jeder Antwort `updatePerformance(isCorrect, responseTimeMs)` aufrufen
- `selectDifficultyForQuestion()` nutzen statt der bisherigen manuellen Difficulty-Logik (Zeilen 336–348, 380–381)
- `applyUserFeedback` als `onQuestionFeedback`-Handler an `GameFeedback` durchreichen
- Am Ende der Session `performAdaptiveAdjustment()` aufrufen → Profil wird per Fach in `user_difficulty_profiles` persistiert
- Bisherige hardcoded Difficulty-Progression im Preloader (Zeile 156: `['medium', 'medium', 'easy', 'medium', 'hard']`) durch adaptive Werte ersetzen

#### 4. `useQuestionPreloader.ts` — Difficulty-Array von außen akzeptieren
- Neuer optionaler Parameter `difficultySequence?: ('easy' | 'medium' | 'hard')[]`
- Wenn gesetzt, diese statt der hardcoded Sequenz verwenden

### Fachspezifisches Verhalten
Die Tabelle `user_difficulty_profiles` hat bereits die Spalten `user_id`, `category`, `grade` mit Unique-Constraint-Verhalten über Upsert. Jedes Fach hat sein eigenes Profil — kein Schema-Change nötig.

### Betroffene Dateien
- `supabase/functions/analyze-feedback/index.ts`
- `src/hooks/useAdaptiveDifficultySystem.ts`
- `src/components/LearningGame.tsx`
- `src/hooks/useQuestionPreloader.ts`


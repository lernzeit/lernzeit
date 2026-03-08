

# Lernplan als "Fach" in der Fächerauswahl anzeigen

## Überblick
Wenn ein Kind einen aktiven Lernplan hat (Testdatum in der Zukunft oder heute), wird dieser als erste Karte in der Fächerauswahl (CategorySelector) angezeigt. Bei Klick darauf startet das Lernspiel mit thematisch passenden Fragen zum Lernplan-Thema.

## Technische Umsetzung

### 1. RLS-Policy: Kinder dürfen eigene Lernpläne lesen
Migration:
```sql
CREATE POLICY "Children can view their own learning plans"
  ON learning_plans FOR SELECT
  USING (auth.uid() = child_id);
```

### 2. CategorySelector erweitern
- Aktive Lernpläne laden: Query auf `learning_plans` wo `child_id = user.id` und `test_date >= today` (oder `test_date IS NULL`), sortiert nach `test_date ASC`, limit 1.
- Vor der normalen Fächerliste eine spezielle "Lernplan"-Karte rendern mit:
  - Sparkles-Icon, lila/gold Gradient
  - Thema + Testdatum ("Bruchrechnung — Test am 15.03.")
  - Fach-Badge + "KI-Lernplan" Label
- `onCategorySelect` wird erweitert: Neuer Callback `onLearningPlanSelect(plan)` als optionaler Prop, oder wir übergeben das Thema als Metadaten.

### 3. Thema an den Frage-Generator weitergeben
**Neuer Flow**: CategorySelector → Index.tsx → LearningGame → useQuestionPreloader → Edge Function

- **CategorySelector**: Bei Klick auf Lernplan-Karte wird ein neuer Callback aufgerufen, z.B. `onCategorySelect(plan.subject)` plus ein neuer State `topicHint` im Index.
- **Index.tsx**: Neuer State `learningPlanTopic: string | null`. Wird beim Lernplan-Klick gesetzt und an `LearningGame` als neuer optionaler Prop `topicHint` weitergereicht.
- **LearningGame**: Nimmt `topicHint?: string` als Prop entgegen, gibt es an `useQuestionPreloader` weiter.
- **useQuestionPreloader**: Neuer optionaler Parameter `topicHint`. Wird im Body an die Edge Function übergeben.
- **Edge Function `ai-question-generator`**: Liest `topicHint` aus dem Body. Wenn vorhanden, wird es in den Prompt eingebaut: `"Fokussiere die Frage auf das Thema: ${topicHint}"`. So generiert die KI Fragen passend zum Lernplan-Schwerpunkt.

### 4. Dateien

| Datei | Änderung |
|---|---|
| Migration (neu) | RLS-Policy für Kind-Zugriff |
| `src/components/CategorySelector.tsx` | Lernplan laden + als erste Karte anzeigen |
| `src/pages/Index.tsx` | `learningPlanTopic` State, an LearningGame weiterreichen |
| `src/components/LearningGame.tsx` | `topicHint` Prop annehmen, an Preloader geben |
| `src/hooks/useQuestionPreloader.ts` | `topicHint` Parameter, im Request-Body senden |
| `supabase/functions/ai-question-generator/index.ts` | `topicHint` aus Body lesen, in Prompt einbauen |

### 5. UI-Verhalten
- Lernplan-Karte erscheint nur wenn ein aktiver Plan existiert (Testdatum heute oder in Zukunft)
- Visuell abgehoben: Gradient-Border, Sparkles-Icon, "📋 Dein Lernplan" Titel
- Zeigt: Thema, Fach, Testdatum, welcher Tag heute dran ist (berechnet aus `created_at`)
- Klick → normaler Flow: SessionLengthSelector → LearningGame (mit topicHint)


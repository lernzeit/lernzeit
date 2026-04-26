# Plan: Flexible KI-Modell-Konfiguration über Admin-Dashboard

## Ziel
Pro Use-Case (Fragen-Generator, KI-Tutor, Erklärung, Antwort-Validierung, Lernplan, Feedback-Analyse) das Modell **und** die Provider-Reihenfolge im Admin-Dashboard wählen können. OpenRouter als gleichwertiger Provider (nicht nur Fallback). Live-Metriken (Latenz, Erfolgsrate, geschätzte Kosten) zur Entscheidungsunterstützung.

---

## Phase 1 — Datenbank

### Tabelle `ai_model_config`
Eine Zeile pro Use-Case mit Primär-Modell + Provider-Reihenfolge.

| Spalte | Typ | Zweck |
|---|---|---|
| `id` | uuid PK | |
| `use_case` | text UNIQUE | `question_generator`, `ai_tutor`, `ai_explain`, `validate_answer`, `validate_question`, `learning_plan`, `analyze_feedback` |
| `display_name` | text | UI-Label (z.B. „Fragen-Generator") |
| `primary_model` | text | z.B. `google/gemini-2.5-flash`, `anthropic/claude-sonnet-4`, `openai/gpt-4o-mini` |
| `fallback_models` | jsonb | Array `[{provider, model}]` für Notfall-Modellwechsel |
| `provider_order` | jsonb | Reihenfolge, z.B. `["openrouter","gemini_direct","lovable"]` |
| `temperature` | numeric | Optional override |
| `is_active` | boolean default true | Use-Case ein/ausschalten |
| `updated_at` | timestamptz | |

**RLS:** SELECT für authenticated, ALL nur für `has_role(auth.uid(),'admin')`. Service-Role darf alles.

### Tabelle `ai_model_metrics`
Append-only Log jedes Calls.

| Spalte | Typ |
|---|---|
| `id` | uuid PK |
| `use_case` | text |
| `provider` | text (`gemini_direct` / `openrouter` / `lovable`) |
| `model` | text (echtes aufgerufenes Modell) |
| `status_code` | int |
| `success` | boolean |
| `latency_ms` | int |
| `prompt_tokens` / `completion_tokens` | int (sofern in Response) |
| `estimated_cost_usd` | numeric (aus statischer Preistabelle) |
| `error_type` | text nullable |
| `created_at` | timestamptz default now() |

Index auf `(use_case, created_at desc)` und `(model, created_at desc)`.

**RLS:** SELECT nur für Admins. INSERT nur Service-Role.

### Seed
Migration legt für jeden bestehenden Use-Case eine Default-Zeile an, damit bei erstem Deploy nichts bricht (Werte aus aktuellem Code: `gemini-3-flash-preview` etc.).

---

## Phase 2 — Modell-Katalog (im Code)

Neue Datei `supabase/functions/_shared/model-catalog.ts`:
- `RECOMMENDED_MODELS: ModelInfo[]` — kuratierte Liste mit `{id, label, provider_native, openrouter_id, gemini_id, input_price_per_1m, output_price_per_1m, supports_tools, recommended_for: string[]}`
- Enthält: Gemini 2.5 Flash/Pro/Lite, Gemini 3 Flash Preview, Claude Sonnet 4 / Haiku, GPT-4o-mini / GPT-4o, Llama 3.3 70B, Gemma 3 12B/27B, DeepSeek V3, Mistral Large
- Hilfsfunktionen: `getModelInfo(id)`, `estimateCost(model, promptTokens, completionTokens)`

Frontend liest dieselbe Liste über eine kleine Edge Function `get-model-catalog` (oder als statisches TS-Modul, dupliziert, aber simpel).

---

## Phase 3 — `ai-client.ts` umbauen

### Änderungen
1. **Neuer Parameter** `useCase: string` in `callAI(options, signal, useCase)`.
2. Beim Aufruf:
   - Lade Config aus DB (mit 60s In-Memory-Cache pro Edge-Function-Instance, um Latenz zu sparen).
   - Bestimme `provider_order` aus Config (statt hardcodiert Gemini→OpenRouter→Lovable).
   - Verwende `primary_model` aus Config statt `options.model` (Backward-Compat: wenn DB-Lookup fehlschlägt, nutze `options.model`).
3. **OpenRouter-Branch generalisieren**: Statt fix `OPENROUTER_MODEL_MAP` zu verwenden, wird das Modell direkt aus der Config übernommen. Wenn das Primär-Modell ein Nicht-Google-Modell ist (z.B. `anthropic/claude-…`), überspringt der `gemini_direct`-Branch automatisch und geht zu OpenRouter.
4. **Telemetrie**: Vor jedem Provider-Call `start = Date.now()`, nach Response `logMetric({ use_case, provider, model, status_code, success, latency_ms, tokens })`. Insert läuft fire-and-forget (kein `await`), damit User-Latenz nicht steigt.
5. **Fallback-Models**: Wenn Primär-Modell innerhalb eines Providers 4xx/5xx liefert (außer 429), versuche optional ein konfiguriertes `fallback_models[i]`-Eintrag, bevor zum nächsten Provider gewechselt wird.

### Migration der existierenden Edge Functions
Alle 7 Aufrufer (`ai-tutor`, `ai-question-generator`, `ai-explain`, `validate-answer`, `validate-question`, `generate-learning-plan`, `analyze-feedback`) bekommen einen `useCase`-String:
```ts
await callAI({ messages, temperature, tools }, signal, 'question_generator');
```
Das hardcoded `model:` Feld kann entfallen (oder bleibt als Default, falls DB-Config fehlt).

---

## Phase 4 — Admin-Dashboard UI

Neuer Tab **„KI-Modelle"** in `AdminDashboard.tsx` (neben „Übersicht", „Cache", „Regeln").

### Komponente `AIModelConfigPanel.tsx`
- Tabelle: eine Zeile pro Use-Case
- Spalten: Use-Case, Primär-Modell (Dropdown aus Katalog **+ Freitext-Eingabe**), Provider-Reihenfolge (drag-and-drop oder 3 Selects), Temperature, Aktiv-Toggle, „Test"-Button
- Speichern → Update via Supabase JS auf `ai_model_config`
- „Test"-Button ruft Edge Function `test-ai-model` auf, die einen kurzen Prompt schickt und Latenz/Antwort zurückgibt

### Komponente `AIModelMetricsPanel.tsx`
- Filter: Zeitraum (24h / 7d / 30d), Use-Case, Modell
- KPI-Cards: Calls gesamt, Erfolgsrate %, Ø Latenz, geschätzte Kosten
- Recharts-Diagramm: Latenz pro Modell über Zeit + Erfolgsrate-Stacked-Bar
- Tabelle „Top-Fehler" (gruppiert nach `error_type`)
- Daten via Supabase RPC `get_model_metrics(use_case, since)` (server-aggregiert, sonst sprengt 1000-row-Limit)

---

## Phase 5 — Test & Rollout

1. Migration ausführen, Default-Configs eintragen → bestehendes Verhalten unverändert.
2. `ai-client.ts` deployen, eine Edge Function (z.B. `ai-explain`) als Erstes umstellen, Logs prüfen.
3. Restliche 6 Edge Functions umstellen.
4. Admin-UI freischalten, Modellwechsel live testen.
5. Nach 1 Woche Telemetrie auswerten und ggf. Defaults anpassen.

---

## Offene Punkte / Annahmen
- **Kosten-Schätzung** basiert auf statischer Preistabelle im Code (Stand heute). Aktualisierung manuell, falls Anbieter Preise ändern.
- **Token-Zählung**: Kommt aus `usage`-Feld der API-Response (verfügbar bei OpenRouter, Gemini-OpenAI-Endpoint, Lovable). Falls nicht vorhanden → `null`.
- **Caching der Config**: 60s In-Memory pro Edge-Function-Instance. Modellwechsel im Admin sind also nach max. 60s wirksam (für Sofort-Wirkung könnte ein „Reload"-Button die Config-Version inkrementieren — optional, würde Komplexität erhöhen).

## Geänderte / neue Dateien
- **DB-Migration**: `ai_model_config`, `ai_model_metrics` + RPC `get_model_metrics`
- **Neu**: `supabase/functions/_shared/model-catalog.ts`, `supabase/functions/_shared/model-config.ts`, `supabase/functions/test-ai-model/index.ts`, `src/components/admin/AIModelConfigPanel.tsx`, `src/components/admin/AIModelMetricsPanel.tsx`, `src/lib/modelCatalog.ts`
- **Geändert**: `supabase/functions/_shared/ai-client.ts`, alle 7 KI-Edge-Functions, `src/components/admin/AdminDashboard.tsx`

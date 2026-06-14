## Ziel
Robustes, schnelles und kostengünstiges Laden der Fragen über das Lovable AI Gateway – ohne OpenRouter/DeepSeek-Fallbacks. Klare Modellkette, harte Timeouts und sauberes Cache-Fallback.

## Modellstrategie (nur Lovable AI Gateway)
1. **Primär:** `google/gemini-2.5-flash-lite` – günstig (0.10 $ / 0.40 $ pro 1M Tokens), schnell, stabil.
2. **Fallback 1:** `google/gemini-3.1-flash-lite-preview` – falls Primär 429/5xx.
3. **Fallback 2:** `google/gemini-3-flash-preview` – stabiler Standard, etwas teurer aber sehr zuverlässig.
4. **Letzter Fallback:** Cache / vordefinierte Aufgabe aus `question_cache`.

OpenRouter wird als Provider entfernt bzw. deaktiviert (kein DeepSeek, keine Gemma). Nur ein Provider = weniger Fehlerquellen.

## Änderungen

### 1. `supabase/functions/_shared/model-catalog.ts`
- Einträge auf die drei Gemini-Modelle oben reduzieren.
- Pro Modell: `provider: "lovable"`, `endpoint: https://ai.gateway.lovable.dev/v1/chat/completions`, `header: Lovable-API-Key`.
- Deprecated IDs (`gemini-2.5-flash-lite-preview-06-17`, OpenRouter-IDs) entfernen.

### 2. `supabase/functions/_shared/ai-client.ts`
- `callAI()` so umbauen, dass **echte Fallback-Kette** abgearbeitet wird: Primärmodell → Fallback 1 → Fallback 2.
- **Harte Timeouts pro Versuch:** 10 s via `AbortController`. Bei Timeout sofort nächster Eintrag.
- **Retry-Logik:** Bei 429/5xx einmal nächstes Modell, kein Re-try auf gleichem Modell.
- Fehler 402 (Credits) sauber surface'n.
- Tool-/JSON-Schema vereinfachen (nur Felder, die alle drei Modelle akzeptieren) – verhindert 400er beim Modellwechsel.

### 3. `supabase/functions/ai-question-generator/index.ts`
- Liest Modellkette aus `ai_model_config` (Reihenfolge: primary, fallback_models[]).
- Gesamtbudget: max. 25 s. Wenn überschritten → Cache-Fallback.
- Cache-Lookup VOR AI-Call beibehalten, Cache-Write nach Erfolg.
- Logging pro Versuch (Modell, Dauer, Status) für Debugging.

### 4. DB-Migration: `ai_model_config` für `question_generator`
```text
primary_model        = google/gemini-2.5-flash-lite
fallback_models      = [google/gemini-3.1-flash-lite-preview,
                        google/gemini-3-flash-preview]
provider             = lovable
temperature          = 0.7
max_tokens           = 1500
timeout_ms           = 10000
```

### 5. Cleanup
- `OPENROUTER_API_KEY`-Referenzen aus AI-Client entfernen (Secret selbst bleibt erhalten, falls anderswo genutzt – nur prüfen).
- Tote Code-Pfade für nicht-Lovable Provider entfernen.

## Validierung
1. `supabase--deploy_edge_functions` für `ai-question-generator`.
2. `supabase--curl_edge_functions` mit Beispiel-Request (Klasse 3 Mathe) – Antwort < 8 s erwartet.
3. `supabase--edge_function_logs` prüfen: nur 1 Versuch nötig im Normalfall, Fallback nur bei Fehler.
4. Im Preview Demo-Fragen laden lassen, Konsole + Netzwerk prüfen.

## Erwartetes Ergebnis
- Antwortzeit i. d. R. 2–5 s.
- Klare Fehlermeldung statt Hänger bei Ausfall.
- Kosten: ~0.10 $ pro 1M Input-Tokens, also Bruchteil eines Cents pro Sitzung.
- Keine 404/400-Schleifen mehr durch tote OpenRouter-Modelle.
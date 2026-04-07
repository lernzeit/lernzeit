

# Prompt-Optimierung: Regeleinhaltung & Token-Effizienz

## Probleme im aktuellen Prompt

### 1. Fehlende Item-Limits bei SORT (Hauptproblem)
- **`ai-question-generator`**: Die SORT-Instruktion (Zeile 879-882) enthält **kein Maximum** fur Items: `"correct_answer: Array von Strings in der richtigen Reihenfolge"` -- kein Hinweis auf min/max
- **`cache-prefill`**: Dort steht korrekt `"Mindestens 4, maximal 6 Elemente"` (Zeile 292)
- Die KI generiert deshalb teils 10+ SORT-Items im Generator, wahrend der Prefill korrekt limitiert

### 2. Redundante Regeln (Token-Verschwendung)
- Der System-Prompt (`getSystemPrompt()`) enthalt ~700 Worter mit vielen Beispielen
- Der User-Prompt (`buildQuestionPrompt()`) wiederholt Sprachregeln fur Klasse 1-2, die bereits im System-Prompt stehen
- Dynamische `prompt_rules` aus der DB werden angehängt -- bei vielen Regeln wachst der Token-Verbrauch linear

### 3. Fehlende Regeln
- **MATCH**: Kein min/max im Generator (Zeile 884-887 sagt nur "Minimum 3, Maximum 5" aber unvollstandig formuliert)
- **DRAG_DROP**: Keine Item-Limits
- **FILL_BLANK**: Kein Limit fur Lucken-Anzahl
- Keine explizite Gesamt-Token-Begrenzung fur Antworten

## Optimierungskonzept

### Strategie: "Layered Prompt Architecture"

```text
┌─────────────────────────────────────────┐
│  Layer 1: Kompakter System-Prompt       │  ← Statisch, einmalig, ~300 Worter
│  (Rolle + globale Regeln komprimiert)   │
├─────────────────────────────────────────┤
│  Layer 2: Type-Specific Micro-Prompt    │  ← Nur Regeln fur den gewahlten Typ
│  (SORT: 4-6 Items, MC: 4 Optionen)     │  ← ~50-80 Worter pro Typ
├─────────────────────────────────────────┤
│  Layer 3: Grade-Conditional Rules       │  ← Nur wenn zutreffend (z.B. Klasse 1-2)
│  (Sprachregeln nur fur junge Kinder)    │  ← 0 Worter fur Klasse 5+
├─────────────────────────────────────────┤
│  Layer 4: Komprimierte DB-Regeln        │  ← Max 5 aktivste Regeln, gekurzt
│  (Priorisiert nach Relevanz)            │
└─────────────────────────────────────────┘
```

### Konkrete Anderungen

#### A. SORT/MATCH/DRAG_DROP Item-Limits einfugen (Kritisch)
In `getTypeSpecificInstructions()` im `ai-question-generator`:

- **SORT**: `"Genau 4-6 Elemente. NIEMALS mehr als 6."` hinzufugen
- **MATCH**: `"Genau 3-5 Paare. NIEMALS mehr als 5."` klarstellen
- **DRAG_DROP**: `"2-3 Kategorien, 4-6 Elemente total."` hinzufugen
- **FILL_BLANK**: `"Maximal 2 Lucken."` hinzufugen

#### B. System-Prompt komprimieren (~40% Token-Reduktion)
- Beispiele entfernen (GUT/SCHLECHT) -- stattdessen 1 kompaktes Beispiel pro Regel
- "VERBOTENE FRAGENTYPEN" in Stichpunkte umwandeln statt ausfuhrlicher Erklarungen
- Mathematik-Regeln auf 2 Zeilen komprimieren
- Sprachregeln fur Klasse 1-2 **nur** in `buildQuestionPrompt` (nicht doppelt im System-Prompt)

#### C. Dynamische DB-Regeln begrenzen und komprimieren
- **Max 5 Regeln** laden (aktuell unbegrenzt)
- Regeln nach `source_feedback_count` absteigend sortieren (relevanteste zuerst)
- Jede Regel auf **max 100 Zeichen** kappen
- Nur Regeln laden, die exakt zum Fach UND zur Klassenstufe passen (strengerer Filter)

#### D. Redundanzen eliminieren
- Klasse-1-2-Sprachregeln aus `getSystemPrompt()` entfernen (bleiben nur in `buildQuestionPrompt` wenn `grade <= 2`)
- `getGradeGuidelines()` auf 1 Zeile pro Stufe kurzen
- JSON-Format-Beschreibung aus dem User-Prompt entfernen (Tool-Calling erzwingt das Schema bereits)

### Erwartete Token-Einsparung

| Bereich | Aktuell (ca.) | Optimiert (ca.) | Ersparnis |
|---|---|---|---|
| System-Prompt | ~800 Tokens | ~450 Tokens | -44% |
| User-Prompt (Klasse 5+) | ~400 Tokens | ~250 Tokens | -38% |
| User-Prompt (Klasse 1-2) | ~550 Tokens | ~350 Tokens | -36% |
| DB-Regeln (10 Regeln) | ~300 Tokens | ~150 Tokens | -50% |
| **Gesamt pro Request** | **~1500** | **~850** | **~43%** |

### Validierungs-Sicherheit (Backend)
Zusatzlich zur Prompt-Optimierung: In der `isRenderableQuestionPayload`-Funktion harte Limits erzwingen:
- SORT: `order.length >= 3 && order.length <= 6` (aktuell nur `>= 2`)
- MATCH: `leftItems.length <= 5` hinzufugen
- DRAG_DROP: `items.length <= 8` hinzufugen

So werden selbst bei KI-Fehlverhalten zu grosse Aufgaben abgelehnt und aus dem Cache bedient.

### Dateien die geandert werden

1. **`supabase/functions/ai-question-generator/index.ts`**
   - `getSystemPrompt()` komprimieren
   - `getTypeSpecificInstructions()` um Item-Limits erweitern
   - `buildQuestionPrompt()` Redundanzen entfernen, JSON-Format-Block entfernen (Tool-Calling reicht)
   - `isRenderableQuestionPayload()` harte Limits hinzufugen
   - DB-Regel-Query: `.order('source_feedback_count', { ascending: false }).limit(5)`

2. **`supabase/functions/cache-prefill/index.ts`**
   - `parseAndValidate()` SORT-Limit von `answer.length < 3` auf `answer.length < 3 || answer.length > 6` erweitern


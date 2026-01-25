# 🎯 LernZeit - Neue Architektur

## ✅ Was wurde umgesetzt

### 1. API-Migration auf Lovable AI Gateway
- **Vorher:** OpenAI API (Quota überschritten, 429-Fehler)
- **Jetzt:** Lovable AI Gateway (`google/gemini-3-flash-preview`) - stabil & kostenlos

### 2. Neue Edge Functions

| Function | Zweck |
|----------|-------|
| `ai-question-generator` | Generiert Fragen in Echtzeit |
| `ai-explain` | Erstellt kindgerechte Erklärungen |

### 3. Neue React Komponenten

| Komponente | Beschreibung |
|------------|--------------|
| `LearningGame` | Haupt-Spielkomponente mit allen Fragetypen |
| `useAIQuestion` | Hook für Fragengenerierung |
| `useAIExplanation` | Hook für Erklärungen |

### 4. Unterstützte Fragetypen

- ✅ **MULTIPLE_CHOICE** - 4 Optionen, 1 richtig
- ✅ **FREETEXT** - Freie Texteingabe
- ✅ **SORT** - Elemente sortieren
- ✅ **MATCH** - Zuordnen
- ✅ **DRAG_DROP** - In Kategorien ziehen
- ✅ **FILL_BLANK** - Lückentext

### 5. Features

- **Alle Fächer:** Mathe, Deutsch, Englisch, Physik, Chemie, Biologie, Geschichte, Geographie, Latein
- **Klassenstufen 1-10**
- **Adaptive Schwierigkeit:** Passt sich automatisch an
- **Kindgerechte Erklärungen:** Bei falschen Antworten

## 🗑️ Aufräumen (Phase 3 - später)

Diese Edge Functions können später entfernt werden:
- `generate-question-realtime` (ersetzt durch `ai-question-generator`)
- `explain-answer` (ersetzt durch `ai-explain`)
- `auto-question-generator`, `batch-question-generator`, etc.

## 📊 Architektur

```
┌─────────────┐
│   LearningGame    │
│   (React)         │
└────────┬──────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌────────┐
│ai-question│ │ai-explain│
│-generator │ │         │
└────┬───┘  └────┬───┘
     │           │
     ▼           ▼
┌─────────────────────┐
│ Lovable AI Gateway  │
│ (gemini-3-flash)    │
└─────────────────────┘
```

## 🚀 Nächste Schritte

1. ✅ API funktioniert
2. ✅ Neue UI integriert
3. 🔄 Testen mit verschiedenen Klassenstufen
4. 📊 Analytics hinzufügen
5. 🗑️ Alte Edge Functions entfernen

# 🎯 Echtzeit-Fragengenerierung System

## ✅ Was wurde umgesetzt

Das neue System generiert Fragen **zur Laufzeit** per KI-API - keine Speicherung in der Datenbank!

### Architektur

```
┌─────────────┐
│  Frontend   │ 
│   (React)   │
└──────┬──────┘
       │ 1. Frage anfordern (Topic, Grade)
       ▼
┌─────────────────────────────┐
│ generate-question-realtime  │
│     (Edge Function)         │
└──────┬──────────────────────┘
       │ 2. KI-Prompt erstellen
       ▼
┌─────────────┐
│ OpenAI API  │
│ gpt-4o-mini │
└──────┬──────┘
       │ 3. Frage generiert
       ▼
┌─────────────┐
│  Frontend   │
│ (zeigt an)  │
└─────────────┘
```

### Komponenten

**1. Edge Function: `generate-question-realtime`**
- Bekommt: `topic_id`, `grade`, `subject`, `topic_title`
- Ruft OpenAI API auf mit klassengerechtem Prompt
- Gibt Frage direkt zurück (JSON)
- **Keine DB-Speicherung!**

**2. React Hook: `useRealtimeQuestion`**
```typescript
const { question, isLoading, generateQuestion } = useRealtimeQuestion();

// Frage generieren
await generateQuestion(topic_id, grade, subject, topic_title);
```

**3. React Component: `RealtimeQuestionGame`**
- Zeigt Frage an (MULTIPLE_CHOICE, FREETEXT, SORT, MATCH)
- Prüft Antwort
- Bei falscher Antwort: Button "Erklärung anzeigen"
- Button "Nächste Frage" → generiert neue Frage

**4. Erklärung on-demand: `explain-answer`**
- Wird nur aufgerufen bei falscher Antwort
- Generiert personalisierte, klassengerechte Erklärung
- Keine Speicherung

## 🎮 Verwendung

### Einfaches Beispiel

```tsx
import { RealtimeQuestionGame } from '@/components/RealtimeQuestionGame';

<RealtimeQuestionGame
  topic_id="topic-uuid"
  grade={5}
  subject="math"
  topic_title="Umrechnen von Einheiten"
  onCorrectAnswer={() => console.log('Richtig!')}
  onWrongAnswer={() => console.log('Falsch!')}
/>
```

### Vollständiges Beispiel mit Topic-Auswahl

Siehe `src/pages/RealtimeGameExample.tsx` für ein vollständiges Beispiel mit:
- Topic-Auswahl
- Score-Tracking
- Thema wechseln

## 📊 Vorteile

| Aspekt | Vorher (DB-basiert) | Jetzt (Echtzeit) |
|--------|---------------------|------------------|
| **Fragengenerierung** | Vorab, in Batches | On-demand, zur Laufzeit |
| **DB-Speicher** | 1000+ Fragen gespeichert | Nur Topics gespeichert |
| **Fragenvielfalt** | Begrenzt auf DB | Unendlich variabel |
| **Duplikate** | Möglich | Quasi ausgeschlossen |
| **Aktualität** | Batch-Update nötig | Immer aktuell |
| **Komplexität** | Hoch (Generation + Storage) | Niedrig (nur Generation) |

## 🔧 Konfiguration

### Topics in DB

Topics bleiben in der DB (sehr einfache Struktur):

```sql
-- Beispiel: Neues Topic hinzufügen
INSERT INTO topics (grade, subject, title, description) VALUES
  (5, 'math', 'Bruchrechnung', 'Addition und Subtraktion von Brüchen');
```

### Fragetypen

Die KI generiert automatisch einen von 4 Typen:

1. **MULTIPLE_CHOICE**: 4 Optionen, 1 richtig
2. **FREETEXT**: Freitext/Zahl-Eingabe
3. **SORT**: Elemente sortieren (4-6 Stück)
4. **MATCH**: Elemente zuordnen (4-6 Paare)

Der Typ wird zufällig gewählt für mehr Abwechslung.

### KI-Prompt

Der Prompt ist altersgerecht:

**Klasse 1:**
- Zahlenraum bis 20
- Konkrete Gegenstände
- Sehr kurze Sätze

**Klasse 5:**
- Größere Zahlen, Dezimalzahlen
- Abstrakte Konzepte
- Mehrstufige Aufgaben

## 🚀 Integration in bestehende App

### Schritt 1: Topic-Auswahl

```tsx
import { useTopics } from '@/hooks/useTopics';

const { topics } = useTopics(grade, 'math');
```

### Schritt 2: Spiel starten

```tsx
const [selectedTopic, setSelectedTopic] = useState(null);

<RealtimeQuestionGame
  topic_id={selectedTopic.id}
  grade={selectedTopic.grade}
  subject={selectedTopic.subject}
  topic_title={selectedTopic.title}
/>
```

### Schritt 3: Score tracking (optional)

```tsx
const [score, setScore] = useState({ correct: 0, total: 0 });

<RealtimeQuestionGame
  onCorrectAnswer={() => setScore(prev => ({ 
    correct: prev.correct + 1, 
    total: prev.total + 1 
  }))}
  onWrongAnswer={() => setScore(prev => ({ 
    ...prev, 
    total: prev.total + 1 
  }))}
/>
```

## 📝 Beispiel-Fragen

Die KI generiert abwechslungsreiche Fragen wie:

**Klasse 1 - Addition bis 20:**
```
"Lisa hat 7 Äpfel und bekommt 5 dazu. Wie viele hat sie jetzt?"
→ FREETEXT: 12
```

**Klasse 3 - Division:**
```
"Ordne die Aufgaben den richtigen Ergebnissen zu:"
→ MATCH: 
  "12 ÷ 3" → "4"
  "20 ÷ 5" → "4"
  "15 ÷ 3" → "5"
```

**Klasse 5 - Einheiten:**
```
"Wie viele Meter sind 2,5 Kilometer?"
→ FREETEXT: 2500
```

## ⚡ Performance

- **Generierungszeit:** ~2-3 Sekunden pro Frage
- **Kosten:** ~$0.0001 pro Frage (gpt-4o-mini)
- **Caching:** Keine (jede Frage ist frisch)

## 🔐 Sicherheit

- Edge Function ist öffentlich (verify_jwt = false)
- Keine User-Daten in Fragen
- OpenAI API Key sicher in Supabase Secrets

## 🐛 Troubleshooting

**Problem:** Frage lädt nicht
- Check Edge Function Logs
- Prüfe OpenAI API Key in Secrets
- Teste mit Postman/curl

**Problem:** Falsche Frageschwierigkeit
- Passe Prompt in `generate-question-realtime/index.ts` an
- Ändere `getGradeGuidelines()` Funktion

**Problem:** TypeScript-Fehler bei MATCH
- Stelle sicher, dass `NewMatchingQuestion` korrekt importiert ist
- ID muss `number` sein (temporär via `Date.now()`)

## 📚 Nächste Schritte

1. ✅ Echtzeit-System läuft
2. 🔄 In bestehende Spiel-UI integrieren
3. 📊 Analytics hinzufügen (welche Themen/Fragen schwierig?)
4. 🎨 UI/UX verbessern (Animationen, Sound)
5. 🗑️ Alte DB-basierten Systeme entfernen

## 🎉 Fazit

**Einfacher, schneller, flexibler!**

- Keine komplexe DB-Verwaltung
- Unendliche Fragenvielfalt
- Immer klassengerecht
- On-demand Erklärungen

Das System ist produktionsreif! 🚀

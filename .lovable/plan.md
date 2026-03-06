

# Konzept: Feedback-Loop und intelligente Antwortprüfung

## Problemanalyse

Aus den Nutzerdaten (128 Meldungen) und deinen Beispielen ergeben sich zwei Kernprobleme:

1. **Fragengenerierung produziert ungeeignete Fragen**: Vergleichsfragen ohne konkrete Daten ("Welches Objekt ist länger?"), unsinnige Fragen ("Wie lang ist ein Bleistift, wenn er 15 cm lang ist?"), Fragen die lange Erläuterungen fordern (Klima vs. Wetter)
2. **Antwortprüfung ist zu strikt**: "Altlantik" vs. "Atlantik" wird als falsch gewertet, obwohl inhaltlich korrekt

## Lösungsansatz: Zwei Maßnahmen

### Maßnahme 1: Intelligente Antwortprüfung (AI-Recheck)

Wenn eine FREETEXT-Antwort lokal als "falsch" bewertet wird, soll ein schneller AI-Check prüfen, ob die Antwort inhaltlich trotzdem korrekt ist.

**Ablauf:**
```text
Kind gibt Antwort ein
       ↓
Lokaler String-Vergleich (wie bisher)
       ↓ falsch?
AI-Recheck via Edge Function
  "Ist 'Altlantik' eine akzeptable Antwort auf 'Atlantischer Ozean'?"
       ↓
  ja → als korrekt werten
  nein → als falsch werten (wie bisher)
```

**Technische Umsetzung:**
- Neue Edge Function `validate-answer` -- schlank, schnell, nutzt `gemini-2.5-flash-lite`
- Prüft: Tippfehler, Synonyme, umgangssprachliche Varianten, Abkürzungen
- Wird NUR bei FREETEXT aufgerufen und NUR wenn der lokale Vergleich fehlschlägt
- Timeout 5s, bei Fehler gilt die lokale Bewertung

### Maßnahme 2: Prompt-Verbesserung durch Feedback-Aggregation

Statt den Prompt manuell zu pflegen, werden die häufigsten Fehlertypen aus `question_feedback` automatisch als "Negativbeispiele" in den Prompt eingebaut.

**Ablauf:**
```text
question_feedback Tabelle
       ↓
Neues Feld: "prompt_rules" Tabelle
  (Regel-Text + Fach + Klasse + aktiv/inaktiv)
       ↓
ai-question-generator lädt aktive Regeln
       ↓
Hängt sie als "VERMEIDE DIESE FEHLER:" an den Prompt
```

**Konkrete Regeln (sofort eingebaut):**

1. **Keine offenen Erläuterungen als FREETEXT**: "Fragen, die eine ausführliche Erklärung erfordern (z.B. 'Erkläre den Unterschied zwischen...'), sind NUR als MULTIPLE_CHOICE erlaubt. FREETEXT-Antworten müssen IMMER kurz sein (1-3 Wörter oder eine Zahl)."

2. **Keine Vergleichsfragen ohne Daten**: "Vergleichsfragen ('Was ist länger?') nur stellen, wenn konkrete messbare Werte gegeben sind. NIEMALS subjektive Vergleiche ohne Zahlen."

3. **Keine Tautologien**: "Keine Fragen stellen, deren Antwort bereits in der Frage steht ('Wie lang sind 15 cm?')."

4. **Keine Emoji-Vergleiche**: "Keine Größen- oder Längenvergleiche mit Emojis -- Emojis haben keine physische Größe."

## Umsetzungsplan

### 1. Edge Function `validate-answer` erstellen
- Input: `{ question, correctAnswer, userAnswer, grade, subject }`
- Prompt: "Ist die Antwort des Schülers inhaltlich korrekt? Berücksichtige Tippfehler, Synonyme, Abkürzungen. Antworte nur mit {accepted: true/false, reason: '...'}"
- Model: `gemini-2.5-flash-lite` (schnellstes/billigstes)

### 2. `LearningGame.tsx` -- checkAnswer() erweitern
- Bei FREETEXT + lokales Ergebnis = falsch → `validate-answer` aufrufen
- Kurzer Loading-State ("Antwort wird geprüft...")
- Bei accepted=true → als korrekt werten

### 3. System-Prompt in `ai-question-generator` verschärfen
- Direkt im `getSystemPrompt()` die vier Regeln oben einbauen
- Zusätzlich FREETEXT-Instruktionen verschärfen: "Antwort muss 1-3 Wörter oder eine Zahl sein"

### 4. Neue DB-Tabelle `prompt_rules` (optional, Phase 2)
- Felder: `id`, `rule_text`, `subject`, `grade_min`, `grade_max`, `is_active`, `source_feedback_count`, `created_at`
- Edge Function lädt aktive Regeln und hängt sie an den Prompt
- Admin-UI zum Verwalten der Regeln

### Priorisierung

| Schritt | Aufwand | Wirkung |
|---------|---------|---------|
| Prompt-Verschärfung | Klein | Hoch -- verhindert sofort schlechte Fragen |
| validate-answer | Mittel | Hoch -- löst das "Altlantik"-Problem |
| prompt_rules Tabelle | Mittel | Mittel -- langfristige Skalierbarkeit |


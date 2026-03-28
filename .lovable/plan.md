

## Kombinierter Plan: Kinderfreundliche UI + Einfachere Fragetexte (Klasse 1–4)

Beide vorherigen Pläne werden in einem Durchgang umgesetzt. Alle Änderungen betreffen **nur** die "young"-Variante (grade ≤ 4). Teen-Ansicht (5–10) und Eltern-Dashboard bleiben unverändert.

---

### 1. Kinder-Dashboard vereinfachen (`UserProfile.tsx`)

**Für grade ≤ 4:**
- Game-Start-Card: Text kürzen — nur großer "🚀 Los geht's!"-Button, kein Beschreibungstext
- Stats-Grid: von 4 auf 2 Karten reduzieren — nur "⏰ {Minuten}" und "🏆 {Spiele}", ohne beschreibende Unter-Labels
- Motivationstext am Ende entfernen (überflüssig für Kleine)

### 2. Fächerwahl vereinfachen (`CategorySelector.tsx`)

**Für young:**
- Motivations-Card (🏆 "Lerne und verdiene Handyzeit!") entfernen — Kinder wissen, warum sie da sind
- Fach-Kacheln: "+{seconds}s ⏱️" Zeile entfernen (Kinder verstehen Sekunden-pro-Aufgabe nicht)
- Lernplan-Card: Text kürzen, nur Emoji + Fachname + "Heute: [Focus]"

### 3. Spiel-UI vereinfachen (`LearningGame.tsx`)

**Für grade ≤ 4:**
- **Header**: Kein "Klasse X" Badge, nur Fach-Emoji + Zurück-Button
- **Timer**: Komplett ausblenden (erzeugt Druck bei Kleinen)
- **Fortschritt**: "⭐ {score}" statt "🏆 {score} richtig", "3 von 5" statt "Frage 3 von 5"
- **Frage-Text**: `text-2xl` statt `text-xl`
- **Feedback nach Antwort**:
  - Nur großes ✅ "Super!" oder ❌ + richtige Antwort
  - Keine Emoji-Bewertungsbuttons (👍👎😰😴)
  - Kein Report-Button, kein KI-Tutor-Hinweis
  - Erklärung bleibt verfügbar (optional)
- **Buttons kürzer**: "Prüfen ✓", "💡 Hilfe", "Weiter ➡️"
- **Lade-Screens**: "Gleich geht's los! 🚀" statt "Deine Fragen werden vorbereitet..."
- **Error**: "🔄 Nochmal!" statt "Nochmal versuchen"

### 4. Ergebnis-Screen vereinfachen (`GameCompletionScreen.tsx`)

**Neue `grade` prop hinzufügen. Für grade ≤ 4:**
- Nur: riesiges Emoji + "Super gemacht!" + große Zahl "{X} Minuten gewonnen!"
- Keine Prozent-Genauigkeit, keine Zeitberechnung, kein Bonus-Detail
- Button: "🎉 Weiter!" statt "X Min. Bildschirmzeit erhalten!"

### 5. Einfachere Fragetexte für Klasse 1–2 (`ai-question-generator/index.ts`)

**System-Prompt (`getSystemPrompt()`):**
- Neue Regel: "Für Klasse 1–2: Maximal 1 kurzer Satz (max 10–12 Wörter). Nur einfache Alltagswörter. Keine Fachbegriffe."

**Grade-Guidelines (`getGradeGuidelines()`):**
- Klasse 1: "Zahlen bis 20, nur ganz kurze einfache Sätze, max 10 Wörter"
- Klasse 2: "Zahlen bis 100, kurze Sätze, max 12 Wörter"
- Klasse 3–4 bleibt wie bisher

**Prompt-Builder (`buildQuestionPrompt()`):**
- Für grade ≤ 2 zusätzlicher Block mit Beispielen:
  - Gut: "Was ist 3 + 5?", "Wie viele Äpfel sind es?"
  - Schlecht: "Berechne die Summe der folgenden Zahlen"

---

### Dateien

| Datei | Änderung |
|-------|----------|
| `src/components/auth/UserProfile.tsx` | Dashboard für grade ≤ 4 vereinfachen |
| `src/components/CategorySelector.tsx` | Motivations-Card + Sekundenangabe für young entfernen |
| `src/components/LearningGame.tsx` | Header, Timer, Feedback, Buttons, Ladetext für young |
| `src/components/GameCompletionScreen.tsx` | `grade` prop, vereinfachte Ansicht für grade ≤ 4 |
| `supabase/functions/ai-question-generator/index.ts` | Prompt für Klasse 1–2 vereinfachen + redeploy |

### Was NICHT geändert wird
- Teen-Ansicht (Klasse 5–10)
- Eltern-Dashboard
- Spiellogik, Fragengenerierung (Retry/Batch-Logik)
- `useAgeGroup` Hook
- Validierung und Normalisierung


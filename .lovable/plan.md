

## Plan: Fehlermeldungen, Passwort-vergessen, Onboarding-Tutorial & Gamification-Effekte

Vier zusammenhängende Verbesserungen der App-Erfahrung.

---

### 1. Fehlermeldungen auf Deutsch mit klaren Texten

**Problem:** In `AuthForm.tsx` werden Supabase-Fehlermeldungen (z.B. "Invalid login credentials", "User already registered") direkt an den User weitergegeben. Ähnliches passiert in weiteren Komponenten.

**Lösung:** Erstelle eine Hilfsfunktion `src/utils/errorMessages.ts`, die bekannte englische Supabase-Fehlermeldungen auf verständliches Deutsch mappt:
- "Invalid login credentials" → "E-Mail oder Passwort ist falsch."
- "User already registered" → "Diese E-Mail ist bereits registriert."
- "Email not confirmed" → "Bitte bestätige zuerst deine E-Mail-Adresse."
- "Password should be at least 6 characters" → "Das Passwort muss mindestens 6 Zeichen lang sein."
- Fallback: allgemeine deutsche Fehlermeldung

Einsetzen in `AuthForm.tsx` und allen Stellen, die `error.message` direkt anzeigen.

---

### 2. Passwort-vergessen-Funktion

**Änderungen:**

- **`AuthForm.tsx`**: Link "Passwort vergessen?" unter dem Passwort-Feld im Login-Tab einfügen. Klick zeigt ein Inline-Formular (E-Mail-Eingabe + Button "Link senden"), das `supabase.auth.resetPasswordForEmail()` mit `redirectTo: window.location.origin + '/reset-password'` aufruft.

- **Neue Seite `src/pages/ResetPassword.tsx`**: Prüft URL-Hash auf `type=recovery`, zeigt Formular für neues Passwort, ruft `supabase.auth.updateUser({ password })` auf, leitet nach Erfolg zu `/` weiter.

- **`App.tsx`**: Route `/reset-password` hinzufügen.

---

### 3. Onboarding-Tutorial nach Registrierung

**Neuer Component: `src/components/OnboardingTutorial.tsx`**

Ein mehrstufiger Wizard (Dialog/Fullscreen-Overlay) mit 3-5 Slides, unterschiedlich für Eltern und Kinder:

**Kind-Tutorial (3-4 Schritte):**
1. "Willkommen bei LernZeit!" – Kurze Begrüßung
2. "So funktioniert's" – Fach wählen → Fragen beantworten → Handyzeit verdienen
3. "Deine Erfolge" – Streaks, Achievements, Fortschritt
4. "Los geht's!" – CTA zum ersten Spiel

**Eltern-Tutorial (3-4 Schritte):**
1. "Willkommen!" – Überblick für Eltern
2. "Kind verknüpfen" – Code generieren, an Kind weitergeben
3. "Bildschirmzeit verwalten" – Zeitlimits, Anfragen genehmigen
4. "Lernfortschritte" – Analyse-Dashboard

**Technisch:**
- State `hasSeenOnboarding` in `localStorage` (Key: `lernzeit_onboarding_${userId}`)
- Trigger: Nach erstem Login/Registrierung, wenn Flag nicht gesetzt
- Einbau in `UserProfile.tsx`: Prüfe Flag, zeige Tutorial vor dem normalen Dashboard
- Ansprechendes Design mit Illustrationen (Emojis/Icons), Fortschritts-Dots, Weiter/Überspringen

---

### 4. Gamification-Effekte bei schnellen/richtigen Antworten

**Erweitere `src/utils/confetti.ts`** um neue Effektfunktionen:
- `triggerUnicornBurst()` – Einhorn-Emoji-Partikel (🦄) mit canvas-confetti shapes
- `triggerStarShower()` – Sterne von oben (⭐)
- `triggerRainbow()` – Regenbogen-farbige Explosion
- `triggerSpeedBonus()` – Blitz-Effekt (⚡) für schnelle Antworten

**Neuer Component: `src/components/game/InGameAnimation.tsx`**
- Zeigt CSS-animierte Elemente (fliegende Einhörner, Sterne, Flammen) als Overlay
- Verschiedene Trigger-Bedingungen:
  - Richtige Antwort: Sparkle/Konfetti
  - Schnelle Antwort (<3s): Einhörner + "Blitzschnell! ⚡"
  - 3 richtige in Folge: Combo-Effekt mit Feuerwerk
  - Alle richtig (Perfekt): Großes Feuerwerk + Regenbogen

**Integration in `LearningGame.tsx`:**
- Nach `checkAnswer()` → Antwortzeit messen (Timer-Differenz)
- Korrekte Antwort + schnelle Zeit → `triggerSpeedBonus()` + fliegendes Einhorn
- Streak-Counter für aufeinanderfolgende richtige Antworten
- Kurze Toast-Nachrichten: "Blitzschnell! ⚡", "3er-Combo! 🔥", "Unaufhaltbar! 🦄"

---

### Zusammenfassung der neuen/geänderten Dateien

| Datei | Aktion |
|---|---|
| `src/utils/errorMessages.ts` | Neu |
| `src/components/auth/AuthForm.tsx` | Ändern (Fehlermeldungen + Passwort-vergessen) |
| `src/pages/ResetPassword.tsx` | Neu |
| `src/App.tsx` | Route hinzufügen |
| `src/components/OnboardingTutorial.tsx` | Neu |
| `src/components/auth/UserProfile.tsx` | Ändern (Tutorial-Trigger) |
| `src/utils/confetti.ts` | Erweitern |
| `src/components/game/InGameAnimation.tsx` | Neu |
| `src/components/LearningGame.tsx` | Ändern (Gamification-Trigger) |


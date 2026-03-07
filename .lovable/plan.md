

# App-Analyse und Feature-Konzepte

## Teil 1: Identifizierte funktionale Schwaechen

### 1. Kein Lernziel-Feedback waehrend der Session
Das Kind sieht waehrend des Spielens nur Frage X/5 und den Score. Es fehlt eine Anzeige, wie viele Minuten es bisher in dieser Session verdient hat und wie die Netto-Rechnung (verdient minus Spielzeit) aktuell steht. Das fuehrt zu Ueberraschungen auf dem Completion-Screen.

### 2. Streak hat keinen Belohnungseffekt
Der Streak wird berechnet und angezeigt (Tage-Flamme), hat aber keinerlei Auswirkung -- kein Bonus, keine besondere Anerkennung. Das reduziert die Motivation, taeglich zurueckzukommen.

### 3. Keine Wiederholung falscher Fragen
Falsch beantwortete Fragen verschwinden nach der Session. Es gibt keinen Mechanismus, sie spaeter erneut zu stellen (Spaced Repetition). Das ist eine verpasste Lernchance.

### 4. Eltern sehen keinen Tagesueberblick
Das Eltern-Dashboard zeigt Anfragen und Analysen, aber keine schnelle Zusammenfassung: "Kind X hat heute Y Minuten gelernt, Z Fragen beantwortet, W Minuten Bildschirmzeit beantragt." Eltern muessen sich durch Tabs klicken.

### 5. Keine Push-Erinnerungen fuer taegliches Lernen
Das Push-System ist vorbereitet (usesPushNotifications), aber es gibt keine Logik, die Kinder daran erinnert, heute noch zu lernen (z.B. wenn bis 16 Uhr kein Spiel gespielt wurde).

### 6. Feste 5 Fragen pro Session
Die Anzahl ist auf 5 hardcoded. Kinder, die im Flow sind, muessen nach 5 Fragen aufhoeren und eine neue Session starten. Das unterbricht den Lernfluss.

---

## Teil 2: Feature-Konzepte

### Feature A: Taegliche Herausforderungen ("Daily Challenge")

**Wert:** Gibt dem Kind ein konkretes Tagesziel und einen Grund, jeden Tag zu spielen. Staerkt die Streak-Motivation.

**Konzept:**
- Jeden Tag wird automatisch eine Herausforderung generiert: z.B. "Beantworte 10 Mathe-Fragen mit mindestens 80% richtig"
- Varianten: Fach-Challenge, Speed-Challenge (5 Fragen in unter 3 Minuten), Perfekt-Challenge (5/5 richtig)
- Bei Erfolg: Bonus-Minuten (2-3 Min) + eigenes Achievement
- UI: Kleine Card auf dem Kind-Dashboard, die die heutige Challenge zeigt

**Umsetzung:**
- Neue DB-Tabelle `daily_challenges` (user_id, challenge_type, challenge_params jsonb, is_completed, completed_at, reward_minutes, challenge_date)
- Generierung: Entweder deterministisch aus Datum+UserID (kein Backend noetig) oder via Edge Function
- Frontend: Neue Komponente `DailyChallenge.tsx` auf dem Kind-Dashboard
- Pruefung: Nach jeder Session pruefen ob Challenge-Bedingungen erfuellt

---

### Feature B: Woechentlicher Eltern-Report per E-Mail

**Wert:** Eltern erhalten ohne App-Oeffnen einen Ueberblick ueber den Lernfortschritt. Erhoeht Retention und Vertrauen.

**Konzept:**
- Jeden Sonntag automatisch eine E-Mail an verknuepfte Eltern
- Inhalt: Tage gelernt, Gesamtfragen, Erfolgsquote, staerkstes/schwaechstes Fach, Streak
- Optional abschaltbar in den Eltern-Einstellungen

**Umsetzung:**
- Neue Edge Function `weekly-report` (per Supabase Cron oder manuell)
- Aggregiert `game_sessions` der letzten 7 Tage pro Kind
- Sendet via Resend (bereits integriert fuer Screen-Time-Notifications)
- Neue Spalte `weekly_report_enabled` (default true) auf `child_settings` oder `profiles`

---

### Feature C: Spaced Repetition fuer falsche Antworten

**Wert:** Kinder lernen aus Fehlern. Falsch beantwortete Fragen tauchen nach 1, 3, 7 Tagen erneut auf. Wissenschaftlich bewaehrte Methode.

**Konzept:**
- Wenn eine Frage falsch beantwortet wird: Frage + korrekte Antwort in `review_queue` speichern
- Bei der naechsten Session: 1-2 Wiederholungsfragen aus der Queue einmischen (vor den neuen Fragen)
- Nach 3x richtig beantwortet: Frage aus der Queue entfernen
- UI-Hinweis: "Diese Frage hattest du beim letzten Mal falsch -- versuch es nochmal!"

**Umsetzung:**
- Neue DB-Tabelle `review_queue` (user_id, question_text, correct_answer, question_type, options jsonb, subject, grade, next_review_at, review_count, created_at)
- `useQuestionPreloader` erweitern: Vor dem AI-Call pruefen ob faellige Review-Fragen existieren
- Nach korrekter Antwort: `review_count++`, `next_review_at` verlaengern (1d -> 3d -> 7d -> entfernen)
- Nach falscher Antwort: `next_review_at` zuruecksetzen auf morgen

---

### Feature D: Eltern-Tagesueberblick (Quick Summary)

**Wert:** Eltern sehen auf einen Blick den Status aller Kinder, ohne durch Tabs navigieren zu muessen.

**Konzept:**
- Oben im Eltern-Dashboard eine kompakte Zusammenfassung pro Kind:
  - Heute gelernt: X Min / Y Fragen / Z% richtig
  - Offene Anfragen: 1 pending
  - Streak: 5 Tage
- Farbkodiert: Gruen (heute gelernt), Grau (noch nicht), Orange (Anfrage offen)

**Umsetzung:**
- Neue Komponente `ParentDailyOverview.tsx`
- Laed pro verknuepftem Kind: heutige `game_sessions` (SUM time_earned, SUM correct_answers, COUNT), offene `screen_time_requests`
- Wird ueber den Tabs im `ParentDashboard` angezeigt
- Kein neues Backend noetig -- alles via bestehende RLS-Policies abfragbar

---

### Feature E: Lern-Modus Auswahl (Session-Laenge)

**Wert:** Kinder koennen waehlen ob sie eine kurze (5 Fragen), mittlere (10) oder lange Session (15) spielen. Passt sich an verfuegbare Zeit an.

**Konzept:**
- Nach der Fachwahl: Auswahl zwischen "Schnell (5)", "Normal (10)", "Marathon (15)"
- Visuell: 3 Cards mit Zeitschaetzung und erwartbaren Belohnungsminuten
- Eltern koennen optional die maximale Session-Laenge begrenzen (in child_settings)

**Umsetzung:**
- Neuer Zwischenschritt zwischen `CategorySelector` und `LearningGame`
- Oder: Direkt in `CategorySelector` als zweite Auswahl integrieren
- `LearningGame` erhaelt bereits `totalQuestions` als Prop -- nur der Aufrufer muss angepasst werden
- Optional: Neue Spalte `max_questions_per_session` auf `child_settings`

---

### Feature F: Streak-Belohnungen

**Wert:** Macht den bereits berechneten Streak wertvoll. Kinder bekommen fuer laengere Streaks Bonus-Minuten.

**Konzept:**
- Streak-Meilensteine: 3 Tage (+1 Min), 7 Tage (+2 Min), 14 Tage (+3 Min), 30 Tage (+5 Min)
- Einmalig pro Meilenstein (nicht taeglich)
- Visuell: Flammen-Animation + Toast bei Erreichen eines Meilensteins

**Umsetzung:**
- Neue Achievements in `achievements_template` mit category='streak' und type='streak_days'
- Bereits unterstuetzt durch `useAchievementTracker` -- nur neue Template-Eintraege noetig
- DB-Migration: INSERT INTO achievements_template fuer Streak-Meilensteine

---

## Empfohlene Reihenfolge

| Prioritaet | Feature | Aufwand | Wirkung |
|------------|---------|---------|---------|
| 1 | D: Eltern-Tagesueberblick | Klein | Hoch -- sofort sichtbarer Mehrwert |
| 2 | F: Streak-Belohnungen | Klein | Hoch -- nur DB-Inserts, kein neuer Code |
| 3 | E: Session-Laenge Auswahl | Klein | Mittel -- bessere UX |
| 4 | A: Daily Challenges | Mittel | Hoch -- taegliche Motivation |
| 5 | C: Spaced Repetition | Mittel | Hoch -- Lerneffekt |
| 6 | B: Woechentlicher E-Mail-Report | Mittel | Mittel -- Eltern-Retention |


## Streak einfrieren, visuell darstellen und reaktivieren

### Ziel

Der Streak soll nicht sofort „verschwinden“, wenn ein Kind einen Tag nicht übt. Stattdessen wird der bisherige Streak eingefroren und als Feuer-Zustand dargestellt:

```text
Heute geübt        → große Flamme, Streak aktiv
1 Tag nicht geübt  → kleine Flamme, Streak gefährdet
2+ Tage nicht geübt → Stöcke/Glut, Streak eingefroren
```

Durch eine spezielle Streak-Rettungs-Session oder durch eine normale Lernsession kann das Feuer wieder entfacht werden.

---

## Umsetzung

### 1. Streak-Status dauerhaft speichern

Ich ergänze eine neue Supabase-Tabelle für den Streak-Zustand pro Kind, z. B. `user_streak_states`.

Sie speichert:

- Kind/User-ID
- aktueller eingefrorener Streak-Wert
- Datum der letzten erfolgreichen Lernaktivität
- Status: `active`, `dim`, `frozen`
- letzte Push-Erinnerung, damit Pushs nicht mehrfach am Tag gesendet werden
- Zeitstempel für Erstellung/Aktualisierung

RLS:

- Kinder dürfen ihren eigenen Streak-Zustand lesen und aktualisieren.
- Eltern dürfen den Streak-Zustand ihrer verknüpften Kinder lesen.
- Service Role darf für Push/Automatik verwalten.

---

### 2. `useStreak` erweitern

Der bestehende Hook berechnet aktuell nur eine Zahl aus `game_sessions` und `learning_sessions`.

Ich erweitere ihn so, dass er zusätzlich zurückgibt:

```ts
{
  streak: number,
  status: 'active' | 'dim' | 'frozen',
  inactiveDays: number,
  canRecover: boolean,
  lastActivityDate: string | null
}
```

Regeln:

- Wenn heute gelernt wurde: `active`
- Wenn zuletzt gestern gelernt wurde: `dim`
- Wenn 2 oder mehr Tage vergangen sind: `frozen`
- Der sichtbare Streak-Wert bleibt eingefroren, statt sofort auf 0 zu fallen.

---

### 3. Neue Streak-Kachel im Kind-Dashboard

Im Kinder-Dashboard ersetze ich die einfache Streak-Anzeige durch eine klickbare Streak-Kachel.

Je nach Zustand:

- `active`: große Flamme, Text z. B. „Dein Feuer brennt!“
- `dim`: kleine Flamme, Text z. B. „Deine Flamme wird kleiner“
- `frozen`: Stöcke/Glut, Text z. B. „Dein Feuer ist aus – entfache es wieder“

Beim Klick auf die Kachel:

- Bei `active`: kurze Erklärung, wie der Streak funktioniert.
- Bei `dim`/`frozen`: Dialog mit Button „Streak retten“ bzw. „Feuer entfachen“.

---

### 4. Streak-Rettungs-Session

Ich erweitere den Spielstart um einen speziellen Modus:

```ts
mode: 'normal' | 'streak_recovery'
```

Für `streak_recovery` gilt:

- Das Kind löst eine kurze Session.
- Ziel: mindestens 3 richtige Aufgaben.
- Es werden keine Bildschirmzeit-Minuten erspielt.
- Die Abschlussanzeige erklärt klar: „Diese Session rettet nur dein Feuer – sie gibt keine Minuten.“
- Bei Erfolg wird der eingefrorene Streak wieder aktiviert.
- Bei Misserfolg kann das Kind es erneut versuchen.

Damit die bestehende Spiellogik weiterverwendet wird:

- `LearningGame` bekommt einen optionalen `mode`-Prop.
- `useGameSessionSaver` bekommt einen optionalen Parameter, um das Schreiben von `user_earned_minutes` zu unterdrücken.
- Streak-Rettungs-Sessions speichern `time_earned: 0` und `question_source: 'streak-recovery'`.

---

### 5. Normale Session kann Feuer ebenfalls reaktivieren

Wenn das Feuer aus ist und das Kind stattdessen ganz normal lernt:

- Die normale Session funktioniert wie bisher.
- Minuten werden normal erspielt.
- Der Streak wird ebenfalls wieder als aktiv markiert.
- Das Feuer brennt danach wieder.

---

### 6. Streak-Animation anpassen

Die bestehende `StreakAnimation` bleibt für neue/erhöhte Streaks erhalten.

Zusätzlich ergänze ich kleinere visuelle Zustände:

- kleine Flamme für gefährdeten Streak
- Glut/Stöcke für eingefrorenen Streak
- Reaktivierungs-Animation, wenn das Feuer wieder entfacht wurde

Tailwind-Klassen bleiben statisch, damit der Build stabil bleibt.

---

### 7. Push-Nachrichten an Kinder

Die bestehende `send-push` Edge Function hat bereits tägliche Lern-Erinnerungen. Ich erweitere diese Logik um Streak-spezifische Nachrichten.

Beispiele:

- Nach 1 Tag ohne Üben:
  - Titel: „🔥 Deine Flamme wird kleiner“
  - Text: „Löse heute ein paar Aufgaben, damit dein Streak weiter brennt!“
- Nach 2+ Tagen ohne Üben:
  - Titel: „🪵 Dein Lernfeuer ist aus“
  - Text: „Entfache es wieder: Löse 3 Aufgaben richtig und rette deinen Streak!“
- Wenn der Streak aktiv ist:
  - bestehende motivierende Reminder bleiben erhalten.

Die Nachrichten:

- gehen nur an das Kind
- respektieren `daily_push_enabled`
- werden höchstens einmal pro Tag gesendet
- nutzen die vorhandene OneSignal-Infrastruktur

---

## Betroffene Dateien

### Frontend

- `src/hooks/useStreak.ts`
- `src/components/auth/UserProfile.tsx`
- `src/components/LearningGame.tsx`
- `src/hooks/useGameSessionSaver.ts`
- ggf. neue Komponente:
  - `src/components/StreakFireCard.tsx`

### Backend / Supabase

- neue Migration für `user_streak_states`
- `supabase/functions/send-push/index.ts`

---

## Verhalten nach Umsetzung

```text
Kind lernt Montag:
  Streak 5, große Flamme

Kind lernt Dienstag nicht:
  Streak bleibt 5, kleine Flamme

Kind lernt Mittwoch nicht:
  Streak bleibt 5, Feuer ist aus / Stöcke

Kind klickt auf Streak-Kachel:
  Dialog erklärt Rettungs-Session

Kind löst 3 Aufgaben richtig:
  keine Minuten
  Streak wieder aktiv
  Feuer brennt wieder

Kind startet stattdessen normale Lernsession:
  Minuten werden normal verdient
  Feuer wird ebenfalls wieder aktiviert

Kind lern stattdessen auch Donnerstag nicht: streak geht auf 0 und kann nicht wieder reaktiviert werden. 
```
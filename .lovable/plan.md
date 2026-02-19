
## Plan: Cache-Prefill auf Subject-Domain-Hints umstellen + Legacy-Lehrplandateien löschen

### Analyse des Ist-Zustands

**Warum Live-Fragen besser sind:**
Der `ai-question-generator` arbeitet mit offenen Grade-Guidelines (`getGradeGuidelines`), die dem Modell breiten Spielraum lassen. Es wird keine feste Skill-Liste vorgegeben — Gemini wählt selbst passende Unterthemen. Das Ergebnis ist hohe Vielfalt und korrekte Altersanpassung.

**Was am `cache-prefill` falsch ist:**
- Die `CURRICULUM`-Konstante ist hardcodiert und deckt nur 3 Fächer ab: `math`, `german`, `english`
- 6 weitere Fächer (Geografie, Geschichte, Physik, Biologie, Chemie, Latein) haben **null** Einträge — Zeile `if (!skill) continue;` überspringt sie vollständig
- Feste Skill-Listen führen zu Wiederholungen und schlechter Abdeckung bei begrenztem Stundenpool
- `pickSkill()` rotiert nur durch eine fixe Liste und liefert dieselben Themen im Kreis

**Tote Dateien:**
- `public/data/math_curriculum_1-10.json` — kein einziger `import` oder `fetch` im gesamten `src/`-Verzeichnis
- `public/data/knowledge_cards.jsonl` — kein einziger `import` oder `fetch` im gesamten `src/`-Verzeichnis
Beide sind Dead-Weight und werden gelöscht.

---

### Neues Konzept: Subject-Domain-Hints

Statt fester Skill-Listen gibt es pro Fach **Domain-Hinweise** — breite thematische Oberkategorien mit Subthemen-Beispielen. Das Modell wählt selbst ein konkretes Unterthema. So wird:
- kein manueller Pflegeaufwand nötig
- Vielfalt durch echte KI-Entscheidung sichergestellt
- Lehrplanbreite für alle 10 Fächer gewährleistet

```text
SUBJECT_DOMAINS["geography"] = {
  domains: ["Orientierung (Karte, Himmelsrichtungen)", "Europa: Länder, Hauptstädte, Flüsse", ...],
  hint: "Wähle ein konkretes Thema aus den Oberkategorien, das zum Lernniveau passt"
}
```

---

### Änderungen

**1. `supabase/functions/cache-prefill/index.ts` — vollständig überarbeitet**

Folgendes wird ersetzt/gelöscht:
- `const CURRICULUM: Record<number, Record<string, string[]>>` (Zeilen 14–232) → **wird gelöscht**
- `function pickSkill(...)` (Zeilen 259–263) → **wird gelöscht**
- Die Logik in Step 2 die `CURRICULUM[grade]?.[subject]` prüft → **wird ersetzt**

Folgendes wird neu eingeführt:

```typescript
// Alle unterstützten Fächer mit Domain-Hinweisen
const SUBJECT_DOMAINS: Record<string, {
  domains: string[];
  ageHints: string;  // Kurzhinweis für Altersanpassung
}> = {
  math: {
    domains: [
      'Zahlen & Operationen (Zählen, Rechnen, Stellenwert)',
      'Brüche, Dezimalzahlen & Prozentrechnung',
      'Algebra: Terme, Gleichungen, Funktionen',
      'Geometrie: Flächen, Körper, Koordinaten, Winkel',
      'Größen & Messen: Länge, Zeit, Geld, Gewicht',
      'Daten & Zufall: Statistik, Wahrscheinlichkeit, Diagramme',
    ],
    ageHints: 'Zahlenräume wachsen mit der Klasse: ZR10 (Kl.1) → ZR100 (Kl.2) → ZR1000 (Kl.3) → Mio (Kl.4+)',
  },
  german: { ... },
  english: { ... },
  geography: {
    domains: [
      'Orientierung: Karten, Himmelsrichtungen, Maßstab',
      'Europa: Länder, Hauptstädte, Gebirge, Flüsse',
      'Deutschland: Bundesländer, Städte, Landschaften',
      'Weltgeografie: Kontinente, Ozeane, Klimazonen',
      'Wirtschaft & Bevölkerung: Ressourcen, Migration',
      'Naturgeografie: Erosion, Tektonik, Wetter, Klima',
    ],
    ageHints: 'Klassen 1-4: Deutschland & Europa; Klassen 5+: Welt, Wirtschaft, Ökologie',
  },
  history: { ... },
  physics: { ... },
  biology: { ... },
  chemistry: { ... },
  latin: { ... },
  science: { ... },  // Sachkunde Grundschule
};
```

Der `buildQuestionPrompt` erhält statt eines `skill`-Strings nun einen `domainsHint`-String:

```typescript
function buildQuestionPrompt(grade, subject, domainsHint, difficulty, questionType) {
  return `...
THEMENBEREICH: Wähle selbst ein konkretes, lehrplangerechtes Unterthema aus diesen Oberkategorien:
${domainsHint}
HINWEIS FÜR ALTERSANPASSUNG: ${ageHint}

Das Modell wählt das Unterthema — es muss zur Klassenstufe ${grade} passen und darf sich 
nicht mit einem bereits bekannten Thema wiederholen.
...`;
}
```

Die Target-Generierung in Step 2 nutzt `SUBJECT_DOMAINS` statt `CURRICULUM`:

```typescript
// Alle Klassen 1–10, alle definierten Fächer
const ALL_GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const ALL_SUBJECTS = Object.keys(SUBJECT_DOMAINS);

for (const grade of (targetGrades ?? ALL_GRADES)) {
  for (const subject of (targetSubjects ?? ALL_SUBJECTS)) {
    const current = cacheMap.get(`${grade}-${subject}`) ?? 0;
    if (current < MIN_CACHE_THRESHOLD) {
      targets.push({ grade, subject, currentCount: current });
    }
  }
}
```

Der `if (!skill) continue;`-Check entfällt — jede Kombination ist jetzt gültig.

**2. Löschen: `public/data/math_curriculum_1-10.json`**

Datei wird gelöscht — sie wird von keiner Codestelle verwendet und war nur für den alten Template-basierten Ansatz relevant.

**3. Löschen: `public/data/knowledge_cards.jsonl`**

Datei wird gelöscht — sie wird von keiner Codestelle verwendet.

---

### Sequenz der Implementierung

```text
1. public/data/math_curriculum_1-10.json  → löschen (leere Datei)
2. public/data/knowledge_cards.jsonl      → löschen (leere Datei)
3. supabase/functions/cache-prefill/index.ts → vollständig neu schreiben:
   a. CURRICULUM-Konstante → durch SUBJECT_DOMAINS ersetzen
   b. pickSkill() → entfernen
   c. buildQuestionPrompt() → domain-hint-basiert
   d. Step 2 Target-Loop → ALL_GRADES × ALL_SUBJECTS
   e. Aufruf-Logik (Step 3) → kein skill-Check mehr
```

---

### Ergebnis

| Vorher | Nachher |
|---|---|
| 3 Fächer (math, german, english) | 10 Fächer (+ geo, history, physics, bio, chem, latin, science) |
| Feste Skill-Listen → Wiederholungen | Offene Domain-Hints → echte KI-Vielfalt |
| Klassen 1–10 nur für math/german | Klassen 1–10 × alle Fächer = 100 Kombinationen |
| 2 tote Dateien in `/public/data/` | Bereinigt |
| Pflege der Skill-Listen nötig | Kein Pflegeaufwand |

Die Qualität bleibt auf `gemini-2.5-pro`-Niveau, da das Modell nicht auf schlechte Skill-Strings eingeschränkt wird, sondern eigenständig das optimale Unterthema für Klasse und Fach wählt — genau wie der Live-Generator.

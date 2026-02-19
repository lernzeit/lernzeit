## Implementierung: Cache-Prefill mit Subject-Domain-Hints

### Was geändert wird

**1. `supabase/functions/cache-prefill/index.ts` — vollständig neu**

Die hardcodierte `CURRICULUM`-Konstante (232 Zeilen, nur math/german/english) wird durch ein kompaktes `SUBJECT_DOMAINS`-Objekt ersetzt, das alle 10 Fächer mit offenen Domain-Hinweisen abdeckt:


| Fach      | Domains (Beispiele)                                    | Altershinweise                            |
| --------- | ------------------------------------------------------ | ----------------------------------------- |
| math      | Zahlen & Op., Algebra, Geometrie, Stochastik...        | ZR10→ZR100→ZR1000→Mio nach Klasse         |
| german    | Grammatik, Rechtschreibung, Literatur, Stilmittel...   | Kl.1–2 Grundlagen → Kl.8–10 Rhetorik      |
| english   | Grammar (tenses, modals), Vocabulary, Comprehension... | Kl.5–6 Basics → Kl.9–10 Advanced          |
| geography | Orientierung, D-land, Europa, Weltgeo, Klima...        | Kl.1–4 Nahraum → Kl.8–10 Globalisierung   |
| history   | Antike, Mittelalter, Neuzeit, Weltkriege, Gegenwart... | Kl.5–7 Antike/MA → Kl.9–10 Zeitgeschichte |
| physics   | Mechanik, Optik, Elektrik, Wärme, Energie...           | Ab Kl.5 (Sachkunde davor)                 |
| biology   | Zelle, Ökosysteme, Körper, Genetik, Gesundheit...      | Kl.5–7 Systematik → Kl.9–10 Genetik       |
| chemistry | Stoffe, Reaktionen, PSE, Organik, Alltag...            | Ab Kl.7                                   |
| latin     | Vokabular, Grammatik, Syntax, Texte, Kultur...         | Ab Kl.5                                   |
| science   | Natur, Körper, Technik, Gesellschaft, Umwelt...        | Nur Kl.1–4 (Sachkunde)                    |


`**buildQuestionPrompt` — neue Signatur**

```
// Vorher:
buildQuestionPrompt(grade, subject, skill, difficulty, questionType)
//                                   ^^^^^ fester Skill-String

// Nachher:
buildQuestionPrompt(grade, subject, difficulty, questionType)
// Prompt enthält Domain-Hinweise + "Wähle selbst ein konkretes Unterthema"
```

**Schullogische Einschränkungen im Target-Loop**

- `science` nur Klassen 1–4
- `latin`, `english`, `geography`, `history`, `biology` ab Klasse 3/5
- `chemistry` ab Klasse 7
- `physics` ab Klasse 5

Der `if (!skill) continue;`-Check entfällt vollständig.

**2. `public/data/math_curriculum_1-10.json` — gelöscht**
Kein einziger `import`/`fetch` im gesamten `src/`-Verzeichnis — tote Datei.

**3. `public/data/knowledge_cards.jsonl` — gelöscht**
Kein einziger `import`/`fetch` im gesamten `src/`-Verzeichnis — tote Datei.

---

### Ergebnis nach Implementierung


| Vorher                                    | Nachher                          |
| ----------------------------------------- | -------------------------------- |
| 3 Fächer (math, german, english)          | 10 Fächer vollständig abgedeckt  |
| 232 Zeilen hardcodierter Skill-Listen     | ~60 Zeilen Domain-Hinweise       |
| `if (!skill) continue` blockiert 7 Fächer | Alle Kombinationen gültig        |
| Wiederholungen durch feste Rotation       | KI wählt eigenständig Unterthema |
| 2 tote Dateien in `/public/data/`         | Bereinigt                        |


Die Gemini-2.5-Pro-Qualität bleibt vollständig erhalten — das Modell bekommt mehr Freiheit für Themenvielfalt, nicht weniger Anleitung.
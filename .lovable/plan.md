

# Eltern-Dashboard Redesign: Kind-zentrierte Struktur

## Problem
Das Dashboard verteilt kind-bezogene Funktionen (Einstellungen, Lernplan, Analyse) auf separate Tabs. Eltern müssen zwischen Tabs hin- und herspringen und bei mehreren Kindern immer wieder das Kind wechseln. Die Fächereinstellungen (Sichtbarkeit, Schwerpunkt, Bonus) sind in drei separate Sektionen aufgeteilt, was viel Scrollen erfordert.

## Neue Struktur

### Dashboard-Layout (vereinfacht)

```text
┌─────────────────────────────────┐
│ Eltern-Dashboard    [Refresh]   │
│ Trial-Banner (wenn nötig)       │
├─────────────────────────────────┤
│ Tabs: Anfragen | Kinder | ...   │
│       Abo | Konto | Codes       │
├─────────────────────────────────┤
│ Tab "Kinder":                   │
│                                 │
│ ┌─ Max (Klasse 4) ───────────┐ │
│ │ 📚 3 Fragen | ✓ 67% | 2min│ │  ← DailyOverview inline
│ │ 🔥 5 Streak               │ │
│ │ [v] aufklappen             │ │
│ └────────────────────────────┘ │
│   ├─ Klassenstufe             │ │
│   ├─ Zeitlimits              │ │
│   ├─ Fächer (collapsible)    │ │
│   │   ├─ Mathematik [v]      │ │
│   │   │  Sichtbar [x] Fokus[x] 30s │
│   │   ├─ Deutsch [v]         │ │
│   │   │  Sichtbar [x] Fokus[ ] 30s │
│   │   └─ ...                 │ │
│   ├─ KI-Lernplan Generator   │ │
│   ├─ Lernentwicklung         │ │
│   └─ [Kind entfernen]        │ │
│                                 │
│ ┌─ Lisa (Klasse 2) ──────────┐ │
│ │ Heute noch nicht gelernt   │ │
│ │ [v] aufklappen             │ │
│ └────────────────────────────┘ │
└─────────────────────────────────┘
```

### Tabs reduziert auf 4-5
- **Anfragen** (Bildschirmzeit)
- **Kinder** (alles Kind-bezogene: Overview + Settings + Lernplan + Analyse)
- **Abo**
- **Konto** (Profil, Passwort, Codes)

### Fächer-Einstellungen zusammengeführt
Statt drei separate Listen (Sichtbarkeit, Schwerpunkt, Bonus) wird jedes Fach ein einzelnes collapsible Element. Aufgeklappt zeigt es:
- Toggle "Sichtbar"
- Toggle "Schwerpunkt" (Premium)
- Input "Bonus je Aufgabe" in Sekunden (Premium)

```text
┌─ Mathematik 📘 ──── [30s] ──┐
│  Sichtbar      [====]       │
│  Schwerpunkt   [====] 👑    │
│  Bonus/Aufgabe [__30__] s   │
└─────────────────────────────┘
┌─ Deutsch 📗 ─────── [30s] ──┐  (zugeklappt)
```

## Technische Umsetzung

### 1. `ParentDashboard.tsx` komplett umbauen
- Tabs reduzieren: `Anfragen | Kinder | Abo | Konto`
- Codes-Sektion in den "Konto"-Tab verschieben
- "Lernplan" und "Analyse" Tabs entfernen (werden pro Kind eingebettet)
- Im "Kinder"-Tab: Pro `linkedChild` ein `Collapsible` rendern, das die `ParentDailyOverview`-Daten als Header zeigt
- Aufgeklappt: `ChildSettingsEditor` (umgebaut), `LearningPlanGenerator` (gefiltert auf dieses Kind), `ChildLearningAnalysis`

### 2. `ChildSettingsEditor.tsx` Fächer-Sektion umbauen
- Die drei separaten Karten (Sichtbarkeit, Schwerpunkte, Bonus) durch eine einzige "Fächer"-Karte ersetzen
- Jedes Fach als `Collapsible`: Header zeigt Icon + Name + aktuellen Bonus, aufgeklappt zeigt drei Controls
- Nur für die Klassenstufe verfügbare Fächer anzeigen

### 3. `ParentDailyOverview.tsx` anpassen
- Neue Export-Variante oder Props, damit die Daten pro Kind inline im Collapsible-Header genutzt werden können (statt als separate Grid-Karte)

### Dateien
| Datei | Änderung |
|---|---|
| `src/components/ParentDashboard.tsx` | Tabs reduzieren, Kinder-Tab mit Collapsibles pro Kind, Codes in Konto-Tab |
| `src/components/ChildSettingsEditor.tsx` | Fächer in collapsible Einzelelemente zusammenführen |
| `src/components/ParentDailyOverview.tsx` | Optional: Datenlade-Hook extrahieren für Inline-Nutzung |


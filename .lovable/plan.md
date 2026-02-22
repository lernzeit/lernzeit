

# Landing Page Konzept fur LernZeit.app (uberarbeitet)

## Anderungen gegenuber dem ursprunglichen Konzept

1. **Belohnungssystem korrekt beschrieben**: Eltern stellen die Belohnung (Sekunden) pro richtig beantworteter Frage je Fach ein. Zusatzlich legen sie ein tagliches Gesamtzeit-Limit fest. Kinder verdienen sich innerhalb dieses Rahmens ihre Bildschirmzeit.
2. **Kein Hinweis auf Kreditkarte** -- der Footer-CTA wird neutral formuliert.
3. **Route heisst `/start`** statt `/landing`, Seitenname intern "Start".

---

## Seitenstruktur

### 1. Hero-Section
- **Headline:** "Lernen belohnen. Handyzeit verdienen."
- **Sub-Headline:** "Kinder losen Aufgaben und verdienen pro richtige Antwort Bildschirmzeit -- wie viel, bestimmen die Eltern."
- **CTAs:** "Kostenlos starten" (-> `/?auth=true`) | "Demo ausprobieren" (-> `/?demo=true`)
- Visuelles Element: Stilisierter App-Flow (Fach wahlen -> Aufgabe losen -> Zeit verdient)

### 2. "So funktioniert's" (3 Schritte)

```text
+---------------------+    +---------------------+    +---------------------+
|  1. Fach wahlen     | -> |  2. Aufgaben losen  | -> |  3. Zeit verdienen  |
|                     |    |                     |    |                     |
|  Mathe, Deutsch,    |    |  Altersgerechte     |    |  Pro richtige       |
|  Englisch u.v.m.    |    |  Fragen mit KI-     |    |  Antwort erhalten   |
|  Klasse 1-10        |    |  Unterstutzung      |    |  Kinder Sekunden    |
|                     |    |                     |    |  Bildschirmzeit     |
+---------------------+    +---------------------+    +---------------------+
```

### 3. "Was uns besonders macht" (4 USPs)

| USP | Beschreibung |
|-----|-------------|
| Bildschirmzeit als Belohnung | Pro richtige Antwort verdienen Kinder Bildschirmzeit -- Eltern legen pro Fach fest, wie viele Sekunden eine Aufgabe wert ist |
| Eltern behalten die Kontrolle | Eltern setzen ein tagliches Zeitlimit und steuern die Belohnung je Fach -- alles uber das Eltern-Dashboard |
| KI-Tutor | Falsche Antworten werden kindgerecht erklart -- mit Vorlese-Funktion |
| Lehrplanorientiert | Klasse 1-10, alle Hauptfacher, an deutschen Lehrplanen orientiert |

### 4. "Fur Eltern & Kinder" (Zielgruppen-Split)

**Fur Kinder:**
- Spielerisch lernen mit Achievements und Streaks
- Eigene Bildschirmzeit verdienen -- pro richtige Antwort
- KI-Erklarungen bei Fehlern

**Fur Eltern:**
- Tagliches Zeitlimit festlegen (Wochentag / Wochenende)
- Belohnung pro Aufgabe je Fach individuell einstellen
- Facher sichtbar/unsichtbar schalten und Schwerpunkte setzen
- Lernfortschritte verfolgen

### 5. Premium-Vergleich

| Feature | Kostenlos | Premium |
|---------|-----------|---------|
| Alle Facher Klasse 1-10 | Ja | Ja |
| Bildschirmzeit verdienen | Ja | Ja |
| KI-Tutor Erklarungen | -- | Ja |
| Belohnung pro Fach anpassen | -- | Ja |
| Individuelle Zeitlimits | -- | Ja |
| Lernanalyse | -- | Ja |
| | | **4 Wochen gratis testen** |

### 6. Footer-CTA
- "Jetzt kostenlos starten"
- Button -> Login/Register (`/?auth=true`)
- Legal-Footer (Datenschutz, Impressum, Nutzungsbedingungen)

---

## Technische Umsetzung

### Neue Dateien
- `src/pages/Start.tsx` -- Hauptkomponente der Start-Seite
- `src/components/landing/HeroSection.tsx` -- Hero mit CTAs
- `src/components/landing/HowItWorks.tsx` -- 3-Schritte-Erklarung
- `src/components/landing/USPSection.tsx` -- Alleinstellungsmerkmale
- `src/components/landing/TargetAudience.tsx` -- Eltern/Kinder Split
- `src/components/landing/PricingComparison.tsx` -- Free vs Premium Tabelle

### Anpassungen an bestehenden Dateien
- **`src/App.tsx`**: Neue Route `/start` hinzufugen
- **`src/pages/Index.tsx`**: Wenn kein User eingeloggt und `showAuth === false`, Redirect auf `/start`

### Navigation
- `/start` -- Offentliche Start-Seite (neuer Haupteinstieg fur Besucher)
- `/` -- App-Einstieg (Login, Dashboard, Game-Flow wie bisher)
- Start-Seite verlinkt auf `/` mit Query-Parametern:
  - `/?auth=true` fur Login/Register
  - `/?demo=true` fur Demo-Modus (Klasse 3)

### Design
- Bestehendes Design-System (Tailwind, Gradient-Variablen, Card-Komponenten)
- Mobile-first, responsive
- Sanfte Scroll-Animationen via CSS (keine neuen Dependencies)
- Icons aus `lucide-react`


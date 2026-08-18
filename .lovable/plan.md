# Landingpage /start & Einstieg überarbeiten

## Vorabprüfung (Antworten auf deine drei Fragen)

**1. Zahlungsdaten bei der Registrierung?** Nein. Der Trigger `on_profile_created_trial` legt beim Anlegen des Profils automatisch ein Abo mit Status `trialing` und `trial_end = now() + 28 Tage` an. Es wird weder Stripe noch RevenueCat angefasst. Die Aussage "4 Wochen kostenlos, keine Zahlungsdaten nötig" ist also korrekt und darf so beworben werden.

**2. KI-Lernpläne produktiv?** Ja. Tabelle `learning_plans` + Edge Function `generate-learning-plan` + UI `LearningPlanGenerator` sind live und im Eltern-Dashboard eingebunden (Premium-gated). Aktuell sind erst 3 Pläne von 1 Elternteil erzeugt worden – funktionsfähig, aber wenig genutzt.

**3. Bleiben Premium-Einstellungen nach Trial-Ende erhalten?** Ja. `child_settings` und `child_subject_visibility` werden nie gelöscht oder zurückgesetzt; nach Trial-Ende sind die Felder in `ChildSettingsEditor` nur noch `disabled`. Die gespeicherten Werte bleiben in der DB und werden bei einem Upgrade sofort wieder wirksam. **Aber:** In der gesperrten Ansicht sind die Werte hinter dem `PremiumFeature`-Overlay auf 40 % Deckkraft kaum lesbar – das wird angepasst.

## Was umgesetzt wird

### 1. Hero & Einstieg (`HeroSection.tsx`)
- Zusatzzeile unter dem Subtext: "4 Wochen alle Funktionen kostenlos – keine Zahlungsdaten nötig."
- "Demo ausprobieren" wird visuell klar sekundär (Ghost-Style statt gleichwertigem Outline-Button).

### 2. Demo mit echten Aufgaben
- Neue Security-Definer-RPC `get_demo_questions(p_grade, p_subject, p_limit)`, die zufällige, qualitätsgeprüfte Fragen aus `ai_question_cache` liefert (nur Frage-Felder, kein Tabellenzugriff für `anon`).
- `useQuestionPreloader` zieht im Demo-Modus zuerst über diese RPC; der statische Pool aus `demoQuestions.ts` bleibt als Fallback, wenn die RPC leer/fehlerhaft ist.
- Auth-Guards, `demoMode`-Ableitung und Native-Sperre bleiben unverändert.

### 3. Übergang nach der Demo (`GameCompletionScreen.tsx` + `LearningGame.tsx`)
- Neuer Prop `demoMode`: Statt "Weiter" erscheint ein Abschlussblock "So sieht es für dein Kind aus" mit den beiden Schritten (Eltern-Konto anlegen → Kind per Code verbinden) und primärem CTA "Kostenlos registrieren" (Tracking `landing_cta_click`, position `demo_end`).

### 4. Setup-Erklärung auf der Landingpage
- Neue Komponente `SetupSteps.tsx` ("So richtest du es in 3 Minuten ein"): 1) Eltern-Konto anlegen, 2) Kind-Konto per Einladungscode verbinden, 3) Belohnung pro Fach festlegen. Wird in `Start.tsx` zwischen USP und Preisen eingehängt.

### 5. Ehrlichkeitsblock (`Start.tsx`)
- Kurzer Abschnitt "Was heute noch nicht geht" (z. B. keine automatische Sperre des Geräts durch LernZeit – Freigabe erfolgt durch die Eltern; Fächerabdeckung je nach Klasse unterschiedlich tief). Sachlich, ohne Nennung fremder Betriebssystem-Marken.

### 6. Feature-Kommunikation: KI-Lernplan statt KI-Tutor
- In `PricingComparison.tsx` und `USPSection.tsx` wird "KI-Tutor Erklärungen" durch "KI-Lernplan zur Klassenarbeit" ersetzt bzw. ergänzt; Trial-Hinweiszeile über den Preiskarten.
- Preise (2,99 € / 29,99 €) und die Native-Weiche bleiben unangetastet.

### 7. Paywall zeigt gespeicherte Werte (`PremiumGate.tsx`)
- `PremiumFeature`-Overlay wird lesbarer (höhere Deckkraft des Inhalts, Overlay nur als Karte am unteren Rand), damit Eltern nach Trial-Ende ihre gespeicherten Einstellungen weiterhin sehen. Zusatztext: "Deine Einstellungen bleiben gespeichert."

## Nicht angefasst
`useAuth.ts`, `nativeStorageAdapter.ts`, Session-/Auth-Logik, Android-Konfiguration, Preislogik, RevenueCat/Stripe-Flows.

# Monetarisierungsplan: LernZeit Premium (Freemium-Modell)

## Uebersicht

LernZeit wird ein Freemium-Modell erhalten. Eltern koennen ueber ihr Eltern-Dashboard auf Premium upgraden. Die Zahlung erfolgt ueber Stripe. Kinder sehen keine Bezahl-UI -- sie bekommen lediglich Premium-Features freigeschaltet, wenn der Eltern-Account Premium hat.

---

## Free vs. Premium -- Feature-Matrix

### Bereits vorhandene Features, die zu Premium werden


| Feature                                                | Free                                | Premium                    |
| ------------------------------------------------------ | ----------------------------------- | -------------------------- |
| Bildschirmzeit-Limits anpassen (Wochentags/Wochenende) | Feste Defaults (30/60 Min)          | Frei einstellbar           |
| Zeit pro Aufgabe anpassen (Sekunden/Fach)              | Feste Defaults (30 Sek)             | Frei einstellbar           |
| Sichtbare Faecher ein-/ausschalten                     | Alle sichtbar                       | Individuell konfigurierbar |
| Lernanalyse (Analyse-Tab)                              | Einfache Uebersicht (letzte 7 Tage) | Volle Analyse mit Trends   |


### Neue Premium-Features


| Feature                       | Beschreibung                                                                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **KI-Tutor**                  | Kinder koennen bei falschen Antworten einen interaktiven Tutor aufrufen, der das Thema kindgerecht und im Dialog erklaert (nicht nur eine statische Erklaerung) |
| **Detaillierte Lernberichte** | Woechentliche Zusammenfassung per E-Mail oder im Dashboard                                                                                                      |
| **Mehrere Kinder**            | Free: 1 Kind, Premium: unbegrenzt                                                                                                                               |


### Zusaetzliche Ideen fuer Premium

&nbsp;

1. **Eigene Lernziele setzen** -- Eltern koennen woechentliche Mindest-Lernziele definieren
2. **Themen-Schwerpunkte** -- Eltern koennen Schwaechen-Faecher priorisieren lassen
3. **Offline-Modus** -- Fragen fuer unterwegs vorab laden (PWA-Erweiterung)

---

## Technischer Implementierungsplan

### Phase 1: Datenbank und Subscription-Grundlage

**Neue Tabelle `subscriptions`:**

```text
subscriptions
  - id (uuid, PK)
  - user_id (uuid, FK profiles)
  - stripe_customer_id (text)
  - stripe_subscription_id (text)
  - plan (enum: 'free', 'premium')
  - status (enum: 'active', 'canceled', 'past_due', 'trialing')
  - current_period_start (timestamptz)
  - current_period_end (timestamptz)
  - trial_end (timestamptz, nullable)
  - created_at (timestamptz)
  - updated_at (timestamptz)
```

**RLS-Policies:** Nur der Besitzer kann seine eigene Subscription lesen. Schreiben nur ueber Edge Functions (service_role).

**Hilfsfunktion:**

```text
is_premium(user_id uuid) -> boolean
  Prueft ob der User eine aktive Premium-Subscription hat.
  SECURITY DEFINER, damit es in RLS verwendet werden kann.
```

### Phase 2: Stripe-Integration

- **Stripe aktivieren** ueber die Lovable Stripe-Integration
- **Edge Function `create-checkout**`: Erstellt eine Stripe Checkout Session fuer den Eltern-Account
- **Edge Function `stripe-webhook**`: Empfaengt Stripe-Events (subscription.created, updated, deleted) und aktualisiert die `subscriptions`-Tabelle
- **Edge Function `customer-portal**`: Oeffnet das Stripe Customer Portal zur Abo-Verwaltung

### Phase 3: Premium-Gate im Frontend

**Neuer Hook `useSubscription`:**

- Laedt den Subscription-Status des aktuellen Users
- Stellt `isPremium`, `isTrialing`, `plan` bereit
- Fuer Kind-Accounts: Prueft den Premium-Status des verknuepften Eltern-Accounts

**Premium-Gate-Komponente:**

- Wraps um Premium-Features
- Zeigt ein Upgrade-Hinweis mit Call-to-Action wenn nicht Premium
- Leitet zum Stripe Checkout weiter

**Aenderungen an bestehenden Komponenten:**

- `ChildSettingsEditor`: Bildschirmzeit-Limits und Faecher-Toggles nur bearbeitbar wenn Premium, sonst "Premium erforderlich"-Hinweis mit Defaults
- `ChildLearningAnalysis`: Erweiterte Analyse nur fuer Premium
- Spiel-UI (nach falscher Antwort): "KI-Tutor"-Button nur fuer Premium-Kinder sichtbar

### Phase 4: KI-Tutor (neues Premium-Feature)

**Edge Function `ai-tutor`:**

- Erweitert den bestehenden `ai-explain`-Ansatz zu einem interaktiven Dialog
- Kind kann Rueckfragen stellen ("Ich verstehe nicht, warum...")
- Streaming-Antworten fuer natuerliches Gespraechsgefuehl
- Begrenzt auf den Kontext der aktuellen Frage/des aktuellen Themas

**Frontend-Komponente `TutorDialog`:**

- Oeffnet sich als Sheet/Dialog nach falscher Antwort
- Chat-Interface mit kindgerechtem Design
- Zeigt die urspruengliche Frage als Kontext
- Max. 5 Nachrichten pro Dialog (Kostenkontrolle)

### Phase 5: Eltern-Dashboard Erweiterungen

**Neuer Tab "Abo" im ParentDashboard:**

- Aktueller Plan-Status (Free/Premium)
- Upgrade-Button mit Feature-Vergleich
- Link zum Stripe Customer Portal fuer Abo-Verwaltung
- Rechnungsverlauf

**Premium-Hinweise in der App:**

- Dezente Badges an Premium-Features im Eltern-Dashboard
- Einmaliger Upgrade-Hint beim ersten Login (kein aggressives Upselling)
- Im Kind-Dashboard: Keine Bezahl-Hinweise -- Features sind einfach da oder nicht

---

## Reihenfolge der Umsetzung

1. **Stripe aktivieren** und Grundlagen schaffen (Tabelle, Webhook, Checkout)
2. `**useSubscription`-Hook** und Premium-Gate-Komponente bauen
3. **Bestehende Features gaten** (Bildschirmzeit-Einstellungen, Faecher-Sichtbarkeit)
4. **Abo-Tab im Eltern-Dashboard** einbauen
5. **KI-Tutor** als Premium-Feature implementieren
6. **Testen** des kompletten Flows: Free-Nutzer sieht Einschraenkungen, Upgrade, Premium-Features freigeschaltet
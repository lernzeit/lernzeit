# Prüfung gegen die geänderten App-Review-Richtlinien (Stand 17.10.2026)

Geprüft: Code in `main` (13.–15.10.2026) gegen die Änderungen 1.2, 2.3.14, 2.5.19,
3.1.1(a), 5 sowie die Kinder-Regeln 1.3 und 5.1.4 (die Datenschutz-Unterlagen
führen LernZeit in der Kids Category). Nicht geprüft: App Store Connect
(Altersfreigabe, Kategorie, Datenschutzangaben, Review-Hinweise) – das sieht nur
der Betreiber.

| Regel | Ergebnis | Was zu tun ist |
|---|---|---|
| **1.2** Nutzerinhalte, „AI content creation apps“ | **Lücke (mittel)** | Siehe unten, Punkt 1 |
| **2.3.14** Creative Assets | Nicht betroffen, solange keine genutzt werden | Beim Einsatz: kein Preis, keine Rabatte, keine unbelegten Aussagen („4 Wochen kostenlos“ nicht hinein) |
| **2.5.19** versteckte, ruhende, undokumentierte Funktionen | **Lücke (mittel)** | Siehe unten, Punkt 2 |
| **3.1.1(a)** Links zu anderen Kaufwegen | **In Ordnung** | Nativ kein Stripe-Weg: `handleParentUpgrade` öffnet den RevenueCat-Kauf, die Paywall zeigt ohne RevenueCat nur „nicht verfügbar“, Kündigen/Rechnungen nur im Web. Offen: „Verschenken“ (Siehe Punkt 4) |
| **5** Ausbeutung von Kindern | In Ordnung | Kein Chat und keine Kinder-Beiträge; das Ideen-Forum schreiben nur Eltern |
| **1.3 / 5.1.4** Kinder | **Eine Stelle behoben, eine offen** | Punkt 3 |

## 1. Regel 1.2: Nutzerinhalte und KI

Verlangt: Filter, Meldeweg, Sperren von Nutzern, veröffentlichte Kontaktdaten.

- **Kontakt:** vorhanden (`/support`, info@lernzeit.app, Link im Fuß).
- **KI-Tutor und „Klecksi erklärt“:** Kinder tippen Freitext, die KI antwortet.
  Es gibt nur den Systemprompt („nur schulische Themen“) und eine Längenbegrenzung,
  **keinen Meldeweg für eine KI-Antwort** (gemeldet werden können nur Aufgaben).
  Ob Apple das als „AI content creation app“ wertet, ist offen; ein Meldeknopf
  „Antwort melden“ im Tutor-Dialog kostet wenig und schließt die Lücke.
- **Ideen-Forum (`/ideen`):** Eltern schreiben Ideen und Kommentare, andere Eltern
  (und angemeldete Kinder) lesen sie. Es gibt keinen Filter und keinen Meldeweg
  für fremde Beiträge. Entweder „Beitrag melden“ ergänzen oder das Forum in der
  iOS-App ausblenden.

## 2. Regel 2.5.19: versteckte oder ruhende Funktionen

Alles, was in der App steckt, soll für Nutzer und App Review erkennbar sein.

- **Handysperre (Family Controls):** Berechtigung und Code sind im iOS-Build, die
  Oberfläche zeigt sie nur Kindern in `handysperre_freigaben` (Klara). Der Prüfer
  sieht sie nicht, hat aber die Berechtigung im Binary. Zwei Wege: (a) in den
  Review-Hinweisen beschreiben und ein Prüfkonto eintragen, (b) für diese Version
  weglassen. Ohne eines von beiden droht der Vorwurf „dormant feature“.
- **Tester-Code bei der Registrierung (Eltern):** schaltet „Gründerfamilie“-Vorteile
  frei, steht nirgends in den Store-Texten. In den Review-Hinweisen erklären oder
  in der iOS-App ausblenden.
- **Adventskalender (nur 1.–26.12.):** in den Store-Texten genannt, in den
  Review-Hinweisen mit Datum erwähnen.
- Die Werkbank `VITE_SCREENTIME_UI` ist im Store-Build aus (`codemagic.yaml`), in
  Ordnung.

Vorschlag für die Review-Hinweise (Englisch, Apple liest die Hinweise):

> LernZeit lets children earn screen time by solving school tasks; parents approve.
> Seasonal: Advent calendar visible 1–26 December. Optional: a parent can enter a
> tester code at sign-up. Device lock (Family Controls) is enabled only for
> accounts on an allow-list while we finish testing; test account for review: …

## 3. Kinder (1.3, 5.1.4)

- **Behoben (17.10.2026):** Auf dem Kinder-Gerät führten in „Sperre und Freigabe“
  zwei Links aus der App heraus (Apple-Anleitung, Family Link im Play Store), ohne
  Eltern-Hürde. In den Apps stehen dort jetzt nur die Schritte, die Links nur im
  Browser. (Der Knopf „Einstellungen öffnen“ springt in die iOS-Einstellungen und
  bleibt.)
- **Offen, unverändert seit Beginn:** OneSignal läuft auch auf Kinder-Geräten
  (Push-Token plus Konto-ID als `external_id`). Für die Kids Category gilt „keine
  Geräteinformationen an Dritte“. Das gehört in die Antwort der Kanzlei
  (`docs/anwalt-auftrag.md`). Technisch möglich: Kinder-Pushes lokal statt über
  OneSignal, oder Kinder nur über die Eltern-Geräte benachrichtigen.

## 4. Zu prüfen (gering)

- **Verschenken / Empfehlungsprogramm:** schenkt Premium-Monate außerhalb des
  Kaufs. Apple erlaubt kostenlose Zeiträume, wenn kein eigener Kaufweg daran
  hängt; im iOS-Build sollte kein Hinweis auf „im Web günstiger“ o. Ä. stehen
  (nicht gefunden).
- **Datenschutzangaben im App Store** nach jeder Version abgleichen (2.1.0:
  geöffnete Adventstürchen, Lerntage; steht in `docs/store-texte-2.1.0.md`).

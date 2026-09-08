# Faktenprüfung

**Zweck.** Bevor eine Zahl oder eine Zusage in eine Anzeige, auf die Landingpage
oder in den App-Store-Text geht, wird sie hier gegen **Code und Datenbank**
geprüft — nicht gegen ein Marketing-Dokument und nicht gegen eine Erinnerung.

**Regel.** Nur Zeilen mit Status **bestätigt** dürfen in Werbetexte.
*Abweichend* wird vorgelegt und entweder der Text oder das Produkt korrigiert.
*Nicht prüfbar* wird nicht behauptet.

**Prüfdatum aller Zeilen:** 08.09.2026

---

## Ergebnis auf einen Blick

| | Anzahl |
|---|---|
| bestätigt | 9 |
| abweichend | 3 |
| nicht prüfbar | 2 |

Zwei der drei Abweichungen betreffen Sätze, die heute schon so in der App
stehen. Sie sind damit nicht nur ein Werbeproblem.

---

## 1. Testphase dauert 4 Wochen

**Status: ABWEICHEND**

| | |
|---|---|
| Fundstelle | Datenbankfunktion `handle_new_user`, ebenso `link_referral` |
| Tatsächlicher Wert | `trial_end = now() + interval '30 days'` |
| Behauptet | 4 Wochen = 28 Tage |

30 Tage sind zwei Tage mehr als vier Wochen. In den echten Daten stehen
zusätzlich Trials mit 17 und 28 Tagen — vermutlich Altbestand oder manuell
gesetzt.

**Empfehlung:** In der Werbung „**30 Tage kostenlos testen**" sagen. Das ist
korrekt, klingt großzügiger als vier Wochen und muss nirgends geändert werden.
Wer „4 Wochen" schreibt, verspricht weniger, als das Produkt gibt — und ist
trotzdem falsch.

---

## 2. Gültigkeitsdauer des Einladungscodes

**Status: BESTÄTIGT — 7 Tage, einmalig verwendbar**

| | |
|---|---|
| Erzeugung | `src/hooks/useFamilyLinking.ts`, `expiresAt.setDate(+7)` |
| Datenbank-Vorgabe | `invitation_codes.expires_at` Standard `now() + '7 days'` |
| Einlösung | RPC `claim_invitation_code` prüft `is_used = false`, `expires_at > now()`, `child_id IS NULL` |

Alle drei Stellen stimmen überein. Der Code ist sechsstellig und nach einmaliger
Nutzung verbraucht.

---

## 3. 30 Sekunden je richtiger Aufgabe

**Status: BESTÄTIGT**

| | |
|---|---|
| Fundstelle | `child_settings`, Spalten `*_seconds_per_task` |
| Tatsächlicher Wert | Standard **30** in allen zehn Fächern |

Eltern können den Wert je Fach ändern — das ist eine Premium-Funktion
(siehe Zeile 8).

---

## 4. Höchstens 30 Minuten am Tag

**Status: ABWEICHEND — am Wochenende sind es 60**

| | |
|---|---|
| Fundstelle | `child_settings.weekday_max_minutes`, `weekend_max_minutes` |
| Tatsächlicher Wert | **werktags 30**, **am Wochenende 60** |

Der Satz „Standard: 30 Sekunden pro richtiger Aufgabe, höchstens 30 Minuten am
Tag" steht heute so in der App — in `ChildSettingsEditor.tsx:357` und in
`OnboardingNextStepCard.tsx:149`. Am Wochenende ist er falsch.

**Empfehlung:** Entweder den Text auf „werktags 30, am Wochenende 60 Minuten"
ändern, oder den Standard vereinheitlichen. Solange das offen ist, gehört die
Zahl in keine Anzeige.

---

## 5. Preise 2,99 € pro Monat, 29,99 € pro Jahr

**Status: BESTÄTIGT (für App und Web)**

| | |
|---|---|
| Fundstelle | `src/config/pricing.ts` mit den Stripe-Price-IDs und den Anzeigetexten |
| Tatsächlicher Wert | 2,99 € / Monat, 29,99 € / Jahr |

**Einschränkung:** Das Stripe-Konto selbst konnte nicht abgefragt werden — der
Stripe-Zugang ist in dieser Umgebung nicht freigeschaltet. Geprüft ist damit,
was die App anzeigt und welche Preis-IDs sie verwendet, nicht der bei Stripe
hinterlegte Betrag. Vor der ersten Anzeige einmal im Stripe-Konto gegenlesen.

---

## 6. iOS-App ist live

**Status: NICHT PRÜFBAR**

Die Abfrage der Apple-Store-Schnittstelle wird vom Netzwerk dieser
Arbeitsumgebung blockiert (HTTP 403 beim Verbindungsaufbau).

Bekannt ist: Die Build-Konfiguration liefert `IOS_MARKETING_VERSION 1.2.5`
(`codemagic.yaml`), die App-Store-ID lautet `6789603688`.

**Zu tun:** Store-Seite selbst aufrufen und Version notieren.

---

## 7. Android-App ist live

**Status: NICHT PRÜFBAR** — gleicher Grund.

Bekannt ist: `versionCode 15`, `versionName 1.2.5` in
`android/app/build.gradle`, Paketname `de.lernzeit.app`.

---

## 8. Unbegrenzt viele Kinderprofile, alle Fächer und Klassenstufen kostenlos

**Status: TEILWEISE — die erste Hälfte stimmt, die zweite ist missverständlich**

**Kinderprofile:** Im gesamten Code findet sich **keine** Mengenbegrenzung.
Bestätigt.

**Fächer:** Kostenlos ja — aber nicht alle Fächer gibt es in allen Klassen.
Aus `SUBJECT_GRADE_CONSTRAINTS` im Fragen-Generator:

| Fach | verfügbar ab Klasse |
|---|---|
| Mathematik, Deutsch | 1 |
| Sachkunde | 1–4 |
| Englisch | 3 |
| Erdkunde, Geschichte, Physik, Biologie, Latein | 5 |
| Chemie | 7 |

Das ist inhaltlich richtig — Chemie in Klasse 3 wäre unsinnig. „Alle Fächer"
erweckt aber den Eindruck, ein Drittklässler bekäme zehn Fächer. Er bekommt
vier.

**Formulierung, die stimmt:** „Alle Fächer der jeweiligen Klassenstufe,
Klasse 1 bis 10."

---

## 9. Premium-Funktionen existieren und sind erreichbar

**Status: BESTÄTIGT für drei Funktionen**

| Funktion | Fundstelle |
|---|---|
| KI-Lernplan für Klassenarbeiten | `LearningPlanGenerator.tsx:81` — an `isPremium \|\| isTrialing` gebunden |
| Anpassbare Tagesobergrenze | `ChildSettingsEditor.tsx:396`, in `PremiumFeature` gekapselt |
| Erweiterte Lernanalyse | `ChildLearningAnalysis.tsx` |

**Warnung zum KI-Lernplan:** Er ist die auffälligste Premium-Zusage, aber laut
Nutzungsdaten praktisch ungenutzt (drei Pläne, ein Nutzer). Vor einer Anzeige,
die ihn bewirbt, selbst mehrfach durchspielen.

---

## 10. Verdiente Zeit wird NICHT automatisch freigegeben

**Status: BESTÄTIGT — sie wird weiterhin von Hand freigegeben**

| | |
|---|---|
| Fundstelle | `child_settings.screen_time_managed` Standard `false`, `screen_time_auto_release` Standard `false` |
| Zustand | Die Gerätesperre über Apple Family Controls ist gebaut, aber nicht ausgeliefert |

Eltern geben die verdiente Zeit heute in Family Link beziehungsweise in Apples
Bildschirmzeit selbst frei.

**Wichtig für die Werbung:** Das ist der Punkt, an dem Eltern erfahrungsgemäß
abspringen, wenn sie etwas anderes erwartet haben. Er gehört offen kommuniziert,
nicht versteckt. Sobald die automatische Freigabe ausgeliefert ist, ist diese
Zeile neu zu prüfen — dann wird daraus das stärkste Argument überhaupt.

---

## 11. Server in der EU

**Status: BESTÄTIGT**

| | |
|---|---|
| Fundstelle | Supabase-Projekt `fsmgynpdfxkaiiuguqyr`, Region `eu-central-1` (Frankfurt) |

---

## 12. Keine Weitergabe von Daten an Dritte

**Status: BESTÄTIGT für den heutigen Stand — wird durch bezahlte Werbung ungültig**

Eingebundene Dritte laut Content-Security-Policy in `index.html` und
`package.json`: Supabase (EU), Stripe (Zahlungen), RevenueCat (App-Abos),
Google-Login, OneSignal (Push in der nativen App). **Kein Werbe-SDK.**

Die Datenschutzerklärung sagt heute wörtlich:

> „Es werden keine Daten an Dritte zu Werbezwecken weitergegeben"
> „Es sind keine Werbe-SDKs [eingebunden]"

Das stimmt — **noch**. Google-Ads-Conversions und Meta CAPI sind genau das
Gegenteil.

**Blocker:** Die Datenschutzerklärung muss überarbeitet und juristisch geprüft
sein, **bevor** der erste Euro Werbebudget fließt. Solange diese Sätze dort
stehen, wäre bezahlte Werbung ein Verstoß gegen die eigene veröffentlichte
Zusage.

---

## Wie diese Prüfung wiederholt wird

Sie ist heute von Hand gemacht. Der Befehl `npm run agent -- verify-claims`
kommt in einer späteren Phase und automatisiert die Zeilen, die sich
automatisieren lassen (1, 2, 3, 4, 5, 8, 10, 11). Die Store-Zeilen (6, 7)
bleiben manuell, solange das Netzwerk der Arbeitsumgebung die Store-Abfragen
blockiert.

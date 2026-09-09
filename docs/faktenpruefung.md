# Faktenprüfung

**Zweck.** Bevor eine Zahl oder eine Zusage in eine Anzeige, auf die Landingpage
oder in den App-Store-Text geht, wird sie hier gegen **Code und Datenbank**
geprüft — nicht gegen ein Marketing-Dokument und nicht gegen eine Erinnerung.

**Regel.** Nur Zeilen mit Status **bestätigt** dürfen in Werbetexte.
*Abweichend* wird vorgelegt und entweder der Text oder das Produkt korrigiert.
*Nicht prüfbar* wird nicht behauptet.

**Prüfdatum aller Zeilen:** 08.09.2026
**Zuletzt überarbeitet:** 08.09.2026 nach Rückmeldung zu den Punkten 1, 4 und 12

---

## Ergebnis auf einen Blick

| Nr. | Punkt | Status |
|---|---|---|
| 1 | Testphase „4 Wochen" | bestätigt als bewusste Rundung — tatsächlich 30 Tage |
| 2 | Einladungscode 7 Tage, einmalig | bestätigt |
| 3 | 30 Sekunden je richtiger Aufgabe | bestätigt |
| 4 | Tagesobergrenze als Standard | bestätigt — werktags 30, am Wochenende 60 |
| 5 | Preise 2,99 € / 29,99 € | bestätigt im Code, im Stripe-Konto offen |
| 6 | iOS-App live | nicht prüfbar (Netzsperre) |
| 7 | Android-App live | nicht prüfbar (Netzsperre) |
| 8 | Kinderprofile unbegrenzt / alle Fächer | teils bestätigt, teils missverständlich |
| 9 | Premium-Funktionen erreichbar | bestätigt |
| 10 | Verdiente Zeit nicht automatisch freigegeben | bestätigt |
| 11 | Server in der EU | bestätigt |
| 12 | Keine Datenweitergabe an Dritte | drei Sätze kollidieren mit Werbe-Tracking |

Kein Punkt beschreibt mehr ein kaputtes Produkt. Punkt 12 beschreibt Sätze,
die vor der ersten Schaltung präziser gefasst werden müssen — siehe dort.

---

## 1. Testphase dauert 4 Wochen

**Status: BESTÄTIGT als bewusst gewählte Rundung**

| | |
|---|---|
| Fundstelle | Datenbankfunktion `handle_new_user`, ebenso `link_referral` |
| Tatsächlicher Wert | `trial_end = now() + interval '30 days'` |
| Kommuniziert | 4 Wochen |

30 Tage sind zwei Tage mehr als vier Wochen. In den echten Daten stehen
zusätzlich Trials mit 17 und 28 Tagen — vermutlich Altbestand oder manuell
gesetzt.

**Entscheidung vom 08.09.2026: „4 Wochen" bleibt.** Die Zahl ist griffiger,
und sie verspricht *weniger*, als das Produkt liefert. Wer nach vier Wochen
nachsieht, hat noch zwei Tage übrig — das ist die Richtung, in der eine
Abweichung unproblematisch ist. Umgekehrt wäre es ein Problem.

**Für die Werbung heißt das:** Anzeige und Landingpage sagen beide
„4 Wochen". Wichtig ist nicht, welche der beiden Zahlen dort steht, sondern
dass überall dieselbe steht — Google prüft die Übereinstimmung zwischen
Anzeige und Zielseite.

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

**Status: BESTÄTIGT als Standardwert — mit einer Einschränkung im Wortlaut**

| | |
|---|---|
| Fundstelle | `child_settings.weekday_max_minutes`, `weekend_max_minutes` |
| Tatsächlicher Wert | **werktags 30**, **am Wochenende 60** |
| Änderbar | ja, in Testphase und Premium (`ChildSettingsEditor.tsx:396`, in `PremiumFeature` gekapselt) |

Es handelt sich um Voreinstellungen, nicht um eine feste Obergrenze des
Produkts. Eltern passen sie an. Das ist geprüft und bestätigt.

**Was bleibt:** Der Satz „Standard: 30 Sekunden pro richtiger Aufgabe,
höchstens 30 Minuten am Tag" (`ChildSettingsEditor.tsx:357`,
`OnboardingNextStepCard.tsx:149`) beschreibt den Werktags-Standard und nennt
den Wochenend-Standard nicht. Ein Elternteil, das ihn am Samstag liest, sieht
im Produkt 60 Minuten stehen.

**Kleiner Vorschlag, keine Baustelle:** ein Wort einfügen — „höchstens 30
Minuten an Schultagen, 60 am Wochenende". Zwei Textstellen. Ob sich das
lohnt, entscheidest du.

**Für die Werbung:** Die Zahl kommt in keine Anzeige — nicht weil sie falsch
wäre, sondern weil „höchstens 30 Minuten" in 30 Zeichen ohne den Zusatz
„Standard, anpassbar" wie eine Produktgrenze klingt. Beworben wird, dass
Eltern die Grenze setzen, nicht welche.

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

**Vorsicht beim KI-Lernplan:** Er ist die auffälligste Premium-Zusage und
zugleich die am wenigsten erprobte — bisher nur vereinzelt durchgespielt, und
das im internen Test. Das ist kein Nutzungsbefund (es hat noch nie Werbung
gegeben, siehe Positionierung Abschnitt 0), sondern schlicht fehlende
Erprobung. Vor einer Anzeige, die ihn bewirbt, selbst mehrfach durchspielen.

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

**Status: ÜBERWIEGEND BESTÄTIGT — drei Sätze und ein Wort sind zu ändern**

Eingebundene Dritte laut Content-Security-Policy in `index.html` und
`package.json`: Supabase (EU), Stripe (Zahlungen), RevenueCat (App-Abos),
Google-Login, OneSignal (Push in der nativen App). **Kein Werbe-SDK.**

### Der Unterschied, auf den es ankommt

Zwei Dinge, die beide „Werbung" heißen und nichts miteinander zu tun haben:

| | |
|---|---|
| **Werbung *in* der App** | Anzeigen, die Kindern eingeblendet werden. Gibt es nicht, soll es nicht geben, ist nicht geplant. |
| **Werbung *für* die App** | Anzeigen bei Google und Meta, die Eltern auf lernzeit.app führen. Genau das ist geplant. |

Die Datenschutzerklärung meint an den meisten Stellen das erste. Diese Sätze
bleiben wahr und werden nicht angefasst. Nur dort, wo sie flächendeckend
formuliert sind, kollidieren sie mit dem zweiten.

### Sätze, die unverändert wahr bleiben

| Fundstelle | Satz | Warum er hält |
|---|---|---|
| `Datenschutz.tsx:119` | „In LernZeit wird weder personalisierte noch kontextbezogene Werbung Dritter ausgespielt. Es sind keine Werbe-SDKs integriert." | Betrifft Anzeigen *in* der App. Eine Google-Anzeige, die auf die App hinweist, wird nicht in der App ausgespielt. Meta CAPI läuft serverseitig, ohne SDK. |
| `Datenschutz.tsx:129` | „Daten von Kindern werden nicht für Marketing-, Profiling- oder Analysezwecke Dritter verwendet oder verkauft." | Ausdrücklich auf Kinder bezogen. Conversions werden ausschließlich aus Elternkonten gemeldet — Abschnitt 7 der Positionierung. |
| `Datenschutz.tsx:134` | „ohne Werbe-Identifier (IDFA/AAID)" | Serverseitige Conversions mit gehashter E-Mail brauchen keine Geräte-Werbe-ID. |

### Sätze, die geändert werden müssen

| Fundstelle | Satz | Problem |
|---|---|---|
| `Datenschutz.tsx:110` | „Es werden keine Daten an Dritte zu Werbezwecken weitergegeben" | Steht in der Kinder-Liste, ist aber ohne Einschränkung formuliert. Fehlt ein Wort: **„keine Daten von Kindern"**. |
| `Datenschutz.tsx:124` | „Wir nutzen keine Tracking-Technologien geräte- oder app-übergreifend." | Ein Google-Ads-Tag oder ein Meta-Pixel auf lernzeit.app **ist** eine seitenübergreifende Tracking-Technologie. Dieser Satz hält nicht. |
| `Datenschutz.tsx:180` | „Diese Dienste werden ausschließlich zum Betrieb der App eingesetzt und nicht für Werbezwecke." | Google Ads und Meta wären neue Empfänger, die in der Liste darüber fehlen. |
| `Datenschutz.tsx:204` | „Es werden keine Tracking-Cookies oder Cookies für Werbezwecke verwendet." | Hält nicht, sobald ein Werbe-Tag auf der Website läuft. Muss zu einer Einwilligungs-Aussage werden. |

### Der Zuschnitt, der am wenigsten kaputt macht

Alle vier Stellen betreffen die **Website**, keine betrifft die App. Wenn das
Werbe-Tracking auf lernzeit.app beschränkt bleibt und **nichts** davon in die
native App wandert, dann gilt:

- Der Satz zur Werbefreiheit *in* der App bleibt wörtlich stehen.
- Der ATT-Satz bleibt richtig — die App fragt weiterhin keine
  Tracking-Erlaubnis ab, weil sie nicht trackt.
- Die Kids-Category-Zusagen gegenüber Apple bleiben unberührt.

**Das kostet nichts.** Der Trichter beginnt ohnehin auf der Website: Anzeige
→ lernzeit.app → Anmeldung als Elternteil. Kampagnen auf App-Installationen
wären das Gegenteil — sie bräuchten SDKs in der App und würden genau die
Sätze brechen, die heute halten. Deshalb: **keine App-Install-Kampagnen.**

**Kinder auf der Website — erledigt am 09.09.2026:** Die Schaltfläche „Ich bin
Kind" in `AuthForm.tsx:831` steht ohne Bedingung; ein Kind kann sich auch über
die Website registrieren. Das bleibt so, weil dieser Weg gewollt ist.
Ausgeschlossen ist stattdessen die Messung: `src/lib/analytics.ts` spiegelt
kein Ereignis eines Kindes nach `window.dataLayer` und damit auch nicht an
Google oder Meta. Geprüft mit `node scripts/test-analytics-audience.mjs`,
acht Fälle. Einzelheiten in `docs/datenschutz-entwurf.md`, Abschnitt 7.

**Zu tun vor dem ersten Euro:** Entwurf in `docs/datenschutz-entwurf.md`,
Prüfung durch eine Anwältin oder einen Anwalt, dann Umsetzung in
`Datenschutz.tsx`.

---

## Wie diese Prüfung wiederholt wird

Sie ist heute von Hand gemacht. Der Befehl `npm run agent -- verify-claims`
kommt in einer späteren Phase und automatisiert die Zeilen, die sich
automatisieren lassen (1, 2, 3, 4, 5, 8, 10, 11). Die Store-Zeilen (6, 7)
bleiben manuell, solange das Netzwerk der Arbeitsumgebung die Store-Abfragen
blockiert.

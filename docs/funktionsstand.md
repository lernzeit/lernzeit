# Funktionsstand: Handysperre und Freigabe

Stand 24.10.2026, App-Fassung 2.1.1 (`APP_STAND` 20261022, Commit `ef7d760`). Grundlage für Anzeigen, Seiten und Videos.
Der Betreiber hat am 24.10.2026 bestätigt: **Sperre und Freigabe funktionieren auf Apple.**

**Kurzfassung für Texte**

| | iPhone / iPad | Android |
|---|---|---|
| Sperre | Automatisch durch LernZeit (Apples Bildschirmzeit-Schnittstelle) | Keine. Es gibt keine Schnittstelle für Dritte; Eltern nutzen Google Family Link |
| Freigabe der verdienten Zeit | **Automatisch** nach „Genehmigen“, sobald LernZeit auf dem Kinder-Handy läuft | **Manuell**: Eltern genehmigen in LernZeit und geben die Minuten danach in Family Link als „Bonuszeit“ frei |
| Einmalig für Eltern | Kinder-iPhone in Apples Familienfreigabe, Sperre in LernZeit einrichten | Family Link einrichten |

Das Wort „automatisch“ gilt nur für iPhone und iPad, nur in der LernZeit-App (nicht im Browser) und erst ab der Fassung mit Handysperre (Build nach dem 22.10.2026).
Das Kind muss nach der Genehmigung nichts tun außer LernZeit zu öffnen (oder die Mitteilung zur Freigabe anzutippen). Ein Fernzugriff von den Eltern aus gibt es bei Apple nicht.

---

## 1. Ablauf iOS

### 1.1 Wie die Sperre technisch funktioniert

LernZeit nutzt Apples **Familienaktivitäts-Schnittstellen** (FamilyControls, ManagedSettings, DeviceActivity), nicht Kurzbefehle und nicht den Browser.
Eine eigene App-Erweiterung (Monitor und Sperrbildschirm) läuft auf dem Kinder-iPhone auch dann, wenn LernZeit geschlossen ist.
Kurzbefehle kommen im Produkt nicht vor; ein früherer Absprung in Apples Einstellungen (`src/services/parentalControls/ios.ts`, am 29.09.2026 mit Kurzbefehl getestet) wird seit dem 22.10.2026 nicht mehr benutzt.

Code: `native/screen-time/ios/Sources/ScreenTimePlugin/ScreenTimePlugin.swift` (`requestAuthorization`, `applyShield`, `setTagesbudget`), `ScreenTimeShared.swift` (Zustand, Tagesbudget, Restminuten), TypeScript-Seite `src/services/screenTime/` (`plugin.ts`, `release.ts`).

### 1.2 Einmalig: Das Elternteil richtet ein (auf dem Handy des Kindes)

1. **Voraussetzung:** Das Kind hat ein eigenes Apple-Kinderkonto und gehört zur Familienfreigabe des Elternteils (Einstellungen → Familie). Ohne das lehnt Apple ab (`invalidAccountType`, Text in `lib/geraeteAnleitung.ts` → `appleAblehnung`).
2. LernZeit aus dem App Store auf dem Kinder-iPhone installieren und mit dem **Konto des Kindes** anmelden (das Kind ist vorher mit dem Eltern-Konto verknüpft, siehe Abschnitt 5).
3. Im Kinder-Konto: **Zahnrad (Einstellungen) → Bildschirmzeit → Karte „Handy sperren“ → Knopf „Sperre einrichten“.**
4. iOS fragt nach der **Bildschirmzeit-Kennung** (das Elternteil gibt sie ein; Apple verlangt das nur beim ersten Mal).
5. Apple öffnet „Was zählt als Handyzeit?“: **„Alle Apps & Kategorien“ wählen, LernZeit abwählen.** Das ist Pflicht (ohne Auswahl zählt nichts).
6. LernZeit sperrt sofort alles außer Telefon und LernZeit (`applyShield`, `shieldAll`), gibt die Freiminuten des Tages frei und holt den Schlüssel für den **Elterncode**. Den gibt der Server nur nach „Erlauben“ des Elternteils auf dessen eigenem Handy heraus (Mitteilung bzw. Karte auf „Heute“); fehlt er danach noch, steht auf der Karte der Knopf „Elterncode einrichten“.
7. Optional auf dem Handy des Elternteils: **Kinder → Kind wählen → Regeln:** Freiminuten (werktags/Wochenende), Ruhezeit, Handysperre.

Danach ändert das Kind nichts mehr an der Sperre; jede Änderung (Ausnahmen „Immer erlaubt“, Zählen, Sperre aufheben) verlangt die Freigabe des Elternteils (`ParentGate`, `geraet_freigaben`) oder den Elterncode.

### 1.3 Täglicher Ablauf: Antrag und Freigabe

| Schritt | Wer | Was passiert | Automatisch? |
|---|---|---|---|
| 1 | Kind | Löst Aufgaben, verdient Minuten (richtige Aufgaben × Sekunden je Fach) | automatisch |
| 2 | Kind | Tippt auf der Start- oder Bildschirmzeit-Seite **„{n} Min. anfragen“**, optional eine Nachricht, bestätigt mit **„{n} Min. anfragen“** (ab 5 Minuten) | manuell (Kind) |
| 3 | System | Mitteilung an die Eltern (Push `screen_time_request_new`) | automatisch |
| 4 | Elternteil | Auf **Heute → Anfragen** den Knopf **„Genehmigen“** (oder „Ablehnen“) | **manuell (Eltern)** |
| 5 | System | Genehmigung wird gespeichert, Mitteilung an das Kind (Push `screen_time_approved`) | automatisch |
| 6 | Kinder-Handy | Sobald LernZeit läuft (Start, Rückkehr in die App, oder laufend per Echtzeit), bucht `gleicheFreigabenAb` die Genehmigung ein und setzt die Handyzeit des Tages neu (`setTagesbudget`) | **automatisch, aber erst wenn LernZeit auf dem Handy läuft** |
| 7 | Apple | Die Sperre öffnet und schließt sich selbst, je nachdem, wie viele Minuten der gezählten Apps genutzt wurden. LernZeit muss dafür nicht offen sein | automatisch |
| 8 | System | Mitteilungen an das Kind bei 15, 10, 5, 3 und 1 Minute Rest | automatisch |

Wichtig für Formulierungen: **Das Elternteil genehmigt immer von Hand.** Automatisch ist das Entsperren und das erneute Sperren auf dem Kinder-Handy. Es gibt keine automatische Genehmigung.

Belege (Beispiel Klaras Handy, anonymisiert, aus `screen_time_requests` und `screen_time_unlocks`):

| Tag | Genehmigt nach | Eingelöst nach Genehmigung |
|---|---|---|
| 20.10. | 0–34 Min. | 0–1 Min. (App war offen, Echtzeit) |
| 21.10. | 46–101 Min. | je 34 Min. (alle drei gleichzeitig, als das Kind LernZeit öffnete) |
| 22.10. | 0 Min. | 0 Min. |
| 24.10. | 0–126 Min. | 5, 17 und 347 Min. |

Das Muster bestätigt: Die Einlösung folgt dem Öffnen von LernZeit, nicht der Genehmigung. Die Genehmigung vom 23.10. (30 Min.) wurde erst am 24.10. eingelöst, nachdem die Sperre wieder eingerichtet war (siehe 4.3).

### 1.4 Weitere automatische Funktionen (iPhone)

- **Freiminuten** jeden Tag ohne Knopf (Standard 30 Min.; die Höhe ändern ist Premium).
- **Ruhezeit** (z. B. 21–6 Uhr): Apple sperrt ohne LernZeit.
- **Extra-Zeit** der Eltern: „+15 Min.“, „+30 Min.“, „Heute ohne Limit“ (Kinder → Regeln → Handysperre).
- **Elterncode**: 6 Ziffern, wechselt alle 30 Minuten, öffnet das Handy kurz auch ohne Internet; jede Nutzung meldet das Handy den Eltern.
- **„Eltern fragen“** auf dem Sperrbildschirm schickt die Bitte direkt an die Eltern (Build nach dem 20.10.2026; ob Apple der Erweiterung den Netzzugriff erlaubt, ist auf einem Gerät zu prüfen).
- **Hinweis „Handysperre ist aus“** für Eltern (Zeile auf „Heute“ und Karte beim Kind) und Mitteilung, wenn die Sperre ausgeht.

### 1.5 Tests

| Prüfung | Ergebnis (24.10.2026) | Wo |
|---|---|---|
| Einlösen von Genehmigungen, Tagesbudget, Nachholen, Fehlerfälle | `npm run test:release`: alle bestanden | `scripts/test-screen-time-release.mjs` |
| Texte und Regeln je Endgerät, Elterncode (feste Werte gegen SQL), Preise u. a. | `npm run test:reise`: 97 Prüfungen ok | `scripts/test-reise.mjs` |
| Aufbau der iOS-Erweiterungen im Build | `npm run test:ios`: alle bestanden | `scripts/test-ios-extensions.rb` |
| Praxis: Sperre und Freigabe auf einem echten iPhone | Klara, 21.10.2026 getestet, 24.10.2026 vom Betreiber bestätigt; Auswertung oben | Checkliste `docs/handysperre-pruefung.md` |

Noch ohne Test auf einem Gerät: der Swift-Teil wurde nur auf Syntax geprüft (kein Xcode in der Entwicklungsumgebung); erst der Build zeigt Typfehler.
Ein automatischer Test mit einem Testkonto (admin_testkonten, 7 Konten) ist hier nicht möglich: Die Sperre läuft nur auf einem echten iPhone mit Kinderkonto in Apples Familienfreigabe, nicht im Browser und nicht im Simulator.

---

## 2. Ablauf Android

Es gibt **keine eigene Sperre** und **keine automatische Freigabe**. Google bietet Drittanbietern keine Schnittstelle für Family Link (Kommentar `ChildSettingsMenu.tsx`, `docs/handysperre-pruefung.md`).
LernZeit ersetzt Family Link also nicht; es verwaltet nur Aufgaben, Verdienen und Genehmigen.

### 2.1 Einmalig

1. Family Link auf dem Handy des Elternteils installieren und das Handy des Kindes verbinden (Play Store; LernZeit verlinkt darauf: `FAMILY_LINK_PLAY_URL`).
2. Dort Tageslimit und Schlafenszeit einstellen.
3. In LernZeit das Kind mit dem Eltern-Konto verknüpfen (Abschnitt 5).

### 2.2 Täglicher Ablauf

| Schritt | Wer | Was | Automatisch? |
|---|---|---|---|
| 1–3 | wie iOS | Aufgaben, „{n} Min. anfragen“, Mitteilung an die Eltern | wie iOS |
| 4 | Elternteil | **Heute → Anfragen → „Genehmigen“**. Im Dialog: **„Genehmigen & Family Link öffnen“** oder **„Nur genehmigen (später freigeben)“** | manuell |
| 5 | Elternteil | In Family Link das Kind wählen, **„Bonuszeit“** antippen, Minuten für heute eintragen (Anleitung zum Aufklappen: „So gibst du die Zeit frei“) | **manuell** |
| 6 | Family Link | Gibt die Bonuszeit auf dem Handy des Kindes frei und sperrt wieder | Family Link, nicht LernZeit |

Hinweis: Der Absprung „Genehmigen & Family Link öffnen“ funktioniert nur in der Android-App (`parentalControls/android.ts`, Paketname `com.google.android.apps.kids.familylink`); LernZeit trägt die Minuten nicht in Family Link ein, sie nennt sie nur.

Tests: Texte und Absprung-Ziele sind in `npm run test:reise` abgedeckt; ein Praxistest mit Family Link liegt nicht vor (kein Android-Gerät mit Family-Link-Kind in dieser Umgebung).

---

## 3. Voraussetzungen

| Punkt | iPhone / iPad | Android |
|---|---|---|
| Betriebssystem | **iOS 16 oder neuer** (Apple-Schnittstelle). Genaue Zählung seit 0 Uhr ab **iOS 17.4**; davor zählt ein neu angelegtes Fenster ab dem Anlegen | Android 7 (API 24) oder neuer für die App; Family Link braucht eigene Voraussetzungen von Google |
| App oder Browser | **Nur die native LernZeit-App** auf dem Kinder-Handy. Im Browser steht stattdessen eine Anleitung („Handy sperren“, `SoGehtEs`) | App und Browser für die Aufgaben; die Sperre kommt von Family Link |
| Familienfreigabe | **Pflicht:** Kinder-iPhone mit Kinderkonto in Apples Familienfreigabe (sonst `invalidAccountType`) | Family-Link-Verbindung von Eltern- und Kinder-Handy |
| Berechtigungen | Apple-Zustimmung „Bildschirmzeit“ (`FamilyControls`, per Bildschirmzeit-Kennung) einmalig; Mitteilungen erlauben (für Freigabe, Restminuten, „Eltern fragen“) | Family-Link-Berechtigungen |
| LernZeit-Fassung | Build mit Handysperre (App-Stand ≥ 20261022, ab 2.1.1); ältere Fassungen sperren nur Kinder der Tabelle `handysperre_freigaben` | beliebig |
| Verknüpfung | Kind- und Eltern-Konto über Einladungscode verbunden | ebenso |
| Konto des Elternteils | Beliebiges Gerät (iPhone, Android, Browser) für Genehmigen und Regeln; Mitteilungen nur in der App | ebenso |
| Gerät des Kindes | Muss LernZeit nach dem Genehmigen mindestens einmal öffnen | – |

Zusatz: Apple erlaubt die Verwaltung durch nur eine App zugleich (`authorizationConflict`); ein Verwaltungsprofil kann die Bildschirmzeit sperren (`restricted`). Die Meldungen dazu stehen in `appleAblehnung`.

---

## 4. Bekannte Grenzen

### 4.1 Allgemein

- **Kein Fernzugriff:** Apple erlaubt keine Steuerung der Sperre von einem anderen Gerät. Alles, was auf dem Kinder-Handy wirken soll, greift erst, wenn LernZeit dort läuft. Wer genehmigt, während das Handy aus ist oder LernZeit nicht geöffnet wird, wartet.
- **Eltern genehmigen von Hand:** Es gibt keine automatische Genehmigung.
- **Auswahl nur auf dem Kinder-Handy:** Welche Apps „Immer erlaubt“ sind und was zählt, lässt sich nur dort wählen (Apple-Vorgabe).
- **Telefon, Einstellungen und LernZeit** bleiben immer offen (Telefon auf Klaras Handy am 10.10.2026 geprüft).
- **Zählen:** Gezählt werden nur die gewählten Apps. Apples Gesamt-Bildschirmzeit ist deshalb höher als „genutzt“ in LernZeit (z. B. zählen LernZeit und Telefon nicht). Liegt eine „Immer erlaubt“-App in einer gezählten Kategorie, zählt sie mit.
- **Uhr des Geräts:** Das Gerät entscheidet über Tageswechsel; ändert das Kind die Uhrzeit, kann das den Tag verschieben (bekannte Grenze, wie bei Apples App-Limits).
- **Android:** keine Sperre, keine automatische Freigabe (siehe 2).

### 4.2 Kann das Kind die Sperre umgehen?

Aus dem Code und der Dokumentation belegt:

- Änderungen an der Sperre in LernZeit sind nur mit Freigabe des Elternteils oder dem Elterncode möglich (`ParentGate`, `geraet_freigaben`, 5 Fehlversuche = 15 Minuten Pause).
- Die Zustimmung zur Bildschirmzeit schützt Apple selbst mit der Bildschirmzeit-Kennung des Elternteils.
- Hinweis für Texte: nicht „unumgehbar“ schreiben. Nicht auf einem Gerät geprüft und deshalb offen: Löschen und Neuinstallieren der App, Änderung von Datum und Uhrzeit, Beenden der Familienfreigabe, andere Geräte des Kindes (ein zweites iPhone oder iPad ohne LernZeit-Sperre; die Sperre gilt je Gerät).
- Ein Kind, das nicht in LernZeit lernt, sieht keine Sperre: Die Sperre wirkt nur auf dem Gerät, auf dem sie eingerichtet wurde.

### 4.3 Beobachteter Ausfall

Am 24.10.2026 war die Sperre auf Klaras Handy von 12:53 bis 18:29 Uhr aus, ohne dass jemand sie aufgehoben hatte (kein Aufheben über App oder Elterncode im Protokoll); die Ursache ist unbekannt.
Folge: LernZeit löste in dieser Zeit keine Freigaben ein, und die Eltern merkten es nicht.
Seitdem gibt es den Hinweis „Handysperre ist aus“ in der Eltern-Ansicht, eine Mitteilung beim Wechsel auf „aus“ und ein Protokoll (`handysperre_wechsel`, mit Grund ab dem nächsten Build). Ob so etwas öfter passiert, wird beobachtet (Nachprüfung am 27.10.2026).
**Für Texte:** nicht versprechen, dass die Sperre „immer“ aktiv bleibt; besser: „LernZeit meldet es dir, wenn die Sperre aus ist.“

---

## 5. Menüführung (genaue Schaltflächen, für Screenshots)

### 5.1 Eltern-Konto

| Ziel | Weg | Beschriftung |
|---|---|---|
| Navigation unten | – | **Heute · Kinder · Abo · Konto** |
| Kind anlegen und Einladungscode erzeugen | **Kinder** → Bereich „Kind einladen“ | Profil mit Name und Klassenstufe, dann Knopf **„Code erstellen“**; „Aktive Einladungen“; der Link ist 7 Tage gültig, der Code funktioniert auch von Hand |
| Anfragen bearbeiten | **Heute → Anfragen** | **„Genehmigen“**, **„Ablehnen“**; Dialog: **„Genehmigen & Family Link öffnen“** (Android), **„Nur genehmigen (später freigeben)“**, **„Genehmigen“** (iPhone mit LernZeit-Sperre, Hinweis „LernZeit gibt die Zeit auf dem iPhone von … frei“) |
| Leere Liste | Heute → Anfragen | „Keine offenen Anfragen“ |
| Kind öffnen | **Kinder** → Kind antippen → Reiter **Übersicht · Regeln · Lernplan · Konto** | |
| Übersicht | Kind → **Übersicht** | „Heute verdient“, „Aufgaben heute“, „Lerntage in Folge“, „Handyzeit heute“, „Letzte 7 Tage“, Lernanalyse (Premium) |
| Freiminuten, Ruhezeit, Extra-Zeit | Kind → **Regeln** | Gruppen „Freiminuten“, „Handysperre“ (Elterncode, „+15 Min.“, „+30 Min.“, „Heute ohne Limit“), „Fächer und Zeit pro richtiger Aufgabe“ |
| Hinweis bei fehlender Sperre | Heute (Zeile unter dem Namen) und Kind → Übersicht | **„Handysperre ist aus“** und Weg „Auf dem iPhone von … in LernZeit: Einstellungen → Bildschirmzeit → „Handy sperren““ |
| Sperre noch nicht eingerichtet | Kind → Regeln → Gruppe „Handysperre“ | „Auf dem iPhone von {Name} in LernZeit: Einstellungen → Bildschirmzeit → „Handy sperren“.“ |
| Erlaubnis für Änderungen am Kinder-Handy | Heute (Karte) | Mitteilung „Handy fragt“, Knopf **„Erlauben“** |

### 5.2 Kinder-Konto (auf dem Handy des Kindes)

| Ziel | Weg | Beschriftung |
|---|---|---|
| Mit Eltern verknüpfen | **Zahnrad (Einstellungen) → Eltern-Verknüpfung** | Einladungscode eingeben |
| Aufgaben | Start → „Lernen starten“ | – |
| Zeit anfragen | Start (Zeit-Uhr) bzw. **Einstellungen → Bildschirmzeit** | Knopf **„{n} Min. anfragen“**, Dialog „Bildschirmzeit anfragen“ mit „Nachricht an deine Eltern (freiwillig)“, „Abbrechen“, **„{n} Min. anfragen“**; unter 5 Minuten: „Ab 5 Minuten kannst du anfragen …“ |
| Offene Anfrage | Start | „Deine Anfrage über {n} Min. wartet auf deine Eltern.“ |
| Sperre einrichten (Elternteil am Kinder-Handy) | **Zahnrad → Bildschirmzeit → Karte „Handy sperren“** | Text „Telefon und LernZeit bleiben immer offen.“; Knopf **„Sperre einrichten“**; danach **„Was zählt als Handyzeit?“**, **„Immer erlaubt“**, **„Elterncode einrichten“**, **„Sperre aufheben“** (nur mit Freigabe) |
| Stand | Karte „Handy sperren“ | Zeilen „Gesperrt“, „Heute“ (z. B. „noch 25 Min.“), „Elterncode: bereit“ |

Auf Android erscheint die Karte „Handy sperren“ nicht; im Browser steht dort stattdessen die Anleitung zum Aufklappen.

---

## 6. Quellen im Repo

- Ablauf und Entscheidungen: `docs/handysperre-konzept-2026-10-17.md`, `docs/handysperre-pruefung.md`
- Texte und Wege je Gerät: `src/lib/geraeteAnleitung.ts`, `src/services/parentalControlsService.ts`
- Einlösen auf dem Gerät: `src/hooks/useScreenTimeRelease.ts`, `src/services/screenTime/release.ts`
- Einrichtung: `src/components/screenTime/ScreenTimeSetup.tsx`, `src/components/ChildSettingsMenu.tsx`
- Anfrage und Genehmigung: `src/components/EarnedTimeWidget.tsx`, `src/components/ParentScreenTimeRequestsDashboard.tsx`
- Sperre in Swift: `native/screen-time/ios/Sources/ScreenTimePlugin/`

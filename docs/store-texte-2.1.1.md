# Store-Texte für Version 2.1.1 („Klecksi malt mit“)

Stand 24.10.2026. Nur Aussagen, die in der App umgesetzt sind. Grenzen: App Store „Werbetext“
170 Zeichen (jederzeit ohne Prüfung änderbar), „Neu in dieser Version“ 4.000 Zeichen,
Google Play „Neuerungen“ 500 Zeichen.

## Versionen

| Plattform | Wert | Wo |
|---|---|---|
| iOS | `IOS_MARKETING_VERSION: "2.1.1"` | `codemagic.yaml` (gesetzt) |
| Android | `versionCode` +1 (2.1.0 hatte 19 → 20), `versionName "2.1.1"` | `android/app/build.gradle` in Android Studio |

## App Store – Werbetext (Deutsch, unter 170 Zeichen)

```
Klecksi malt jetzt mit: Jede geschaffte Runde färbt ein Feld auf der Heftrand-Reise. Dazu 50 neue Figuren und eine Handysperre, die verdiente Zeit selbst freigibt.
```

## App Store – „Neu in dieser Version“ (Deutsch)

```
Klecksi malt mit!

• Nach jeder geschafften Runde schnappt sich Klecksi den Pinsel und malt das neue Feld auf der Heftrand-Reise aus – direkt vor den Augen deines Kindes.
• 50 neue Figuren zum Sammeln mit Tinte: Tiere, Fantasie-Figuren wie Drache und Astronaut, Sport & Spiel und mehr.
• Vorlesen mit einer neuen, natürlichen Stimme: Bis Klasse 4 liest LernZeit Aufgaben, Antworten und Erklärungen vor.

LernZeit-Handysperre für alle (iPhone und iPad):
• LernZeit sperrt das Handy selbst, sobald die Minuten des Tages genutzt sind – wie ein Tageslimit. Telefon und LernZeit bleiben immer offen.
• Genehmigte Zeit gibt LernZeit von selbst frei, ganz ohne Umweg über die Einstellungen.
• Freiminuten für jeden Tag, auf Wunsch eine Ruhezeit am Abend.
• Mitteilung an dein Kind 15, 10, 5, 3 und 1 Minute vor Schluss.
• „Eltern fragen“ direkt vom Sperrbildschirm: Du bekommst die Bitte als Mitteilung.
• Elterncode für den Notfall: öffnet das Handy kurz, auch ohne Internet.
• Neu in der Eltern-Ansicht: genutzte Handyzeit heute und die letzten 7 Tage auf einen Blick.

Fair lernen: Wer während einer Aufgabe länger als 5 Sekunden aus LernZeit wechselt, bekommt für diese Aufgabe keine Zeit. Die Lösezeit wird nicht mehr abgezogen.

Außerdem: Lernanalyse lädt zuverlässiger, weniger Erklärtexte und viele kleine Verbesserungen.
```

## Google Play – „Neuerungen“ (Deutsch, unter 500 Zeichen)

```
Klecksi malt mit! Nach jeder geschafften Runde malt er das neue Feld auf der Heftrand-Reise aus. 50 neue Figuren zum Sammeln mit Tinte, darunter Drache, Astronaut und Faultier. Bis Klasse 4 liest eine neue, natürliche Stimme Aufgaben und Erklärungen vor. Fair lernen: Wer während einer Aufgabe die App verlässt, bekommt dafür keine Zeit. Eltern sehen die Lernzeit der letzten 7 Tage. Dazu viele kleine Verbesserungen.
```

## Hinweise für die Einreichung

- Handysperre gibt es nur auf iPhone/iPad (FamilyControls, Kinderkonto in der Familienfreigabe);
  der Android-Text erwähnt sie deshalb nicht.
- Review-Notizen: wie 2.1.0 (`docs/store-texte-2.1.0.md`), „Device lock is available for every child
  account in this version“; Kinder-Passwörter von Hand eintragen.
- Datenschutzangaben: neu nur die Tagessumme der Handyzeit (31 Tage, ohne Apps), steht in der
  Datenschutzerklärung (Stand 21.10.2026).
- Figurenpreise: ab 26.10.2026 höher (Datenbank); im Text nicht erwähnt.

# Store-Texte für Version 2.1.0 („Klecksi“)

Stand 13.10.2026. Nur Aussagen, die in der App umgesetzt sind. Texte kurz halten, nichts
versprechen, was nicht belegt ist. Grenzen: App Store „Neu in dieser Version“ 4.000 Zeichen,
Google Play „Neuerungen“ 500 Zeichen je Sprache.

## Versionen

| Plattform | Wert | Wo |
|---|---|---|
| iOS | `IOS_MARKETING_VERSION: "2.1.0"` | `codemagic.yaml` (gesetzt); Buildnummer zählt Codemagic selbst hoch |
| Android | `versionCode 19`, `versionName "2.1.0"` | `android/app/build.gradle` in Android Studio (nicht im Repo geändert) |

## App Store – „Neu in dieser Version“ (Deutsch)

```
Klecksi ist da!

Der kleine blaue Tintenklecks begleitet dein Kind beim Lernen:
• Klecksi begrüßt dein Kind und zeigt, was heute zählt: Lernplan, Schwerpunkt-Fach und Berichtigung.
• Die Heftrand-Reise: Jede geschaffte Runde malt ein Feld in der Farbe des Fachs. Ist die Seite voll, faltet Klecksi eine Figur aus Papier, mit Anleitung zum Nachfalten.
• Tinte für neue Figuren: Für richtige Antworten gibt es Tinte, mit der dein Kind neue Figuren freischaltet. Tinte ist Spielgeld, keine Bildschirmzeit.
• Berichtigung: Falsche Aufgaben übt dein Kind später noch einmal, mit dem Tintenkiller.
• Klecksi erklärt Fehler und ist der KI-Tutor (Premium, ab Klasse 5). Erklärungen von der KI sind gekennzeichnet.
• Klecksi wächst mit jedem Lerntag in Folge: nach 3, 7, 14 und 30 Tagen wird er größer und glänzender. Wer pausiert, sieht ihn blasser werden und austrocknen. Eine Runde, und er ist wieder da.
• Urkunden und ein Wochenziel für mehr Lust aufs Dranbleiben.
• Ältere Kinder können Klecksi ausschalten: Ab Klasse 7 ist er zuerst aus, in den Einstellungen lässt er sich jederzeit ein- oder ausschalten.

Weihnachtszeit (1. bis 26. Dezember): Adventskalender mit 24 Türchen, je 5 Aufgaben aus allen Fächern, dazu Weihnachts-Sticker und -Figuren.

Eltern: Optional gibt es Extra-Minuten für jede fertige Reise-Seite (unter Regeln einstellbar).

Außerdem: mehr kurze Aufgaben zum Üben (Runden, Vorgänger und Nachfolger, Stellenwerte, Einmaleins) und kleine Verbesserungen.
```

## Google Play – „Neuerungen“ (Deutsch, unter 500 Zeichen)

```
Klecksi ist da! Der kleine Tintenklecks begleitet dein Kind: Jede Runde malt ein Feld auf der Heftrand-Reise, am Seitenende faltet er eine Papierfigur. Mit jedem Lerntag wächst und glänzt er, ohne Lernen trocknet er aus. Tinte gibt es für neue Figuren. Klecksi erklärt Fehler und ist KI-Tutor (Premium, ab Klasse 5). Ab Klasse 7 zuerst aus, änderbar. Im Dezember: Adventskalender. Dazu mehr Übungsaufgaben.
```

(Zeichenzahl: unter 500.)

## Hinweise für die Einreichung

- **KI-Inhalte:** Erklärung und Tutor sind als „KI“ gekennzeichnet, Tutor nur mit Premium ab Klasse 5.
- **Datenschutzangaben (App Store/Play):** Neu sind nur die geöffneten Adventstürchen und die
  Klecksi-Einstellung, beide am Konto, keine neuen Datenarten außer diesen Spielständen.
  Datenschutzerklärung: Stand 11.10.2026 (auf der Website).
- **Zeitpunkt:** Der Adventskalender erscheint erst ab 1.12. und braucht das Update auf dem Handy.
  Build bis Ende Oktober einreichen, damit er Anfang Dezember verteilt ist.
- **Markenprüfung „Klecksi“** beim DPMA steht noch aus; der Name ist jetzt im Store-Eintrag sichtbar.

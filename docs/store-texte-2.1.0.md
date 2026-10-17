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

## App Store Connect – „Notes“ für App Review (Englisch, Stand 17.10.2026)

Unter „App-Review-Informationen“ → „Notizen“ einfügen. Passwörter **nicht** hier im
Repo: Eltern-Konto in die Felder „Anmeldeinformationen“, die Passwörter der beiden
Kinder an den markierten Stellen von Hand einsetzen.

```
LernZeit is a learning app for school children: children solve short school tasks and
earn screen time, a parent approves it on their own device.

ACCOUNTS
- Parent: apple.review.parent@lernzeit.app (see Sign-In Information)
- Child 1: username "applereviewkind", password: [PASSWORT KIND 1]
- Child 2: username "applereviewkind2", password: [PASSWORT KIND 2]
Children sign in on "Anmelden" (sign in) with the username in "E-Mail oder Benutzername".

DEVICE LOCK (Family Controls, iPhone/iPad only)
The device lock is enabled only for accounts on an allow-list while we finish testing.
Both review child accounts are on that list.
- Apple requires the child device to be signed in with a child Apple Account in Family
  Sharing (FamilyControls authorization .child).
- Setup on the child device: log in as a child > Einstellungen (Settings) >
  Bildschirmzeit > "Handy sperren" > "Sperre einrichten". iOS asks for the Screen Time
  passcode, then "Was zählt als Handyzeit?" (what counts as screen time): choose
  "All Apps & Categories".
- Behaviour: like Screen Time app limits. The phone stays usable until the minutes of
  the day are used up (daily free minutes + time the child earned and the parent
  approved). Only active use of apps counts. Phone calls and LernZeit always stay open.
  Optional quiet hours.
- Parent device: Kinder (Children) > child > Regeln (Rules) > Handysperre: usage today,
  "+15 Min.", "+30 Min.", "Heute ohne Limit" (no limit today) and the parent code.
- Parent code ("Elterncode"): 6 digits, changes every 30 minutes, checked on the child
  device without internet. It opens the phone for 15/30/60 minutes or allows changes
  to the lock. Every use is reported to the parent.
- Any change that loosens the lock on the child device needs approval on the parent
  device (push notification, card on "Heute") or the parent code.

OTHER
- Seasonal: Advent calendar is visible from 1 to 26 December only.
- Optional referral code at sign-up (parents): 2 months of Premium instead of 1.
- AI explanations and the AI tutor are labelled "KI" (AI). Every AI tutor answer and
  every forum post or comment by others has a "Melden" (report) button; reports are
  reviewed within 24 hours.
```

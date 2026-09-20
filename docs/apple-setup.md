# Apple-Einrichtung für die Gerätesperre

**Wer das machen muss: du. Es geht nicht anders — der Grund steht unten.**
**Wie lange es dauert: etwa zehn Minuten für alles, fünf für die erste Hälfte.**

---

## Warum ich das nicht übernehmen kann

Ich habe beide denkbaren Wege geprüft, statt es zu vermuten.

**Weg 1 — Browser auf dem Apple-Developer-Portal.** Scheitert zweimal
unabhängig voneinander:

| | |
|---|---|
| Netz | `idmsa.apple.com`, Apples Anmeldeserver, wird vom Netz dieser Arbeitsumgebung blockiert (Verbindungsaufbau schlägt fehl). `developer.apple.com` selbst ist erreichbar, nützt ohne Anmeldung aber nichts. |
| Anmeldung | Sie braucht dein Apple-ID-Passwort und einen Zwei-Faktor-Code von deinem Gerät. Nach Zugangsdaten frage ich nicht, und ein Code, der auf deinem iPhone erscheint, macht den Vorgang ohnehin zu einem, bei dem du danebensitzen müsstest. |

**Weg 2 — App Store Connect API.** Wäre der richtige Weg: Sie nutzt einen
Schlüssel statt eines Passworts, kennt kein Zwei-Faktor und kann Bundle-IDs
tatsächlich anlegen. Sie scheitert an etwas anderem:

> **Die Berechtigung „Family Controls" gibt es in dieser Schnittstelle nicht.**

Nachgesehen in Apples eigener Referenz (`CapabilityType`, abgerufen am
15.09.2026): Die Aufzählung hat 28 Werte — von `APP_GROUPS` über `HEALTHKIT`
bis `WALLET`. `FAMILY_CONTROLS` ist **nicht** darunter. Eine App-ID ließe sich
also anlegen, aber nicht mit der Berechtigung versehen, auf die es hier
ankommt. Eine halb eingerichtete App-ID ist schlimmer als keine.

*(Ergänzend: Der API-Host `api.appstoreconnect.apple.com` ist in dieser
Arbeitsumgebung ebenfalls gesperrt — Gateway antwortet mit 403 auf CONNECT.
Das ließe sich durch dich in den Umgebungseinstellungen freischalten, ändert
am Befund oben aber nichts.)*

**Damit bleibt das Portal von Hand.** Ich habe stattdessen dafür gesorgt, dass
es so wenig wie möglich ist.

---

## Umfang

Du hast gesagt, du legst gleich alles an. Dann ist das hier die vollständige
Liste — **vier App-IDs, eine App Group, vier Profile.**

Wenn die Zeit knapp wird: Schritt 1 bis 5 reichen für die erste Scheibe. Die
Schritte 6 und 7 sind der eigene Sperrbildschirm; ohne sie zeigt iOS seinen
grauen Standard, die Sperre selbst funktioniert trotzdem.

| Erweiterung | Wofür | Schritt |
|---|---|---|
| `DeviceActivityMonitor` | Sperrt die Apps wieder, wenn die verdiente Zeit abgelaufen ist | 3 |
| `ShieldConfiguration` | Sperrbildschirm im LernZeit-Aussehen statt Apples grauem | 6 |
| `ShieldAction` | Der Knopf „Zeit beantragen" auf diesem Sperrbildschirm | 7 |

---

## Der eine Stolperstein, vorweg

**Sobald du in Schritt 2 die App Group zur Haupt-App hinzufügst, wird das
bestehende Provisioning-Profil `delernzeitapp_App_Store` ungültig.** Apple
zeigt es danach als *Invalid* an.

Das ist kein Fehler, sondern Apples normales Verhalten: Ändert sich eine
App-ID, passen die alten Profile nicht mehr dazu. **Es muss neu erzeugt und
bei Codemagic hochgeladen werden** — sonst scheitert der nächste iOS-Build.
Das ist Schritt 8, und er ist der wichtigste in dieser Liste.

---

## Die Schritte

Alles unter <https://developer.apple.com/account/resources>.

### 1. App Group anlegen

*Identifiers* → **+** → **App Groups** → *Continue*

| Feld | Wert |
|---|---|
| Description | `LernZeit Shared` |
| Identifier | `group.de.lernzeit.app` |

→ *Continue* → *Register*

*Wozu:* Hauptapp und Erweiterungen sind getrennte Prozesse. Sie können Daten
nur über eine App Group austauschen — die Erweiterung muss wissen, welche Apps
gesperrt werden sollen.

### 2. App Group zur bestehenden App-ID hinzufügen

*Identifiers* → `de.lernzeit.app` anklicken → Häkchen bei **App Groups** →
*Edit* → `group.de.lernzeit.app` auswählen → *Continue* → *Save*

**Family Controls bleibt gesetzt.** Nicht abwählen.

*Ab hier ist das alte Profil ungültig. Siehe Schritt 8.*

### 3. App-ID für den Monitor

*Identifiers* → **+** → **App IDs** → *App* → *Continue*

| Feld | Wert |
|---|---|
| Description | `LernZeit Device Activity Monitor` |
| Bundle ID | **Explicit**, `de.lernzeit.app.monitor` |

Zwei Häkchen:

- **Family Controls (Distribution)**
- **App Groups** → *Edit* → `group.de.lernzeit.app`

→ *Continue* → *Register*

### 4. Profil für den Monitor

*Profiles* → **+** → **App Store Connect** (unter *Distribution*) → *Continue*

| Feld | Wert |
|---|---|
| App ID | `de.lernzeit.app.monitor` |
| Zertifikat | das vorhandene Distribution-Zertifikat |
| Profile Name | `delernzeitapp_monitor_App_Store` |

→ *Generate* → *Download*

### 5. Bei Codemagic hochladen

*Teams* → dein Team → *Code signing identities* → *Provisioning profiles* →
das Profil aus Schritt 4 hochladen.

**Hier könntest du aufhören.** Damit funktioniert die Sperre. Die Schritte 6
und 7 machen sie nur schöner.

### 6. App-ID und Profil für den Sperrbildschirm

Wie Schritt 3 und 4, mit:

| Feld | Wert |
|---|---|
| Description | `LernZeit Shield Configuration` |
| Bundle ID | **Explicit**, `de.lernzeit.app.shield` |
| Häkchen | **Family Controls (Distribution)** und **App Groups** → `group.de.lernzeit.app` |
| Profile Name | `delernzeitapp_shield_App_Store` |

### 7. App-ID und Profil für den Knopf auf dem Sperrbildschirm

Wie Schritt 3 und 4, mit:

| Feld | Wert |
|---|---|
| Description | `LernZeit Shield Action` |
| Bundle ID | **Explicit**, `de.lernzeit.app.shieldaction` |
| Häkchen | **Family Controls (Distribution)** und **App Groups** → `group.de.lernzeit.app` |
| Profile Name | `delernzeitapp_shieldaction_App_Store` |

### 8. Das Profil der Haupt-App neu erzeugen — nicht vergessen

*Profiles* → `delernzeitapp_App_Store` anklicken → *Edit* → *Save* →
*Download*

Dann bei Codemagic hochladen und die alte Fassung ersetzen. **Der Name muss
gleich bleiben** — `codemagic.yaml` verweist in Zeile 93 darauf.

Ohne diesen Schritt scheitert der nächste iOS-Build mit einer Meldung über
ein nicht passendes Profil.

---

## Wenn du fertig bist

Sag mir drei Dinge:

1. Ob die App Group genau `group.de.lernzeit.app` heißt (falls Apple den Namen
   schon vergeben fand, nenn mir den, den du genommen hast).
2. Wie weit du gekommen bist — nur bis Schritt 5, oder alle sieben.
3. Ob Schritt 8 erledigt ist (das neue Profil der Haupt-App bei Codemagic).

Mehr brauche ich nicht. Den Swift-Teil, die Einbindung in den Build und die
Entitlements schreibe ich dann in einem Zug — und so, dass ein fehlendes
Profil den Build **nicht** kaputtmacht, sondern die Erweiterung einfach
weglässt. Ein grüner Build ohne Sperre ist besser als ein roter mit.

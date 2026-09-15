# Apple-Einrichtung für die Gerätesperre

**Wer das machen muss: du. Es geht nicht anders — der Grund steht unten.**
**Wie lange es dauert: etwa fünf Minuten.**

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

## Was ich weggelassen habe, um dir Arbeit zu sparen

Ursprünglich hatte ich **drei** App-IDs und eine App Group genannt. Das war
der vollständige Ausbau. Für die erste Scheibe reicht **eine** App-ID:

| Erweiterung | Wofür | jetzt? |
|---|---|---|
| `DeviceActivityMonitor` | Sperrt die Apps wieder, wenn die verdiente Zeit abgelaufen ist | **ja** |
| `ShieldConfiguration` | Eigener Sperrbildschirm im LernZeit-Aussehen statt Apples grauem Standard | später |
| `ShieldAction` | Der Knopf „Zeit beantragen" auf diesem Sperrbildschirm | später |

Die beiden letzten sind Aussehen und Bequemlichkeit. Ohne sie zeigt iOS seinen
eigenen Sperrbildschirm — unschön, aber die Sperre funktioniert. **Der
eigentliche Nutzen steckt in der ersten Zeile**: Ohne sie läuft die verdiente
Zeit ab, ohne dass sich etwas ändert.

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

*Wozu:* Hauptapp und Erweiterung sind zwei getrennte Prozesse. Sie können
Daten nur über eine App Group austauschen — die Erweiterung muss wissen,
welche Apps gesperrt werden sollen.

### 2. App Group zur bestehenden App-ID hinzufügen

*Identifiers* → `de.lernzeit.app` anklicken → Häkchen bei **App Groups** →
*Edit* → `group.de.lernzeit.app` auswählen → *Continue* → *Save*

**Family Controls bleibt dort gesetzt.** Nicht abwählen.

### 3. Neue App-ID für die Erweiterung

*Identifiers* → **+** → **App IDs** → *App* → *Continue*

| Feld | Wert |
|---|---|
| Description | `LernZeit Device Activity Monitor` |
| Bundle ID | **Explicit**, `de.lernzeit.app.monitor` |

Zwei Häkchen setzen:

- **Family Controls (Distribution)**
- **App Groups** → *Edit* → `group.de.lernzeit.app`

→ *Continue* → *Register*

> Falls **Family Controls (Distribution)** nicht auswählbar ist: Das ist die
> Berechtigung, die du für die Haupt-App schon freigeschaltet hast. Sie gilt
> pro App-ID, nicht pro Konto — sollte hier also erscheinen. Wenn nicht,
> schick mir einen Screenshot der Liste.

### 4. Provisioning-Profil

*Profiles* → **+** → **App Store Connect** (unter *Distribution*) →
*Continue*

- App ID: `de.lernzeit.app.monitor`
- Zertifikat: dasselbe wie beim letzten Mal
- Profile Name: `delernzeitapp_monitor_App_Store`

→ *Generate* → *Download*

### 5. Beides bei Codemagic hochladen

*Teams* → dein Team → *Code signing identities* → *Provisioning profiles* →
das neue Profil hochladen.

**Wichtig:** Das bestehende Profil `delernzeitapp_App_Store` bleibt. Es kommt
eines dazu, es wird keines ersetzt — die Haupt-App braucht ihres weiterhin.

---

## Wenn du fertig bist

Sag mir zwei Dinge:

1. Ob die App Group genau `group.de.lernzeit.app` heißt (falls Apple den Namen
   schon vergeben fand, nenn mir den, den du genommen hast).
2. Wie das neue Profil bei Codemagic heißt.

Mehr brauche ich nicht. Den Swift-Teil, die Einbindung in den Build und die
Entitlements schreibe ich dann in einem Zug — und so, dass ein fehlendes
Profil den Build **nicht** kaputtmacht, sondern die Erweiterung einfach
weglässt. Ein grüner Build ohne Sperre ist besser als ein roter mit.

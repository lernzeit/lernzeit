# Backlog

Was bewusst zurückgestellt ist — mit dem Grund, damit in vier Wochen niemand
rätselt, ob es vergessen wurde oder gewollt war.

**Stand:** 20.09.2026

---

## Produkt

### ~~Eltern-Oberfläche zur Einrichtung der Sperre~~ — erledigt am 20.09.2026

War die Lücke, die den ersten Gerätetest scheitern ließ: Die einzige
Oberfläche, die Apps auswählen konnte, war die Test-Werkbank hinter
`VITE_SCREENTIME_UI` — im Store-Build also gar nicht vorhanden.

Jetzt `ScreenTimeSetup` in den Einstellungen des Kindes, mit `ParentGate`
davor. Im Eltern-Bereich steht ein Hinweis, wo die Einrichtung stattfindet.

### ~~Modus „ausgewählte Apps"~~ — gestrichen am 20.09.2026

Das Kind hätte beim Einlösen ausgesucht, für welche App die verdiente Zeit
gelten soll. Gestrichen, nicht zurückgestellt: Wer 15 Minuten verdient hat,
will 15 Minuten — und nicht vorher eine Liste durchgehen.

`UnlockMode` ist aus `src/services/screenTime/types.ts` entfernt, die Prüfung
auf `child_settings.screen_time_unlock_mode` lässt nur noch `'all'` zu.

### ~~Gesperrte Apps auswählen müssen~~ — gestrichen am 20.09.2026

Die erste Fassung verlangte, dass ein Elternteil auf dem Gerät des Kindes
einzeln Apps antippt, bevor überhaupt etwas gesperrt war. Drei Schritte für
eine Einstellung, die fast jeder gleich meint: „das Handy".

Jetzt sperrt LernZeit vorgabemäßig alles
(`ShieldSettings.ActivityCategoryPolicy.all(except:)`). Apples Auswahldialog
ist geblieben, hat aber die Rolle gewechselt: Er bestimmt nicht mehr, was
gesperrt wird, sondern was offen bleibt.

### ~~Genehmigte Zeit öffnet das Gerät~~ — erledigt am 20.09.2026

Die Kette endete beim Status `approved`; auf dem Telefon geschah nichts. Jetzt
löst `useScreenTimeRelease` die Genehmigung auf dem Kindgerät ein:
`redeem_unlock` bucht sie serverseitig, danach hebt `releaseFor` die Sperre
auf. Ein eindeutiger Index auf `screen_time_unlocks.request_id` verhindert
doppeltes Einlösen.

**Entschärft am 20.09.2026:** Ob LernZeit sich unter `.all()` selbst sperrt,
ist weiterhin offen — Apple sagt dazu nichts, und es lässt sich nur auf einem
Gerät klären. Die erste Aktivierung ist deshalb ein **Probelauf von zehn
Minuten**, der sich von selbst auflöst, wenn ihn niemand bestätigt. Das
Auflösen erledigt die DeviceActivityMonitor-Erweiterung, nicht die App: Wäre
LernZeit gesperrt, könnte die App selbst nichts mehr tun.

### ~~Grundzeit ohne Lernen~~ — erledigt am 20.09.2026

LernZeit war strenger als Apples eigene Bildschirmzeit: Dort gibt es ein
Tagesbudget, und die Sperre greift erst, wenn es aufgebraucht ist. Bei uns war
das Budget null — ohne verdiente und genehmigte Zeit war das Telefon rund um
die Uhr zu.

Jetzt `child_settings.screen_time_base_minutes` (Vorgabe 30, im Premium-Bereich
bis 0 absenkbar). Das Kind startet die Freiminuten selbst.

**Bewusst anders als bei Apple:** Apples App-Limits zählen die tatsächliche
NUTZUNG (`DeviceActivityEvent` mit Schwelle). Das lässt sich nicht nachbauen —
ein solches Ereignis verlangt `ApplicationToken`s, und die gibt es nur aus dem
Auswahldialog, den wir gerade abgeschafft haben. Unsere Freiminuten laufen
deshalb ab dem Start, auch wenn das Telefon in der Tasche liegt. Deshalb
startet sie das Kind per Knopf und nicht die App automatisch.

### Ausnahmen-Knopf: von Apple kaputt

Die Funktion „Ausnahmen wählen" baut auf
`ShieldSettings.ActivityCategoryPolicy.all(except:)`. Entwickler berichten,
dass die ausgenommenen Apps trotzdem gesperrt werden; ein Apple-Engineer hat
das bestätigt („There are known issues in this area", FB15500605), ohne
Lösung.

*Zurückgestellt am 20.09.2026:* Erst der Gerätetest zeigt, ob es bei uns
auftritt. Falls ja, ist der Ausweg nicht `except`, sondern Sperren nach
**Kategorien** — die Eltern tippen einmal „Spiele", „Soziale Netzwerke",
„Unterhaltung" an, und LernZeit als Bildungs-App ist gar nicht erst
betroffen.

### ~~„Eltern fragen" sichtbar machen~~ — erledigt am 20.09.2026

Der Weg ist geschlossen: Das Kindgerät holt die Drücke beim App-Start ab
(`useSyncShieldAttempts`), schreibt sie nach `shield_attempts`, und das
Eltern-Dashboard zeigt sie über den Anträgen an.

---

## Werbung — wartet auf Dritte

| | Wartet auf |
|---|---|
| Datenschutzerklärung überarbeiten | Antwort der Kanzlei auf Fassung 3 |
| Einwilligungsbanner (Usercentrics) | Anforderungen der Kanzlei, dann Anmeldung |
| Versand der Conversions | Banner und Einwilligung |
| Google-Ads-Konto, Anzeigentexte freigeben | dich |
| Meta | erst nachdem Google Zahlen geliefert hat |

---

## Kleinigkeiten

- **Cron-Auftrag 13** (toter Doppelauftrag): nur über den Supabase-Support zu
  entfernen. Text liegt in `docs/supabase-support-cron13.md`. Kostet bis
  dahin eine Fehlerzeile je Stunde und sonst nichts.
- **Store-Stände und Stripe-Beträge** gegenlesen — zwei Kontrollen, an die
  die Arbeitsumgebung nicht herankommt (Faktenprüfung, Zeilen 5 bis 7).
- **„Blitzschnell!"-Einblendung liegt über der nächsten Frage.** Sie bleibt
  nach „Weiter" rund zwei Sekunden stehen und verdeckt dann das Antwortfeld
  der neuen Aufgabe. Bei Auswahlfragen verdeckt sie außerdem genau die
  gewählte Antwort. Gesehen am 25.09.2026 im Demo-Video. Nicht angefasst,
  weil es in `LearningGame.tsx` liegt.
- **Auswahlfragen: gewählte Antwort nach dem Prüfen kaum zu sehen.** Die
  richtige Antwort ist danach hellblau auf fast weiß. Ebenfalls
  `LearningGame.tsx`.
- ~~„MathTime" über der Klassenwahl, voll grüne leere Fortschrittsbalken~~ —
  behoben am 25.09.2026 (`GradeSelector.tsx`, `ui/progress.tsx`).
- **Klassenwechsel 2026** wurde bewusst nicht nachgeholt; Eltern korrigieren
  selbst. Der reguläre Lauf am 01.08.2027 ist davon unberührt.

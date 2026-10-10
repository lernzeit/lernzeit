import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings

/// Gemeinsamer Zustand von App und DeviceActivityMonitor-Erweiterung.
///
/// Warum diese Datei getrennt vom Plugin liegt: Die Erweiterung ist ein
/// eigener Prozess mit eigenem Ziel im Xcode-Projekt. Sie darf Capacitor nicht
/// importieren — deshalb steht hier NICHTS aus Capacitor. Dieselbe Datei wird
/// beiden Zielen zugeordnet (scripts/ios-add-extensions.rb), sodass es genau
/// eine Wahrheit ueber Schluessel und Speicherort gibt statt zweier Kopien,
/// die auseinanderlaufen.
///
/// Der Speicher ist bewusst die App Group und nicht UserDefaults.standard:
/// Zwei Prozesse, ein Container. Ohne sie saehe die Erweiterung die Auswahl
/// des Kindes nicht und koennte nichts sperren.
public enum LernzeitScreenTime {
    /// Muss mit der App Group im Apple-Developer-Portal und in beiden
    /// Entitlements-Dateien uebereinstimmen. Aendert sich der Name dort,
    /// aendert er sich hier mit — sonst faellt es nicht auf, sondern die
    /// Sperre hoert still auf zu wirken.
    public static let appGroup = "group.de.lernzeit.app"

    /// Name des ueberwachten Zeitfensters. Die Erweiterung bekommt ihn im
    /// Callback zurueck und kann so fremde Aktivitaeten ignorieren.
    public static let activityName = DeviceActivityName("lernzeit.release")

    /// Freie Zeit nach NUTZUNG (10.10.2026): ein Fenster von knapp 24 Stunden,
    /// in dem Apple die Nutzung der `zaehlAuswahl` misst. Erreicht sie die
    /// Schwelle `nutzungEnde`, sperrt die Erweiterung wieder.
    public static let nutzungName = DeviceActivityName("lernzeit.nutzung")
    public static let nutzungEndeEreignis = DeviceActivityEvent.Name("lernzeit.nutzung.ende")
    /// Zwischenstände alle 5 Minuten, nur für die Anzeige „noch X Min.“
    static let nutzungSchrittPrefix = "lernzeit.nutzung.min."

    /// Ruhezeit (z. B. 21–6 Uhr): täglich wiederkehrend. Über Mitternacht in
    /// zwei Fenster geteilt (a: bis 23:59:59, b: ab 0:00).
    public static let ruheNameA = DeviceActivityName("lernzeit.ruhe.a")
    public static let ruheNameB = DeviceActivityName("lernzeit.ruhe.b")

    public enum Keys {
        public static let selection = "lernzeit.screentime.selection"
        public static let managing = "lernzeit.screentime.managing"
        public static let releasedUntil = "lernzeit.screentime.releasedUntil"
        /// Zeitpunkte, zu denen das Kind auf dem Sperrbildschirm "Eltern
        /// fragen" gedrueckt hat.
        public static let shieldRequests = "lernzeit.screentime.shieldRequests"
        /// true = alles sperren, die Auswahl sind dann AUSNAHMEN.
        public static let shieldAll = "lernzeit.screentime.shieldAll"
        /// Ende des Probelaufs. Gesetzt heisst: Die Sperre loest sich von
        /// selbst wieder, wenn niemand sie bis dahin bestaetigt.
        public static let trialUntil = "lernzeit.screentime.trialUntil"
        /// Was als Handyzeit zählt (Apple-Auswahl, einmal von Eltern gewählt).
        public static let zaehlAuswahl = "lernzeit.screentime.zaehlAuswahl"
        public static let nutzungMinuten = "lernzeit.screentime.nutzungMinuten"
        public static let nutzungOffen = "lernzeit.screentime.nutzungOffen"
        public static let nutzungVerbraucht = "lernzeit.screentime.nutzungVerbraucht"
        public static let nutzungFensterEnde = "lernzeit.screentime.nutzungFensterEnde"
        /// Ruhezeit in Minuten nach Mitternacht; fehlt = keine Ruhezeit.
        public static let ruheVon = "lernzeit.screentime.ruheVon"
        public static let ruheBis = "lernzeit.screentime.ruheBis"
        public static let ruheAktiv = "lernzeit.screentime.ruheAktiv"
    }

    /// Faellt auf UserDefaults.standard zurueck, falls die App Group fehlt —
    /// etwa weil das Entitlement nicht im Profil steht. Dann funktioniert die
    /// App weiter, nur die Erweiterung sieht nichts. Ein Absturz waere die
    /// schlechtere Antwort.
    public static var defaults: UserDefaults {
        UserDefaults(suiteName: appGroup) ?? .standard
    }

    public static var hasSharedStore: Bool {
        UserDefaults(suiteName: appGroup) != nil
    }

    // MARK: - Zustand

    @available(iOS 16.0, *)
    public static var selection: FamilyActivitySelection? {
        get {
            guard let data = defaults.data(forKey: Keys.selection) else { return nil }
            return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
        }
        set {
            if let newValue, let data = try? JSONEncoder().encode(newValue) {
                defaults.set(data, forKey: Keys.selection)
            } else {
                defaults.removeObject(forKey: Keys.selection)
            }
        }
    }

    public static var managing: Bool {
        get { defaults.bool(forKey: Keys.managing) }
        set { defaults.set(newValue, forKey: Keys.managing) }
    }

    /**
     Alles sperren, statt einzelne Apps auszuwaehlen.

     Vorgabe ist `true`, und das ist der Kern der Vereinfachung: Wer nichts
     einstellt, bekommt die strengste Regel — und muss dafuer nichts tun.

     Die Auswahl (`selection`) kehrt in diesem Modus ihre Bedeutung um: Sie
     sind nicht mehr die gesperrten Apps, sondern die AUSNAHMEN, die offen
     bleiben. Eltern, die Nachrichten oder eine Schul-App freihalten wollen,
     waehlen sie einmal aus; alle anderen fassen den Auswahldialog nie an.

     Der Umweg ueber `object(forKey:)` unterscheidet "nie gesetzt" von
     "ausdruecklich auf false gesetzt". `bool(forKey:)` allein liefert fuer
     beides `false` und haette die Vorgabe still ins Gegenteil verkehrt.
     */
    public static var shieldAll: Bool {
        get {
            guard defaults.object(forKey: Keys.shieldAll) != nil else { return true }
            return defaults.bool(forKey: Keys.shieldAll)
        }
        set { defaults.set(newValue, forKey: Keys.shieldAll) }
    }

    /**
     Ende des Probelaufs — oder nil, wenn die Sperre dauerhaft gilt.

     Warum es das gibt: Apple sagt nirgends, ob eine App, die ALLES sperrt,
     sich dabei selbst mitsperrt. Waere das so, koennte das Kind LernZeit
     nicht mehr oeffnen, um Zeit zu verdienen — und die Eltern kaemen an die
     Sperre nur noch ueber die iOS-Einstellungen heran. Eine Frage, die sich
     nur auf einem echten Geraet beantworten laesst.

     Der Probelauf macht die offene Frage harmlos: Die erste Sperre loest
     sich nach wenigen Minuten von selbst, wenn niemand sie bestaetigt.
     Schlimmstenfalls kostet ein Fehlschlag also ein paar Minuten statt eines
     Telefons, das nur noch ueber die Systemeinstellungen zu retten ist.

     Das Aufloesen erledigt die DeviceActivityMonitor-Erweiterung, nicht die
     App: Wenn LernZeit gesperrt waere, koennte die App selbst nichts mehr
     tun. Genau dafuer ist ein eigener Prozess da.
     */
    public static var trialUntil: Date? {
        get { defaults.object(forKey: Keys.trialUntil) as? Date }
        set {
            if let newValue { defaults.set(newValue, forKey: Keys.trialUntil) }
            else { defaults.removeObject(forKey: Keys.trialUntil) }
        }
    }

    /// Der WAHRE Ablaufzeitpunkt der Freigabe.
    ///
    /// Er kann frueher liegen als das Ende des ueberwachten Zeitfensters: Das
    /// System weist sehr kurze Fenster mit `intervalTooShort` ab, weshalb bei
    /// kleinen Freigaben aufgerundet wird. Massgeblich ist immer dieser Wert,
    /// nie das Fensterende.
    public static var releasedUntil: Date? {
        get { defaults.object(forKey: Keys.releasedUntil) as? Date }
        set {
            if let newValue { defaults.set(newValue, forKey: Keys.releasedUntil) }
            else { defaults.removeObject(forKey: Keys.releasedUntil) }
        }
    }

    // MARK: - Sperre

    /// Stellt die Sperre passend zum Zustand ein: aus, wenn nicht verwaltet
    /// oder gerade freigegeben (und keine Ruhezeit ist); sonst an.
    ///
    /// Seit 10.10.2026 entscheidet diese eine Stelle auch über Freigabe und
    /// Ruhezeit. Vorher sperrte sie immer, und z. B. das Wählen von Ausnahmen
    /// während einer Freigabe schloss das Handy vorzeitig.
    @available(iOS 16.0, *)
    public static func applyShield() {
        let store = ManagedSettingsStore()
        guard managing, ruheAktiv || !istFreigegeben() else {
            store.shield.applications = nil
            store.shield.applicationCategories = nil
            return
        }

        if shieldAll {
            // Alles sperren. Die Auswahl sind hier die Ausnahmen — ist keine
            // getroffen, bleibt nichts offen. Apple laesst Telefon und
            // Einstellungen ohnehin nie sperren.
            store.shield.applications = nil
            store.shield.applicationCategories = .all(except: selection?.applicationTokens ?? [])
            return
        }

        // Nur ausgewaehlte Apps sperren — der Weg fuer Eltern, die
        // ausdruecklich differenzieren wollen.
        guard let auswahl = selection else {
            store.shield.applications = nil
            store.shield.applicationCategories = nil
            return
        }
        store.shield.applications = auswahl.applicationTokens.isEmpty
            ? nil : auswahl.applicationTokens
        store.shield.applicationCategories = auswahl.categoryTokens.isEmpty
            ? nil : .specific(auswahl.categoryTokens)
    }

    /// Läuft gerade freie Zeit — nach Uhr oder nach Nutzung?
    public static func istFreigegeben(now: Date = Date()) -> Bool {
        if let bis = releasedUntil, bis > now { return true }
        return nutzungMinuten > 0
    }

    @available(iOS 16.0, *)
    public static func clearShield() {
        let store = ManagedSettingsStore()
        store.shield.applications = nil
        store.shield.applicationCategories = nil
    }

    /// Hebt einen abgelaufenen, unbestaetigten Probelauf vollstaendig auf.
    ///
    /// Rueckgabe sagt, ob tatsaechlich aufgehoben wurde. Wird sowohl von der
    /// Erweiterung als auch beim Oeffnen der App gerufen — je nachdem, wer
    /// zuerst drankommt. Beides muss gehen: Die Erweiterung fuer den Fall,
    /// dass LernZeit selbst gesperrt ist, die App fuer den Fall, dass das
    /// System die Erweiterung nicht aufgerufen hat.
    @discardableResult
    @available(iOS 16.0, *)
    public static func endTrialIfExpired(now: Date = Date()) -> Bool {
        guard let ende = trialUntil else { return false }
        guard ende <= now else { return false }
        trialUntil = nil
        managing = false
        releasedUntil = nil
        stopMonitoring()
        beendeNutzung(sperren: false)
        clearShield()
        return true
    }

    /// Sperrt wieder, wenn die Freigabe abgelaufen ist. Rueckgabe sagt, ob
    /// tatsaechlich gesperrt wurde — die Erweiterung nutzt das fuers Protokoll.
    @discardableResult
    @available(iOS 16.0, *)
    public static func reshieldIfExpired(now: Date = Date()) -> Bool {
        guard let until = releasedUntil else { return false }
        guard until <= now else { return false }
        releasedUntil = nil
        applyShield()
        return true
    }

    // MARK: - Anfragen vom Sperrbildschirm

    /// Hoechstzahl gemerkter Anfragen.
    ///
    /// Ohne Deckel wuerde ein Kind, das zwanzig Mal auf die gesperrte App
    /// tippt, zwanzig Eintraege erzeugen — und der Wert waechst unbegrenzt,
    /// solange LernZeit nicht geoeffnet wird. Die juengsten sind die
    /// interessanten.
    private static let maxShieldRequests = 20

    /// Wird von der ShieldAction-Erweiterung aufgerufen, wenn das Kind auf
    /// dem Sperrbildschirm "Eltern fragen" drueckt.
    ///
    /// Warum nur merken und nicht sofort senden: Die Erweiterung hat wenige
    /// Sekunden Laufzeit und keinen angemeldeten Supabase-Client. Ein
    /// Netzaufruf von hier waere unzuverlaessig. LernZeit holt die Eintraege
    /// beim naechsten Start ab.
    public static func recordShieldRequest(now: Date = Date()) {
        var zeiten = (defaults.array(forKey: Keys.shieldRequests) as? [Double]) ?? []
        zeiten.append(now.timeIntervalSince1970)
        if zeiten.count > maxShieldRequests {
            zeiten = Array(zeiten.suffix(maxShieldRequests))
        }
        defaults.set(zeiten, forKey: Keys.shieldRequests)
    }

    /// Gibt die gemerkten Anfragen zurueck und leert die Liste.
    ///
    /// Bewusst in einem Schritt: Waeren Lesen und Leeren getrennt, koennte
    /// zwischen beiden eine neue Anfrage eintreffen und verloren gehen.
    public static func takeShieldRequests() -> [Double] {
        let zeiten = (defaults.array(forKey: Keys.shieldRequests) as? [Double]) ?? []
        if !zeiten.isEmpty {
            defaults.removeObject(forKey: Keys.shieldRequests)
        }
        return zeiten
    }

    // MARK: - Ueberwachung des Zeitfensters

    /// Laesst das System die Sperre wieder zuschnappen, auch wenn LernZeit
    /// geschlossen ist.
    ///
    /// Ohne das war die Sperre eine Absichtserklaerung: Wer die App nach dem
    /// Freigeben nicht mehr oeffnete, behielt seine Apps offen.
    ///
    /// Zur Mindestdauer: `startMonitoring` kann mit `intervalTooShort`
    /// abbrechen. Apple nennt die Grenze nicht, deshalb steht hier keine
    /// geratene Zahl im Code — stattdessen wird das gewuenschte Fenster
    /// versucht und bei genau diesem Fehler schrittweise verlaengert. Der
    /// wahre Ablauf bleibt `releasedUntil`; ein aufgerundetes Fenster fuehrt
    /// nur dazu, dass die Erweiterung spaeter prueft, nicht dazu, dass das
    /// Kind laenger frei hat, sobald es LernZeit wieder oeffnet.
    ///
    /// Zurueck kommt das ENDE des tatsaechlich angenommenen Fensters — oder
    /// nil, wenn keines angenommen wurde. Fuer den Probelauf ist das
    /// wesentlich: Dort ist das Fensterende der spaeteste Zeitpunkt, zu dem
    /// eine misslungene Sperre von selbst faellt, und genau diese Zahl gehoert
    /// den Eltern gesagt — nicht die schoenere, die wir uns gewuenscht haben.
    @discardableResult
    @available(iOS 16.0, *)
    public static func startMonitoring(until deadline: Date) -> Date? {
        let center = DeviceActivityCenter()
        center.stopMonitoring([activityName])

        let kalender = Calendar.current
        let felder: Set<Calendar.Component> = [.year, .month, .day, .hour, .minute, .second]
        let start = kalender.dateComponents(felder, from: Date())

        // Aufsteigend, damit das kuerzeste zulaessige Fenster gewinnt.
        for aufschlagMinuten in [0, 15, 20, 30] {
            let ende = deadline.addingTimeInterval(TimeInterval(aufschlagMinuten * 60))
            let schedule = DeviceActivitySchedule(
                intervalStart: start,
                intervalEnd: kalender.dateComponents(felder, from: ende),
                repeats: false
            )
            do {
                try center.startMonitoring(activityName, during: schedule)
                return ende
            } catch DeviceActivityCenter.MonitoringError.intervalTooShort {
                continue
            } catch {
                // Jeder andere Fehler ist nicht durch ein laengeres Fenster zu
                // heilen. Die App prueft den Ablauf weiterhin beim Oeffnen.
                return nil
            }
        }
        return nil
    }

    @available(iOS 16.0, *)
    public static func stopMonitoring() {
        DeviceActivityCenter().stopMonitoring([activityName])
    }

    // MARK: - Freie Zeit nach Nutzung (10.10.2026)
    //
    // Vorher öffnete eine Freigabe das Handy bis Uhrzeit X — auch wenn das
    // Kind es gar nicht benutzte. Jetzt misst Apple die Nutzung
    // (DeviceActivityEvent mit Schwelle, wie bei Apples App-Limits). Ohne
    // `zaehlAuswahl` oder wenn iOS das Fenster ablehnt, bleibt es beim Weg
    // nach Uhr.

    @available(iOS 16.0, *)
    public static var zaehlAuswahl: FamilyActivitySelection? {
        get {
            guard let data = defaults.data(forKey: Keys.zaehlAuswahl) else { return nil }
            return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
        }
        set {
            if let newValue, let data = try? JSONEncoder().encode(newValue) {
                defaults.set(data, forKey: Keys.zaehlAuswahl)
            } else {
                defaults.removeObject(forKey: Keys.zaehlAuswahl)
            }
        }
    }

    @available(iOS 16.0, *)
    public static var zaehltNutzung: Bool {
        guard let a = zaehlAuswahl else { return false }
        return !(a.applicationTokens.isEmpty && a.categoryTokens.isEmpty && a.webDomainTokens.isEmpty)
    }

    /// Schwelle, die gerade gezählt wird (0 = keine freie Zeit nach Nutzung).
    public static var nutzungMinuten: Int {
        get { defaults.integer(forKey: Keys.nutzungMinuten) }
        set { defaults.set(newValue, forKey: Keys.nutzungMinuten) }
    }

    /// Während des Zählens dazugekommene Minuten. Werden beim Erreichen der
    /// Schwelle als neue Schwelle gestartet — so muss das laufende Fenster
    /// nie mitten im Zählen ersetzt werden.
    public static var nutzungOffen: Int {
        get { defaults.integer(forKey: Keys.nutzungOffen) }
        set { defaults.set(newValue, forKey: Keys.nutzungOffen) }
    }

    /// Schon genutzt von `nutzungMinuten`, in 5-Minuten-Schritten (Anzeige).
    public static var nutzungVerbraucht: Int {
        get { defaults.integer(forKey: Keys.nutzungVerbraucht) }
        set { defaults.set(newValue, forKey: Keys.nutzungVerbraucht) }
    }

    public static var nutzungFensterEnde: Date? {
        get { defaults.object(forKey: Keys.nutzungFensterEnde) as? Date }
        set {
            if let newValue { defaults.set(newValue, forKey: Keys.nutzungFensterEnde) }
            else { defaults.removeObject(forKey: Keys.nutzungFensterEnde) }
        }
    }

    /// Restliche freie Minuten nach Nutzung, nil wenn keine laufen.
    public static var nutzungRest: Int? {
        guard nutzungMinuten > 0 else { return nil }
        return max(0, nutzungMinuten - nutzungVerbraucht) + nutzungOffen
    }

    @available(iOS 16.0, *)
    static func ereignis(_ auswahl: FamilyActivitySelection, minuten: Int) -> DeviceActivityEvent {
        let schwelle = DateComponents(hour: minuten / 60, minute: minuten % 60)
        if #available(iOS 17.4, *) {
            // Nur Nutzung AB JETZT zählen, nicht die frühere des Tages.
            return DeviceActivityEvent(
                applications: auswahl.applicationTokens,
                categories: auswahl.categoryTokens,
                webDomains: auswahl.webDomainTokens,
                threshold: schwelle,
                includesPastActivity: false
            )
        }
        return DeviceActivityEvent(
            applications: auswahl.applicationTokens,
            categories: auswahl.categoryTokens,
            webDomains: auswahl.webDomainTokens,
            threshold: schwelle
        )
    }

    /// Startet das Zählen für `minuten`. false = geht nicht (keine Auswahl,
    /// iOS lehnt ab) — dann gibt der Aufrufer nach Uhr frei.
    @discardableResult
    @available(iOS 16.0, *)
    public static func starteNutzung(minuten: Int) -> Bool {
        guard minuten > 0, zaehltNutzung, let auswahl = zaehlAuswahl else { return false }
        let center = DeviceActivityCenter()
        center.stopMonitoring([nutzungName])

        var ereignisse: [DeviceActivityEvent.Name: DeviceActivityEvent] = [
            nutzungEndeEreignis: ereignis(auswahl, minuten: minuten)
        ]
        for schritt in stride(from: 5, to: minuten, by: 5) {
            ereignisse[DeviceActivityEvent.Name(nutzungSchrittPrefix + String(schritt))] =
                ereignis(auswahl, minuten: schritt)
        }

        let kalender = Calendar.current
        let felder: Set<Calendar.Component> = [.year, .month, .day, .hour, .minute, .second]
        let jetzt = Date()
        // Knapp 24 Stunden (über Mitternacht), sonst bis Tagesende. Was dann
        // noch übrig ist, verfällt.
        var enden = [jetzt.addingTimeInterval(23 * 3600 + 50 * 60)]
        if let tagesende = kalender.date(bySettingHour: 23, minute: 59, second: 59, of: jetzt) {
            enden.append(tagesende)
        }
        for ende in enden where ende.timeIntervalSince(jetzt) >= 15 * 60 {
            let schedule = DeviceActivitySchedule(
                intervalStart: kalender.dateComponents(felder, from: jetzt),
                intervalEnd: kalender.dateComponents(felder, from: ende),
                repeats: false
            )
            do {
                try center.startMonitoring(nutzungName, during: schedule, events: ereignisse)
                nutzungMinuten = minuten
                nutzungVerbraucht = 0
                nutzungFensterEnde = ende
                return true
            } catch {
                continue
            }
        }
        return false
    }

    /// Ende der freien Zeit nach Nutzung: alles zurücksetzen, ggf. sperren.
    @available(iOS 16.0, *)
    public static func beendeNutzung(sperren: Bool = true) {
        nutzungMinuten = 0
        nutzungOffen = 0
        nutzungVerbraucht = 0
        nutzungFensterEnde = nil
        DeviceActivityCenter().stopMonitoring([nutzungName])
        if sperren { applyShield() }
    }

    /// Eine Freigabe über `minuten`: nach Nutzung, wenn möglich, sonst nach Uhr.
    /// Läuft schon Zeit nach Nutzung, kommen die Minuten obendrauf.
    @available(iOS 16.0, *)
    public static func freigeben(minuten: Int) {
        guard minuten > 0 else { return }
        if nutzungMinuten > 0 {
            nutzungOffen += minuten
        } else if !starteNutzung(minuten: minuten) {
            let basis = max(releasedUntil ?? Date(), Date())
            let ablauf = basis.addingTimeInterval(TimeInterval(minuten * 60))
            releasedUntil = ablauf
            startMonitoring(until: ablauf)
        }
        applyShield()
    }

    /// Aus der Erweiterung: Schwelle erreicht.
    @available(iOS 16.0, *)
    public static func nutzungSchwelleErreicht(_ name: DeviceActivityEvent.Name) {
        if name == nutzungEndeEreignis {
            let offen = nutzungOffen
            nutzungOffen = 0
            if offen > 0 {
                if starteNutzung(minuten: offen) {
                    applyShield()
                    return
                }
                beendeNutzung(sperren: false)
                let ablauf = Date().addingTimeInterval(TimeInterval(offen * 60))
                releasedUntil = ablauf
                startMonitoring(until: ablauf)
                applyShield()
                return
            }
            beendeNutzung()
            return
        }
        if name.rawValue.hasPrefix(nutzungSchrittPrefix),
           let schritt = Int(name.rawValue.dropFirst(nutzungSchrittPrefix.count)) {
            nutzungVerbraucht = max(nutzungVerbraucht, schritt)
        }
    }

    /// Aus der Erweiterung: Fenster zu Ende. Nur echtes Ende zählt — beim
    /// Neustart des Zählens ruft iOS das Ende des alten Fensters ggf. auch.
    @available(iOS 16.0, *)
    public static func nutzungFensterBeendet(now: Date = Date()) {
        guard let ende = nutzungFensterEnde else { return }
        guard now >= ende.addingTimeInterval(-120) else { return }
        beendeNutzung()
    }

    // MARK: - Ruhezeit (10.10.2026)

    /// Minuten nach Mitternacht oder nil.
    public static var ruheVon: Int? { defaults.object(forKey: Keys.ruheVon) as? Int }
    public static var ruheBis: Int? { defaults.object(forKey: Keys.ruheBis) as? Int }

    /// Von der Erweiterung an den Fenstergrenzen gesetzt, von der App beim
    /// Öffnen nachgezogen (`ruheNachUhr`).
    public static var ruheAktiv: Bool {
        get { defaults.bool(forKey: Keys.ruheAktiv) }
        set { defaults.set(newValue, forKey: Keys.ruheAktiv) }
    }

    /// Ist laut Uhr gerade Ruhezeit?
    public static func ruheNachUhr(now: Date = Date()) -> Bool {
        guard let von = ruheVon, let bis = ruheBis, von != bis else { return false }
        let teile = Calendar.current.dateComponents([.hour, .minute], from: now)
        let m = (teile.hour ?? 0) * 60 + (teile.minute ?? 0)
        return von < bis ? (m >= von && m < bis) : (m >= von || m < bis)
    }

    /// Setzt die Ruhezeit (nil = keine) und plant Apples tägliche Fenster.
    @available(iOS 16.0, *)
    public static func setzeRuhezeit(von: Int?, bis: Int?) {
        let center = DeviceActivityCenter()
        center.stopMonitoring([ruheNameA, ruheNameB])
        guard let von, let bis, von != bis, (0..<1440).contains(von), (0..<1440).contains(bis) else {
            defaults.removeObject(forKey: Keys.ruheVon)
            defaults.removeObject(forKey: Keys.ruheBis)
            ruheAktiv = false
            applyShield()
            return
        }
        defaults.set(von, forKey: Keys.ruheVon)
        defaults.set(bis, forKey: Keys.ruheBis)

        func zeit(_ m: Int) -> DateComponents { DateComponents(hour: m / 60, minute: m % 60) }
        let tagesende = DateComponents(hour: 23, minute: 59, second: 59)

        if von < bis {
            try? center.startMonitoring(ruheNameA, during: DeviceActivitySchedule(
                intervalStart: zeit(von), intervalEnd: zeit(bis), repeats: true))
        } else {
            try? center.startMonitoring(ruheNameA, during: DeviceActivitySchedule(
                intervalStart: zeit(von), intervalEnd: tagesende, repeats: true))
            if bis > 0 {
                try? center.startMonitoring(ruheNameB, during: DeviceActivitySchedule(
                    intervalStart: DateComponents(hour: 0, minute: 0), intervalEnd: zeit(bis), repeats: true))
            }
        }
        ruheAktiv = ruheNachUhr()
        applyShield()
    }

    /// Aus der Erweiterung: Beginn oder Ende eines Ruhe-Fensters.
    @available(iOS 16.0, *)
    public static func ruheFenster(_ activity: DeviceActivityName, beginnt: Bool) {
        if beginnt {
            ruheAktiv = true
        } else {
            // Ende von „a“ um 23:59:59 bei Ruhezeit über Mitternacht: „b“
            // folgt sofort, also nicht kurz öffnen.
            let ueberMitternacht = (ruheVon ?? 0) > (ruheBis ?? 0) && (ruheBis ?? 0) > 0
            if activity == ruheNameA && ueberMitternacht { return }
            ruheAktiv = false
        }
        applyShield()
    }
}

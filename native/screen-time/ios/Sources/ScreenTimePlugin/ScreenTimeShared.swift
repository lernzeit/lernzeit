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

    @available(iOS 16.0, *)
    public static func applyShield() {
        let store = ManagedSettingsStore()
        guard managing else {
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
}

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
        guard managing, let selection = selection else {
            store.shield.applications = nil
            store.shield.applicationCategories = nil
            return
        }
        store.shield.applications = selection.applicationTokens.isEmpty
            ? nil : selection.applicationTokens
        store.shield.applicationCategories = selection.categoryTokens.isEmpty
            ? nil : .specific(selection.categoryTokens)
    }

    @available(iOS 16.0, *)
    public static func clearShield() {
        let store = ManagedSettingsStore()
        store.shield.applications = nil
        store.shield.applicationCategories = nil
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
    @available(iOS 16.0, *)
    public static func startMonitoring(until deadline: Date) {
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
                return
            } catch DeviceActivityCenter.MonitoringError.intervalTooShort {
                continue
            } catch {
                // Jeder andere Fehler ist nicht durch ein laengeres Fenster zu
                // heilen. Die App prueft den Ablauf weiterhin beim Oeffnen.
                return
            }
        }
    }

    @available(iOS 16.0, *)
    public static func stopMonitoring() {
        DeviceActivityCenter().stopMonitoring([activityName])
    }
}

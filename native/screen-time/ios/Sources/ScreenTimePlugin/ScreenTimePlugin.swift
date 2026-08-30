import Capacitor
import FamilyControls
import ManagedSettings
import SwiftUI
import UIKit

/// Bildschirmzeit-Sperre ueber Apples Family Controls.
///
/// Warum dieser Code hier liegt und nicht in ios/App/App/: Der Build wirft das
/// ios-Verzeichnis bei jedem Lauf weg ("rm -rf ios" + "npx cap add ios").
/// Alles, was dort liegt, waere nach dem naechsten Build verschwunden. Als
/// eigenes Paket mit podspec zieht "npx cap sync ios" die Dateien dagegen bei
/// jedem Lauf wieder herein.
///
/// ── Was diese erste Fassung kann und was NICHT ────────────────────────────
///
/// Kann: Berechtigung anfragen, Apps auswaehlen, sperren, alles freigeben,
/// wieder sperren, Zustand melden.
///
/// Kann NICHT: die Sperre nach Ablauf von selbst wieder zuschnappen lassen,
/// solange die App geschlossen ist. Dafuer braucht es eine
/// DeviceActivityMonitor-Erweiterung, und die verlangt einen eigenen
/// App-Identifier samt Profil. Bis dahin prueft die App den Ablauf, sobald sie
/// wieder in den Vordergrund kommt.
///
/// Das ist eine ECHTE Luecke, kein Schoenheitsfehler: Wer LernZeit nach dem
/// Freigeben nicht mehr oeffnet, behaelt die Apps offen. Diese Fassung ist
/// zum Erproben auf dem eigenen Geraet gedacht, nicht zum Ausliefern.
///
/// Der Modus 'selected' (Kind waehlt eine App) fehlt hier ebenfalls noch —
/// bewusst, um die Menge an ungetestetem Swift klein zu halten.
@objc(ScreenTimePlugin)
public class ScreenTimePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ScreenTimePlugin"
    public let jsName = "ScreenTime"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pickShieldedApps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "applyShield", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "releaseFor", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restoreShield", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopManaging", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise)
    ]

    private enum Keys {
        static let selection = "lernzeit.screentime.selection"
        static let managing = "lernzeit.screentime.managing"
        static let releasedUntil = "lernzeit.screentime.releasedUntil"
    }

    private let defaults = UserDefaults.standard

    // MARK: - Zustand lesen und schreiben

    @available(iOS 16.0, *)
    private var storedSelection: FamilyActivitySelection? {
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

    private var managing: Bool {
        get { defaults.bool(forKey: Keys.managing) }
        set { defaults.set(newValue, forKey: Keys.managing) }
    }

    private var releasedUntil: Date? {
        get { defaults.object(forKey: Keys.releasedUntil) as? Date }
        set {
            if let newValue { defaults.set(newValue, forKey: Keys.releasedUntil) }
            else { defaults.removeObject(forKey: Keys.releasedUntil) }
        }
    }

    // MARK: - Sperre setzen und loesen

    @available(iOS 16.0, *)
    private func shieldNow() {
        let store = ManagedSettingsStore()
        guard managing, let selection = storedSelection else {
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
    private func unshieldNow() {
        let store = ManagedSettingsStore()
        store.shield.applications = nil
        store.shield.applicationCategories = nil
    }

    /// Ersatz fuer die noch fehlende DeviceActivityMonitor-Erweiterung: Bei
    /// jeder Abfrage pruefen, ob die Freigabe abgelaufen ist, und dann wieder
    /// sperren. Greift nur, solange die App laeuft — siehe Hinweis oben.
    @available(iOS 16.0, *)
    private func reshieldIfExpired() {
        guard let until = releasedUntil else { return }
        if until <= Date() {
            releasedUntil = nil
            shieldNow()
        }
    }

    // MARK: - Statusobjekt fuer die Web-Seite

    @available(iOS 16.0, *)
    private func statusPayload() -> [String: Any] {
        reshieldIfExpired()

        let authorization: String
        switch AuthorizationCenter.shared.authorizationStatus {
        case .approved: authorization = "approved"
        case .denied: authorization = "denied"
        default: authorization = "notDetermined"
        }

        let selection = storedSelection
        let shieldedCount = (selection?.applicationTokens.count ?? 0)
            + (selection?.categoryTokens.count ?? 0)

        let running = releasedUntil.map { $0 > Date() } ?? false
        var payload: [String: Any] = [
            "authorization": authorization,
            "managing": managing,
            "shieldedCount": shieldedCount,
            // Diese Fassung gibt immer alles frei; im Modus 'selected' waere
            // hier die Zahl der tatsaechlich offenen Apps zu fuehren.
            "releasedCount": running ? shieldedCount : 0
        ]
        if running, let until = releasedUntil {
            payload["releasedUntil"] = ISO8601DateFormatter().string(from: until)
        } else {
            payload["releasedUntil"] = NSNull()
        }
        return payload
    }

    private func rejectUnavailable(_ call: CAPPluginCall) {
        call.resolve([
            "authorization": "notDetermined",
            "managing": false,
            "shieldedCount": 0,
            "releasedCount": 0,
            "releasedUntil": NSNull()
        ])
    }

    // MARK: - Schnittstelle

    @objc func isAvailable(_ call: CAPPluginCall) {
        if #available(iOS 16.0, *) {
            call.resolve(["available": true])
        } else {
            call.resolve(["available": false, "reason": "os-version"])
        }
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else {
            return call.resolve(["authorization": "denied"])
        }
        Task {
            do {
                // .child: Ein Elternteil bestaetigt auf dem KINDGERAET, Apple
                // verlangt dafuer die Bildschirmzeit-Kennung.
                try await AuthorizationCenter.shared.requestAuthorization(for: .child)
                call.resolve(["authorization": "approved"])
            } catch {
                call.resolve(["authorization": "denied"])
            }
        }
    }

    @objc func pickShieldedApps(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else {
            return call.resolve(["shieldedCount": 0, "cancelled": true])
        }
        DispatchQueue.main.async { [weak self] in
            guard let self, let host = self.bridge?.viewController else {
                return call.resolve(["shieldedCount": 0, "cancelled": true])
            }

            let start = self.storedSelection ?? FamilyActivitySelection()
            var controller: UIViewController?

            let view = AppPickerView(
                initial: start,
                onDone: { [weak self] result in
                    controller?.dismiss(animated: true)
                    guard let self else { return }
                    guard let result else {
                        return call.resolve(["shieldedCount": 0, "cancelled": true])
                    }
                    self.storedSelection = result
                    self.managing = true
                    self.shieldNow()
                    let count = result.applicationTokens.count + result.categoryTokens.count
                    call.resolve(["shieldedCount": count, "cancelled": false])
                }
            )

            let hosting = UIHostingController(rootView: view)
            controller = hosting
            host.present(hosting, animated: true)
        }
    }

    @objc func applyShield(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { return rejectUnavailable(call) }
        managing = true
        releasedUntil = nil
        shieldNow()
        call.resolve(statusPayload())
    }

    @objc func releaseFor(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { return rejectUnavailable(call) }
        let minutes = call.getInt("minutes") ?? 0
        guard minutes > 0 else { return call.reject("minutes muss groesser als 0 sein") }

        // Verlaengern statt ersetzen: Wer waehrend einer laufenden Freigabe
        // weiterlernt, bekommt die neuen Minuten hinten angehaengt. Andersherum
        // waere es eine Bestrafung fuers Weiterlernen.
        let basis = max(releasedUntil ?? Date(), Date())
        releasedUntil = basis.addingTimeInterval(TimeInterval(minutes * 60))
        unshieldNow()

        var payload = statusPayload()
        payload["cancelled"] = false
        payload["grantedMinutes"] = minutes
        call.resolve(payload)
    }

    @objc func restoreShield(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { return rejectUnavailable(call) }
        releasedUntil = nil
        shieldNow()
        call.resolve(statusPayload())
    }

    @objc func stopManaging(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { return rejectUnavailable(call) }
        // Der Notausstieg. Sperre faellt, Auswahl wird vergessen.
        managing = false
        releasedUntil = nil
        storedSelection = nil
        unshieldNow()
        call.resolve(statusPayload())
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { return rejectUnavailable(call) }
        call.resolve(statusPayload())
    }
}

/// Apples Auswahldialog. Zeigt Namen und Symbole, ohne dass unser Code die
/// Identitaet der Apps erfaehrt — zurueck kommen ausschliesslich opake Tokens.
@available(iOS 16.0, *)
private struct AppPickerView: View {
    @State private var selection: FamilyActivitySelection
    private let onDone: (FamilyActivitySelection?) -> Void

    init(initial: FamilyActivitySelection, onDone: @escaping (FamilyActivitySelection?) -> Void) {
        _selection = State(initialValue: initial)
        self.onDone = onDone
    }

    var body: some View {
        NavigationView {
            FamilyActivityPicker(selection: $selection)
                .navigationTitle("Apps sperren")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Abbrechen") { onDone(nil) }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Fertig") { onDone(selection) }
                    }
                }
        }
    }
}

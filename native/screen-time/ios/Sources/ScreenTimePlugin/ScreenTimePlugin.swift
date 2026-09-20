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
/// ── Was diese Fassung kann und was NICHT ──────────────────────────────────
///
/// Kann: Berechtigung anfragen, Apps auswaehlen, sperren, fuer eine bestimmte
/// Zeit freigeben, nach Ablauf von selbst wieder sperren, Zustand melden.
///
/// Das Zuschnappen nach Ablauf erledigt die DeviceActivityMonitor-Erweiterung
/// (native/screen-time/ios/Extensions). Sie laeuft als eigener Prozess und
/// braucht LernZeit dafuer nicht im Vordergrund. In der vorigen Fassung stand
/// an dieser Stelle eine ECHTE Luecke: Wer die App nach dem Freigeben nicht
/// mehr oeffnete, behielt seine Apps offen. Die Pruefung beim Oeffnen bleibt
/// als zweiter Weg bestehen — sie greift frueher, wenn das Zeitfenster
/// aufgerundet werden musste.
///
/// Kann NICHT: einen eigenen Sperrbildschirm zeigen (iOS zeigt seinen
/// grauen Standard), und den Modus 'selected', bei dem das Kind eine einzelne
/// App auswaehlt. Beides bewusst spaeter — um die Menge an ungetestetem Swift
/// klein zu halten.
///
/// Der Zustand liegt in der App Group, nicht in UserDefaults.standard: Die
/// Erweiterung ist ein eigener Prozess und saehe sonst nichts. Siehe
/// ScreenTimeShared.swift.
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
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pendingShieldRequests", returnType: CAPPluginReturnPromise)
    ]

    // MARK: - Zustand
    //
    // Alles liegt in LernzeitScreenTime, damit App und Erweiterung dieselbe
    // Wahrheit lesen. Die Huellen hier halten die uebrigen Methoden lesbar.

    @available(iOS 16.0, *)
    private var storedSelection: FamilyActivitySelection? {
        get { LernzeitScreenTime.selection }
        set { LernzeitScreenTime.selection = newValue }
    }

    private var managing: Bool {
        get { LernzeitScreenTime.managing }
        set { LernzeitScreenTime.managing = newValue }
    }

    private var releasedUntil: Date? {
        get { LernzeitScreenTime.releasedUntil }
        set { LernzeitScreenTime.releasedUntil = newValue }
    }

    @available(iOS 16.0, *)
    private func shieldNow() { LernzeitScreenTime.applyShield() }

    @available(iOS 16.0, *)
    private func unshieldNow() { LernzeitScreenTime.clearShield() }

    /// Zweiter Weg neben der Erweiterung: Kommt die App in den Vordergrund und
    /// die Freigabe ist abgelaufen, wird sofort gesperrt. Das greift frueher
    /// als das Zeitfenster, wenn dieses aufgerundet werden musste.
    @available(iOS 16.0, *)
    private func reshieldIfExpired() {
        if LernzeitScreenTime.reshieldIfExpired() {
            LernzeitScreenTime.stopMonitoring()
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
            "shieldAll": LernzeitScreenTime.shieldAll,
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

    /// Schaltet die Sperre ein.
    ///
    /// `shieldAll` (Vorgabe true) sperrt ALLES und behandelt die Auswahl als
    /// Ausnahmen. Ohne den Parameter bleibt der zuletzt gesetzte Modus.
    @objc func applyShield(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { return rejectUnavailable(call) }
        if let alles = call.getBool("shieldAll") {
            LernzeitScreenTime.shieldAll = alles
        }
        managing = true
        releasedUntil = nil
        LernzeitScreenTime.stopMonitoring()
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
        let ablauf = basis.addingTimeInterval(TimeInterval(minutes * 60))
        releasedUntil = ablauf
        unshieldNow()
        // Ab hier uebernimmt das System: Auch wenn LernZeit geschlossen wird,
        // schnappt die Sperre zu.
        LernzeitScreenTime.startMonitoring(until: ablauf)

        var payload = statusPayload()
        payload["cancelled"] = false
        payload["grantedMinutes"] = minutes
        call.resolve(payload)
    }

    @objc func restoreShield(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { return rejectUnavailable(call) }
        releasedUntil = nil
        LernzeitScreenTime.stopMonitoring()
        shieldNow()
        call.resolve(statusPayload())
    }

    @objc func stopManaging(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { return rejectUnavailable(call) }
        // Der Notausstieg. Sperre faellt, Auswahl wird vergessen.
        managing = false
        releasedUntil = nil
        storedSelection = nil
        LernzeitScreenTime.stopMonitoring()
        unshieldNow()
        call.resolve(statusPayload())
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { return rejectUnavailable(call) }
        call.resolve(statusPayload())
    }

    /// Holt die Knopfdruecke vom Sperrbildschirm ab und leert die Liste.
    ///
    /// Zurueck gehen nur Zeitpunkte als ISO-8601, nie eine App. Welche App
    /// das Kind oeffnen wollte, erfaehrt dieser Code nicht — das Token bleibt
    /// in Apples Hand.
    @objc func pendingShieldRequests(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { return rejectUnavailable(call) }
        let formatierer = ISO8601DateFormatter()
        let zeiten = LernzeitScreenTime.takeShieldRequests()
            .map { formatierer.string(from: Date(timeIntervalSince1970: $0)) }
        call.resolve(["requestedAt": zeiten])
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

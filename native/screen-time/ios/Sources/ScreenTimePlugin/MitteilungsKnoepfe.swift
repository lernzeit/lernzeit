import Foundation
import UIKit
import UserNotifications

/// Knöpfe an Mitteilungen für Eltern (29.10.2026), z. B. auf der Apple Watch.
///
/// send-push schickt die Anfrage mit `ios_category` = `LZ_ANFRAGE`
/// („Genehmigen“/„Ablehnen“) und „Eltern fragen“ mit `LZ_ELTERN_FRAGEN`
/// („15 Min.“/„30 Min.“). In den Daten der Mitteilung stehen ein Schlüssel
/// nur für diese Mitteilung und die Adresse der Funktion `mitteilung-antwort`.
///
/// Die Knöpfe öffnen LernZeit nicht: iOS weckt die App kurz im Hintergrund,
/// diese Klasse schickt Schlüssel und Knopf an den Server und meldet das
/// Ergebnis als kurze Mitteilung („5 Min. für Klara genehmigt“). Die Web-Ebene
/// läuft dabei nicht sicher, deshalb geschieht das hier in Swift.
///
/// Capacitor setzt beim Start seinen `NotificationRouter` als Delegate der
/// Mitteilungszentrale (lokale Mitteilungen, Push-Plugin). Diese Klasse legt
/// sich davor und gibt alles, was nicht ihre Knöpfe sind, unverändert weiter.
/// OneSignal hängt sich per Swizzling an jeden Delegate und bleibt so dabei.
final class MitteilungsKnoepfe: NSObject, UNUserNotificationCenterDelegate {

    static let shared = MitteilungsKnoepfe()

    private static let artAnfrage = "LZ_ANFRAGE"
    private static let artElternFragen = "LZ_ELTERN_FRAGEN"
    private static let aktionen: Set<String> = ["genehmigen", "ablehnen", "extra15", "extra30"]

    /// Der Delegate davor (Capacitor). Stark gehalten: Er gehört zwar der
    /// Bridge, aber die Mitteilungszentrale hält Delegates nur schwach.
    private var weiter: UNUserNotificationCenterDelegate?

    /// Beim Laden des Plugins aufrufen (nach Capacitors Router).
    static func einrichten() {
        let center = UNUserNotificationCenter.current()

        // Nur iPhone-entsperrt bzw. Watch am Handgelenk: Ein Kind am
        // gesperrten Eltern-iPhone kann nichts genehmigen.
        let sicher: UNNotificationActionOptions = [.authenticationRequired]
        let anfrage = UNNotificationCategory(
            identifier: artAnfrage,
            actions: [
                UNNotificationAction(identifier: "genehmigen", title: "Genehmigen", options: sicher),
                UNNotificationAction(identifier: "ablehnen", title: "Ablehnen", options: sicher.union(.destructive)),
            ],
            intentIdentifiers: [],
            options: [])
        let elternFragen = UNNotificationCategory(
            identifier: artElternFragen,
            actions: [
                UNNotificationAction(identifier: "extra15", title: "15 Min. geben", options: sicher),
                UNNotificationAction(identifier: "extra30", title: "30 Min. geben", options: sicher),
            ],
            intentIdentifiers: [],
            options: [])

        // Vorhandene Arten (OneSignal, lokale Mitteilungen) behalten
        center.getNotificationCategories { vorhanden in
            let andere = vorhanden.filter { $0.identifier != artAnfrage && $0.identifier != artElternFragen }
            center.setNotificationCategories(andere.union([anfrage, elternFragen]))
        }

        if !(center.delegate is MitteilungsKnoepfe) {
            shared.weiter = center.delegate
            center.delegate = shared
        }
    }

    // MARK: - Delegate

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        if let w = weiter,
           w.responds(to: #selector(UNUserNotificationCenterDelegate.userNotificationCenter(_:willPresent:withCompletionHandler:))) {
            w.userNotificationCenter?(center, willPresent: notification, withCompletionHandler: completionHandler)
        } else {
            completionHandler([.banner, .list, .sound])
        }
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let art = response.notification.request.content.categoryIdentifier
        let aktion = response.actionIdentifier
        if (art == Self.artAnfrage || art == Self.artElternFragen) && Self.aktionen.contains(aktion) {
            beantworten(daten: Self.daten(response.notification.request.content.userInfo), aktion: aktion,
                        fertig: completionHandler)
            return
        }
        if let w = weiter,
           w.responds(to: #selector(UNUserNotificationCenterDelegate.userNotificationCenter(_:didReceive:withCompletionHandler:))) {
            w.userNotificationCenter?(center, didReceive: response, withCompletionHandler: completionHandler)
        } else {
            completionHandler()
        }
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, openSettingsFor notification: UNNotification?) {
        weiter?.userNotificationCenter?(center, openSettingsFor: notification)
    }

    // MARK: - Antwort an den Server

    /// OneSignal legt die eigenen Daten unter `custom.a` ab.
    private static func daten(_ info: [AnyHashable: Any]) -> [String: Any] {
        if let custom = info["custom"] as? [String: Any], let a = custom["a"] as? [String: Any] {
            return a
        }
        var flach: [String: Any] = [:]
        for (k, v) in info { if let k = k as? String { flach[k] = v } }
        return flach
    }

    private func beantworten(daten: [String: Any], aktion: String, fertig: @escaping () -> Void) {
        guard let schluessel = daten["schluessel"] as? String,
              let adresse = daten["antwort_url"] as? String,
              let url = URL(string: adresse), url.scheme == "https" else {
            melden("Bitte öffne LernZeit und antworte dort.", fertig: fertig)
            return
        }

        // Etwas Zeit erbitten, falls iOS die App gleich wieder schlafen legt
        var aufgabe = UIBackgroundTaskIdentifier.invalid
        aufgabe = UIApplication.shared.beginBackgroundTask(withName: "LernZeitAntwort") {
            UIApplication.shared.endBackgroundTask(aufgabe)
            aufgabe = .invalid
        }

        var anfrage = URLRequest(url: url, timeoutInterval: 15)
        anfrage.httpMethod = "POST"
        anfrage.setValue("application/json", forHTTPHeaderField: "Content-Type")
        anfrage.httpBody = try? JSONSerialization.data(withJSONObject: ["schluessel": schluessel, "aktion": aktion])

        URLSession.shared.dataTask(with: anfrage) { [weak self] koerper, _, fehler in
            var text = "Das hat nicht geklappt. Bitte öffne LernZeit und antworte dort."
            if fehler == nil, let koerper = koerper,
               let antwort = try? JSONSerialization.jsonObject(with: koerper) as? [String: Any],
               let t = antwort["text"] as? String, !t.isEmpty {
                text = t
            }
            self?.melden(text) {
                fertig()
                if aufgabe != .invalid {
                    UIApplication.shared.endBackgroundTask(aufgabe)
                    aufgabe = .invalid
                }
            }
        }.resume()
    }

    /// Kurze Bestätigung als lokale Mitteilung (erscheint auch auf der Watch).
    private func melden(_ text: String, fertig: @escaping () -> Void) {
        let inhalt = UNMutableNotificationContent()
        inhalt.title = "LernZeit"
        inhalt.body = text
        let mitteilung = UNNotificationRequest(identifier: "lz-antwort-\(UUID().uuidString)", content: inhalt, trigger: nil)
        UNUserNotificationCenter.current().add(mitteilung) { _ in
            DispatchQueue.main.async { fertig() }
        }
    }
}

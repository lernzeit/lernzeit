import ManagedSettings
import Foundation

/// Was passiert, wenn das Kind auf dem Sperrbildschirm einen Knopf drueckt.
///
/// ── Eine Grenze, die Apple setzt und die man kennen muss ──────────────────
///
/// Diese Erweiterung kann KEINE App oeffnen. Es gibt keinen Weg, von hier aus
/// LernZeit zu starten — weder ueber eine URL noch sonstwie. Der Knopf kann
/// den Sperrbildschirm schliessen, ihn stehen lassen, oder die Sperre
/// aufheben. Mehr nicht.
///
/// Deshalb heisst der erste Knopf "Verstanden" und nicht "Jetzt Zeit
/// verdienen": Ein Knopf, der verspricht die App zu oeffnen und es dann nicht
/// tut, ist schlimmer als ein ehrlicher Hinweis.
///
/// Der zweite Knopf schickt die Bitte seit 20.10.2026 direkt an den Server
/// (Push an die Eltern) und merkt sie zusätzlich in der App Group. Klappt das
/// Senden nicht, holt LernZeit den Druck beim naechsten Start nach.
@available(iOS 16.0, *)
class ShieldActionExtension: ShieldActionDelegate {

    private func behandle(_ action: ShieldAction,
                          _ completionHandler: @escaping (ShieldActionResponse) -> Void) {
        switch action {
        case .primaryButtonPressed:
            completionHandler(.close)
        case .secondaryButtonPressed:
            // Merken (Rückfallweg) und gleich an die Eltern schicken. Danach
            // bleibt der Sperrbildschirm stehen (.defer) und zeigt, ob die
            // Bitte raus ist (ShieldConfig liest letzteAnfrage…).
            let jetzt = Date()
            LernzeitScreenTime.recordShieldRequest(now: jetzt)
            LernzeitScreenTime.letzteAnfrageAm = jetzt
            LernzeitScreenTime.letzteAnfrageGesendet = false
            LernzeitScreenTime.anfrageSenden(zeitpunkt: jetzt) { gesendet in
                LernzeitScreenTime.letzteAnfrageGesendet = gesendet
                completionHandler(.defer)
            }
        @unknown default:
            // Neue Knopfarten koennen in kuenftigen iOS-Fassungen dazukommen.
            // Schliessen ist die harmloseste Antwort: Die Sperre bleibt.
            completionHandler(.close)
        }
    }

    override func handle(action: ShieldAction,
                         for application: ApplicationToken,
                         completionHandler: @escaping (ShieldActionResponse) -> Void) {
        behandle(action, completionHandler)
    }

    override func handle(action: ShieldAction,
                         for category: ActivityCategoryToken,
                         completionHandler: @escaping (ShieldActionResponse) -> Void) {
        behandle(action, completionHandler)
    }

    override func handle(action: ShieldAction,
                         for webDomain: WebDomainToken,
                         completionHandler: @escaping (ShieldActionResponse) -> Void) {
        behandle(action, completionHandler)
    }
}

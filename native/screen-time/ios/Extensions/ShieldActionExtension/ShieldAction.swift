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
/// Der zweite Knopf merkt sich die Anfrage in der App Group. LernZeit liest
/// sie beim naechsten Start aus und kann den Eltern zeigen, wann das Kind um
/// Zeit gebeten hat — auch fuer die Versuche, bei denen es die App danach
/// nicht geoeffnet hat. Das ist die Information, die heute niemand hat.
@available(iOS 16.0, *)
class ShieldActionExtension: ShieldActionDelegate {

    private func behandle(_ action: ShieldAction,
                          _ completionHandler: @escaping (ShieldActionResponse) -> Void) {
        switch action {
        case .primaryButtonPressed:
            completionHandler(.close)
        case .secondaryButtonPressed:
            LernzeitScreenTime.recordShieldRequest()
            completionHandler(.close)
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

import ManagedSettings
import ManagedSettingsUI
import UIKit

/// Der Sperrbildschirm, den das Kind sieht, wenn es eine gesperrte App
/// oeffnet.
///
/// Ohne diese Erweiterung zeigt iOS seinen eigenen grauen Standard: ein
/// Schloss, "Eingeschraenkt", und nichts, was erklaert warum. Ein Kind, das
/// nicht versteht, warum die App zu ist, haelt die Sperre fuer eine Stoerung
/// — und die Eltern bekommen die Frage, nicht die App.
///
/// Deshalb sagt dieser Bildschirm drei Dinge: dass es Absicht ist, wie sich
/// die Sperre aufheben laesst, und dass es einen Weg gibt zu fragen.
///
/// Die Erweiterung ist ein eigener Prozess mit wenigen Sekunden Laufzeit und
/// ohne Netzzugriff. Alles hier ist deshalb statisch.
@available(iOS 16.0, *)
class ShieldConfigurationExtension: ShieldConfigurationDataSource {

    /// LernZeits Akzentfarbe, dieselbe wie in index.html (#22d3ee).
    private static let akzent = UIColor(red: 0.13, green: 0.83, blue: 0.93, alpha: 1.0)

    private func lernzeitSchild() -> ShieldConfiguration {
        ShieldConfiguration(
            backgroundBlurStyle: .systemMaterialDark,
            backgroundColor: UIColor(red: 0.07, green: 0.09, blue: 0.11, alpha: 1.0),
            icon: UIImage(systemName: "hourglass"),
            title: ShieldConfiguration.Label(
                text: "Erst Zeit verdienen",
                color: .white
            ),
            subtitle: ShieldConfiguration.Label(
                text: "Loese in LernZeit ein paar Aufgaben — pro richtiger Antwort bekommst du Bildschirmzeit.",
                color: UIColor(white: 0.75, alpha: 1.0)
            ),
            primaryButtonLabel: ShieldConfiguration.Label(
                text: "Verstanden",
                color: UIColor(red: 0.07, green: 0.09, blue: 0.11, alpha: 1.0)
            ),
            primaryButtonBackgroundColor: Self.akzent,
            secondaryButtonLabel: ShieldConfiguration.Label(
                text: "Eltern fragen",
                color: UIColor(white: 0.75, alpha: 1.0)
            )
        )
    }

    // Vier Ueberschreibungen, weil iOS je nach Sperrgrund eine andere
    // aufruft. Alle zeigen dasselbe: Fuer das Kind ist es derselbe Fall.

    override func configuration(shielding application: Application) -> ShieldConfiguration {
        lernzeitSchild()
    }

    override func configuration(shielding application: Application,
                                in category: ActivityCategory) -> ShieldConfiguration {
        lernzeitSchild()
    }

    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        lernzeitSchild()
    }

    override func configuration(shielding webDomain: WebDomain,
                                in category: ActivityCategory) -> ShieldConfiguration {
        lernzeitSchild()
    }
}

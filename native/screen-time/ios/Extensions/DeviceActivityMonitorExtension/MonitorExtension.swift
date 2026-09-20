import DeviceActivity
import Foundation

/// Schnappt die Sperre wieder zu, wenn die verdiente Zeit abgelaufen ist —
/// auch dann, wenn LernZeit geschlossen ist.
///
/// Das ist die Luecke, die in der ersten Fassung der Sperre offen stand und
/// im Quelltext ausdruecklich als "ECHTE Luecke, kein Schoenheitsfehler"
/// vermerkt war: Wer die App nach dem Freigeben nicht mehr oeffnete, behielt
/// seine Apps offen.
///
/// Die Erweiterung ist ein eigener Prozess. Sie sieht den Zustand nur ueber
/// die App Group, und sie hat wenige Sekunden Laufzeit — deshalb steht hier
/// nichts als das Noetigste.
@available(iOS 16.0, *)
class DeviceActivityMonitorExtension: DeviceActivityMonitor {

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        // Fremde Aktivitaeten ignorieren. Heute gibt es nur eine, aber ein
        // stiller Fehlgriff waere spaeter kaum zu finden.
        guard activity == LernzeitScreenTime.activityName else { return }

        // Bewusst NICHT blind sperren, sondern nur bei abgelaufener Freigabe.
        // Das Fenster kann aufgerundet worden sein (siehe startMonitoring),
        // und in der Zwischenzeit kann die App die Freigabe verlaengert haben
        // — dann ist Sperren hier falsch.
        if LernzeitScreenTime.reshieldIfExpired() { return }

        // Freigabe laeuft noch: neues Fenster bis zum wahren Ablauf setzen,
        // sonst prueft niemand mehr nach.
        if let until = LernzeitScreenTime.releasedUntil, until > Date() {
            LernzeitScreenTime.startMonitoring(until: until)
        }
    }

    /// Wird beim Start des Fensters aufgerufen. Hier ist nichts zu tun — die
    /// Freigabe hat die App bereits erteilt. Die Ueberschreibung steht
    /// trotzdem da, damit sichtbar ist, dass sie bedacht und nicht vergessen
    /// wurde.
    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
    }
}

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
        // Freie Zeit nach Nutzung: Fenster (knapp 24 h) vorbei, Rest verfällt.
        if activity == LernzeitScreenTime.nutzungName {
            LernzeitScreenTime.nutzungFensterBeendet()
            return
        }
        if activity == LernzeitScreenTime.ruheNameA || activity == LernzeitScreenTime.ruheNameB {
            LernzeitScreenTime.ruheFenster(activity, beginnt: false)
            return
        }
        // Fremde Aktivitaeten ignorieren.
        guard activity == LernzeitScreenTime.activityName else { return }

        // Zuerst der Probelauf: Laeuft eine unbestaetigte Probesperre ab,
        // faellt sie GANZ — nicht nur bis zur naechsten Freigabe. Das ist der
        // Notausstieg fuer den Fall, dass LernZeit sich unter .all() selbst
        // mitsperrt und die App deshalb gar nichts mehr tun kann.
        if LernzeitScreenTime.endTrialIfExpired() { return }

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

    /// Beginn eines Fensters. Nur die Ruhezeit braucht hier etwas: sperren.
    /// Freigaben hat die App beim Start bereits erteilt.
    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        if activity == LernzeitScreenTime.ruheNameA || activity == LernzeitScreenTime.ruheNameB {
            LernzeitScreenTime.ruheFenster(activity, beginnt: true)
        }
    }

    /// Freie Zeit nach Nutzung: Schwelle (oder 5-Minuten-Zwischenstand)
    /// erreicht. Am Ende sperrt das wieder — wie Apples App-Limits.
    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)
        guard activity == LernzeitScreenTime.nutzungName else { return }
        LernzeitScreenTime.nutzungSchwelleErreicht(event)
    }
}

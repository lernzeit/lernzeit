/**
 * Vertrag zwischen der Web-Oberflaeche und dem nativen Bildschirmzeit-Plugin.
 *
 * Warum diese Datei vor dem Swift-Code entsteht: Der native Teil laesst sich
 * hier weder uebersetzen noch testen. Ein Fehler in der Schnittstelle faellt
 * dann erst nach einem Codemagic-Lauf auf einem echten Geraet auf. Die
 * Schnittstelle zuerst festzulegen ist die einzige Stelle, an der ein Irrtum
 * noch billig ist.
 *
 * Grundsatz, der sich aus Apples API ergibt und den man nicht umgehen kann:
 *
 *   Ein ApplicationToken ist GERAETEGEBUNDEN und OPAK. Es laesst sich nicht
 *   auf ein anderes Geraet uebertragen und nicht in eine Bundle-ID aufloesen.
 *
 * Daraus folgt die Aufteilung:
 *
 *   Kindgeraet   Auswahl der gesperrten Apps (App Group), Sperren, Entsperren
 *   Server       nur die Regel (Modus, Auto-Freigabe) und die erteilten
 *                Minuten mit Ablaufzeitpunkt
 *
 * Der Server erfaehrt deshalb auch im Modus 'selected' nie, welche App das
 * Kind gewaehlt hat. Diese Schnittstelle gibt niemals einen Token oder einen
 * App-Namen an die Web-Seite zurueck — nur Anzahlen und Zustaende.
 */

/** Was die Familie mit der verdienten Zeit anfangen darf. */
export type UnlockMode =
  /** Die verdiente Zeit hebt die Sperre fuer ALLE gesperrten Apps auf. */
  | 'all'
  /** Das Kind waehlt beim Einloesen eine App aus der Sperrliste. */
  | 'selected';

export type AuthorizationState =
  /** Noch nie gefragt. */
  | 'notDetermined'
  /** Ein Elternteil hat zugestimmt — nur dann darf gesperrt werden. */
  | 'approved'
  /** Abgelehnt oder spaeter entzogen. */
  | 'denied';

export interface ScreenTimeAvailability {
  /**
   * false auf Web und Android sowie auf iOS vor 16.1. Die Oberflaeche darf
   * die Einrichtung dann gar nicht erst anbieten — ein Schalter, der nichts
   * bewirkt, ist schlimmer als kein Schalter.
   */
  available: boolean;
  /** Grund, wenn nicht verfuegbar — fuer eine ehrliche Meldung an die Eltern. */
  reason?: 'platform' | 'os-version' | 'entitlement-missing';
}

export interface ShieldStatus {
  authorization: AuthorizationState;
  /** Wie viele Apps aktuell gesperrt sind. Nie WELCHE. */
  shieldedCount: number;
  /** true, solange eine Freigabe laeuft. */
  unlocked: boolean;
  /** Ende der laufenden Freigabe, ISO-8601. null, wenn keine laeuft. */
  unlockedUntil: string | null;
}

export interface ScreenTimePlugin {
  isAvailable(): Promise<ScreenTimeAvailability>;

  /**
   * Fragt die Berechtigung ab (AuthorizationCenter, .child). Muss von einem
   * Elternteil auf dem KINDGERAET bestaetigt werden — Apple verlangt dafuer
   * die Bildschirmzeit-Kennung beziehungsweise die Familienfreigabe.
   */
  requestAuthorization(): Promise<{ authorization: AuthorizationState }>;

  /**
   * Oeffnet Apples FamilyActivityPicker. Die Auswahl wird auf dem Geraet
   * gespeichert; zurueck kommt nur, wie viele Apps es geworden sind.
   * Abbruch durch den Nutzer ist kein Fehler: cancelled = true.
   */
  pickShieldedApps(): Promise<{ shieldedCount: number; cancelled: boolean }>;

  /** Legt die Sperre ueber die gespeicherte Auswahl. */
  applyShield(): Promise<ShieldStatus>;

  /**
   * Hebt die Sperre fuer `minutes` Minuten auf und laesst sie danach von
   * einem DeviceActivityMonitor automatisch wieder zuschnappen.
   *
   * mode 'all'      — alle gesperrten Apps
   * mode 'selected' — das Kind waehlt eine App; der Auswahldialog laeuft
   *                   nativ ueber der gespeicherten Liste, damit Name und
   *                   Symbol angezeigt werden koennen, ohne dass unser Code
   *                   die Identitaet erfaehrt.
   */
  releaseFor(options: { minutes: number; mode: UnlockMode }): Promise<ShieldStatus>;

  /** Setzt die Sperre sofort zurueck, etwa wenn die Eltern abbrechen. */
  restoreShield(): Promise<ShieldStatus>;

  getStatus(): Promise<ShieldStatus>;
}

/**
 * Ersatz fuer Web und Android. Bewusst kein Fehler, sondern ein klares "geht
 * hier nicht" — der Aufrufer soll die Einrichtung ausblenden, nicht abstuerzen.
 */
export const UNAVAILABLE: ScreenTimeAvailability = {
  available: false,
  reason: 'platform',
};

export const EMPTY_STATUS: ShieldStatus = {
  authorization: 'notDetermined',
  shieldedCount: 0,
  unlocked: false,
  unlockedUntil: null,
};

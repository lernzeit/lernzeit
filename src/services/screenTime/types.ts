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
 *
 * ── Zwei Bedingungen an den Aufrufer ─────────────────────────────────────
 *
 * 1. ELTERNSCHUTZ: pickShieldedApps() und stopManaging() duerfen NUR nach
 *    einer Anmeldung als Elternteil erreichbar sein. Apple verlangt die
 *    Bildschirmzeit-Kennung ausschliesslich beim ERSTEN Zustimmen, danach nie
 *    wieder. Waere der Auswahldialog frei zugaenglich, koennte das Kind auf
 *    seinem eigenen Geraet einfach alle Apps abwaehlen — die Sperre waere
 *    eine Empfehlung.
 *
 * 2. GERAETEUHR: Wann eine Freigabe endet, entscheidet das Geraet. Dessen Uhr
 *    laesst sich verstellen. Das ist technisch nicht sauber loesbar (Apples
 *    eigene Bildschirmzeit hat dieselbe Schwaeche) und wird deshalb als
 *    bekannte Grenze festgehalten, nicht verschwiegen. Fuer die Abrechnung
 *    gilt die Serverzeit in screen_time_unlocks, fuer die Durchsetzung das
 *    Geraet.
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
  /** Abgelehnt oder spaeter in den Systemeinstellungen entzogen. */
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
  /**
   * true, solange LernZeit auf diesem Geraet ueberhaupt sperrt. false nach
   * stopManaging() oder bevor je eingerichtet wurde.
   */
  managing: boolean;
  /** Wie viele Apps die Sperrliste umfasst. Nie WELCHE. */
  shieldedCount: number;
  /**
   * Wie viele davon gerade freigegeben sind. 0 heisst: alles zu.
   *
   * Bewusst eine Zahl statt eines Ja/Nein: Im Modus 'selected' ist genau eine
   * App offen und der Rest gesperrt. Ein blosses "entsperrt: ja" haette diesen
   * Zustand nicht abbilden koennen.
   */
  releasedCount: number;
  /** Ende der laufenden Freigabe, ISO-8601. null, wenn keine laeuft. */
  releasedUntil: string | null;
}

export interface ReleaseResult extends ShieldStatus {
  /**
   * true, wenn das Kind den Auswahldialog abgebrochen hat (nur im Modus
   * 'selected' moeglich).
   *
   * Der Aufrufer MUSS das auswerten: Bei cancelled darf die verdiente Zeit
   * NICHT abgebucht werden. Sonst verliert das Kind Minuten, die es sich
   * erarbeitet hat, und bekommt dafuer nichts — der sicherste Weg, jemanden
   * aus der App zu vertreiben.
   */
  cancelled: boolean;
  /**
   * Minuten, die durch diesen Aufruf tatsaechlich gutgeschrieben wurden.
   * 0 bei Abbruch. Bei einer Verlaengerung nur der neue Anteil.
   */
  grantedMinutes: number;
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
   *
   * NUR fuer Eltern erreichbar machen — siehe Bedingung 1 oben.
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
   *
   * VERLAENGERT eine laufende Freigabe, ersetzt sie nicht. Wer waehrend einer
   * laufenden Freigabe weiterlernt, bekommt die neuen Minuten hinten
   * angehaengt. Der umgekehrte Fall — neue Zeit loescht die alte — waere aus
   * Sicht des Kindes eine Bestrafung fuers Weiterlernen.
   *
   * Im Modus 'selected' bei laufender Freigabe wird NICHT erneut gefragt; die
   * Verlaengerung gilt der bereits gewaehlten App.
   */
  releaseFor(options: { minutes: number; mode: UnlockMode }): Promise<ReleaseResult>;

  /**
   * Beendet eine laufende Freigabe sofort und sperrt wieder — etwa wenn die
   * Eltern abbrechen. Die Sperrliste bleibt bestehen.
   */
  restoreShield(): Promise<ShieldStatus>;

  /**
   * Der Notausstieg: hebt die Sperre vollstaendig auf und vergisst die
   * Auswahl. Danach sperrt LernZeit auf diesem Geraet nichts mehr.
   *
   * Muss es geben. Eine Familie, die sich nicht selbst befreien kann, wenn
   * das Geraet wechselt oder etwas schiefgeht, ist ein Support-Fall und eine
   * schlechte Bewertung. Apple fragt in der Pruefung ausdruecklich danach.
   *
   * NUR fuer Eltern erreichbar machen — siehe Bedingung 1 oben.
   */
  stopManaging(): Promise<ShieldStatus>;

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
  managing: false,
  shieldedCount: 0,
  releasedCount: 0,
  releasedUntil: null,
};

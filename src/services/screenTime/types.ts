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
 * Diese Schnittstelle gibt niemals einen Token oder einen App-Namen an die
 * Web-Seite zurueck — nur Anzahlen und Zustaende.
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

/*
 * Der frueher hier stehende `UnlockMode` mit den Werten 'all' und 'selected'
 * ist am 20.09.2026 entfallen.
 *
 * 'selected' haette das Kind beim Einloesen eine einzelne App waehlen lassen.
 * Die Entscheidung dagegen kam aus der Benutzung: Wer 15 Minuten verdient
 * hat, will 15 Minuten — und nicht vorher eine Liste durchgehen. Jede
 * Freigabe gilt seitdem fuer alles, was gesperrt ist.
 *
 * Die Spalte `child_settings.screen_time_unlock_mode` steht deshalb dauerhaft
 * auf 'all'.
 */

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
  /**
   * true = es wird ALLES gesperrt, und `shieldedCount` zaehlt die AUSNAHMEN,
   * die offen bleiben. false = es werden nur die ausgewaehlten Apps gesperrt.
   *
   * Vorgabe ist true. Das ist der Kern der Einrichtung: Wer nichts einstellt,
   * bekommt die strengste Regel und muss dafuer nichts tun. Der
   * Auswahldialog ist ein Angebot fuer Eltern, die einzelne Apps offenhalten
   * wollen — keine Pflicht auf dem Weg zur Sperre.
   */
  shieldAll: boolean;
  /**
   * Wie viele Eintraege die Auswahl umfasst. Nie WELCHE.
   *
   * Je nach `shieldAll` sind das die gesperrten Apps (false) oder die
   * Ausnahmen (true).
   */
  shieldedCount: number;
  /**
   * Ende der laufenden Freigabe, ISO-8601. null, wenn keine laeuft.
   *
   * Das ist die EINZIGE Auskunft darueber, ob gerade offen ist. Ein
   * frueher hier gefuehrtes `releasedCount` ist am 20.09.2026 entfallen:
   * Seit jede Freigabe fuer alles gilt, zaehlte es nichts mehr, was sich
   * zaehlen liesse — bei `shieldAll` ohne Ausnahmen haette es waehrend
   * einer laufenden Freigabe 0 gemeldet und damit "alles zu" behauptet.
   */
  releasedUntil: string | null;
}

export interface ReleaseResult extends ShieldStatus {
  /**
   * true, wenn die Freigabe nicht zustande kam.
   *
   * Der Aufrufer MUSS das auswerten: Bei cancelled darf die verdiente Zeit
   * NICHT abgebucht werden. Sonst verliert das Kind Minuten, die es sich
   * erarbeitet hat, und bekommt dafuer nichts — der sicherste Weg, jemanden
   * aus der App zu vertreiben.
   *
   * Seit dem Wegfall des Modus 'selected' gibt es keinen Auswahldialog mehr,
   * der abgebrochen werden koennte; das Feld bleibt als Absicherung fuer
   * kuenftige Faelle und ist heute immer false.
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

  /**
   * Schaltet die Sperre ein.
   *
   * `shieldAll: true` (die Vorgabe) sperrt ALLES; eine gespeicherte Auswahl
   * gilt dann als Ausnahmenliste. `shieldAll: false` sperrt nur die
   * ausgewaehlten Apps. Ohne Angabe bleibt der zuletzt gesetzte Modus.
   */
  applyShield(options?: { shieldAll?: boolean }): Promise<ShieldStatus>;

  /**
   * Hebt die Sperre fuer `minutes` Minuten auf und laesst sie danach von
   * einem DeviceActivityMonitor automatisch wieder zuschnappen.
   *
   * Die Freigabe gilt immer fuer ALLES, was gesperrt ist. Eine Auswahl beim
   * Einloesen gibt es nicht mehr — siehe den Hinweis zu UnlockMode oben.
   *
   * VERLAENGERT eine laufende Freigabe, ersetzt sie nicht. Wer waehrend einer
   * laufenden Freigabe weiterlernt, bekommt die neuen Minuten hinten
   * angehaengt. Der umgekehrte Fall — neue Zeit loescht die alte — waere aus
   * Sicht des Kindes eine Bestrafung fuers Weiterlernen.
   */
  releaseFor(options: { minutes: number }): Promise<ReleaseResult>;

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

  /**
   * Holt die Anfragen ab, die das Kind auf dem SPERRBILDSCHIRM gestellt hat —
   * ueber den Knopf "Eltern fragen".
   *
   * Warum es das gibt: Apple erlaubt einer Sperrbildschirm-Erweiterung nicht,
   * eine App zu oeffnen. Das Kind kann von dort aus also nicht zu LernZeit
   * springen. Die Erweiterung merkt sich den Knopfdruck stattdessen in der
   * App Group, und LernZeit holt ihn beim naechsten Start ab.
   *
   * Der Wert davon liegt gerade in den Faellen, in denen das Kind die App
   * NICHT gleich oeffnet: Die Eltern sehen sonst nie, dass es um Zeit gebeten
   * hat.
   *
   * Der Aufruf LEERT die Liste. Wer das Ergebnis verwirft, verliert es —
   * anders ginge es nicht, ohne zwischen Lesen und Leeren eine Luecke zu
   * lassen, in der eine neue Anfrage verschwindet.
   *
   * Gibt ausschliesslich Zeitpunkte zurueck, nie eine App: Welche App das
   * Kind oeffnen wollte, erfaehrt unser Code nicht und soll er nicht
   * erfahren.
   */
  pendingShieldRequests(): Promise<{ requestedAt: string[] }>;
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
  // Der strengere Wert als Vorgabe. Faellt der Status aus — Web, Android, ein
  // Plugin-Fehler — soll die Oberflaeche nicht behaupten, es seien nur
  // einzelne Apps betroffen.
  shieldAll: true,
  shieldedCount: 0,
  releasedUntil: null,
};

import { Link } from 'react-router-dom';
import { META_DATENSCHUTZ } from '@/content/meta';
import Seo from '@/components/Seo';
import { RechtsKasten, RechtsSeite } from '@/components/landing/RechtsSeite';

/**
 * Datenschutzerklaerung, ergaenzt am 04.10.2026: Verantwortlicher mit
 * Anschrift, Rechtsgrundlagen je Zweck, Website-Hosting, eigene Messung
 * (analytics_events, Zufallskennung im Browser), RevenueCat, Kuendigung und
 * Widerruf, Speicherdauer, Widerspruchsrecht nach Art. 21, zustaendige
 * Aufsichtsbehoerde.
 *
 * 26.10.2026: Abschnitt 5.4 „Werbemessung“ (Google Ads und Meta nur nach
 * Einwilligung, nur Website, nur Erwachsene). Entscheidung des Betreibers, der
 * die Verantwortung traegt; Variante B in docs/conversion-tracking-2026-10-26.md.
 * Die Kanzlei hat den Wortlaut NICHT geprueft (ihr Entwurf § 8a sah keine
 * Skripte vor). Offene Punkte: docs/rechtstexte-pruefung.md.
 */
const Datenschutz = () => (
  <RechtsSeite titel="Datenschutzerklärung" stand="26. Oktober 2026">
    <Seo
      title={META_DATENSCHUTZ.title}
      description={META_DATENSCHUTZ.description}
      path="/datenschutz"
    />

    <section>
      <h2>1. Verantwortlicher</h2>
      <p>
        LernZeit UG (haftungsbeschränkt), Drachengasse 10, 99084 Erfurt, Deutschland
        <br />
        E-Mail: <a href="mailto:info@lernzeit.app">info@lernzeit.app</a>
      </p>
      <p>
        Für alle Fragen zum Datenschutz erreichen Sie uns unter dieser Adresse oder über das{' '}
        <Link to="/support">Kontaktformular</Link>.
      </p>
    </section>

    <section>
      <h2>2. Welche Daten wir verarbeiten</h2>
      <h3>2.1 Konten</h3>
      <ul>
        <li>Eltern: E-Mail-Adresse, Passwort (verschlüsselt gespeichert), Name (freiwillig), Rolle</li>
        <li>Kinder: E-Mail-Adresse oder nur ein Benutzername, Passwort (verschlüsselt), Name (freiwillig), Klassenstufe, gewählter Avatar</li>
        <li>Verbindung zwischen Eltern- und Kinderkonto sowie die protokollierte Einwilligung der Eltern</li>
      </ul>
      <h3>2.2 Nutzung</h3>
      <ul>
        <li>gelöste Aufgaben, Antworten, Lernfortschritt und Statistiken</li>
        <li>verdiente, angefragte und freigegebene Bildschirmzeit, Regeln der Eltern</li>
        <li>
          bei der LernZeit-Handysperre auf dem iPhone: wie viele Minuten das Kind an einem Tag genutzt hat (nur die Summe
          je Tag, ohne Apps; nach 31 Tagen überschrieben), Extra-Zeit der Eltern und wann der Elterncode genutzt
          wurde. Welche Apps das Kind nutzt, erfahren wir nicht; Apple zählt die Nutzung auf dem Gerät.
        </li>
        <li>Lerntage in Folge, Sticker und gestaltete Hefte, Tintentropfen (Spielpunkte ohne Geldwert), Fortschritt der Lernreise, freigeschaltete Figuren und geöffnete Türchen im Adventskalender</li>
        <li>falsch beantwortete Aufgaben, damit das Kind sie später berichtigen kann</li>
        <li>Meldungen zu fehlerhaften Aufgaben und Bewertungen von Aufgaben</li>
        <li>Eingaben an den KI-Tutor und für den KI-Lernplan</li>
        <li>
          Fotos von Heft, Buch oder Arbeitsblatt, die Eltern für den KI-Lernplan hochladen: Die App verkleinert sie
          vorher und entfernt dabei Bildangaben wie den Aufnahmeort. Wir speichern die Fotos nicht, sondern nur den
          Unterrichtsstoff, den die KI daraus ausliest (ohne Namen, Noten oder Bemerkungen der Lehrkraft).
        </li>
      </ul>
      <h3>2.3 Abo und Verträge</h3>
      <ul>
        <li>Tarif, Laufzeit und Status des Premium-Abos; Zahlungsdaten selbst verarbeitet nur der Zahlungsdienstleister</li>
        <li>Kündigungen und Widerrufe, die Sie über die Website abgeben: Name, E-Mail-Adresse, Vertrag, gewünschter Zeitpunkt, Grund (falls angegeben), Eingangszeit</li>
      </ul>
      <h3>2.4 Kontakt</h3>
      <p>Wenn Sie uns schreiben: Ihre Nachricht, Ihre E-Mail-Adresse und unsere Antwort.</p>
    </section>

    <section>
      <h2>3. Zwecke und Rechtsgrundlagen</h2>
      <ul>
        <li>
          <strong>Bereitstellung von LernZeit</strong> (Konten, Aufgaben, Bildschirmzeit, Eltern-Kind-Verbindung,
          KI-Funktionen, Abo): Art. 6 Abs. 1 lit. b DSGVO (Vertrag).
        </li>
        <li>
          <strong>Konten von Kindern unter 16 Jahren:</strong> Einwilligung der Eltern, Art. 6 Abs. 1 lit. a in
          Verbindung mit Art. 8 DSGVO.
        </li>
        <li>
          <strong>Service-E-Mails an Eltern</strong> (z. B. Hilfe beim Einrichten, Ende der Testphase) und{' '}
          <strong>Support:</strong> Art. 6 Abs. 1 lit. b DSGVO, soweit sie den Vertrag betreffen, sonst lit. f
          (berechtigtes Interesse an einer funktionierenden Nutzung). Service-E-Mails lassen sich jederzeit abbestellen.
        </li>
        <li>
          <strong>Push-Benachrichtigungen:</strong> nur, wenn Sie oder Ihr Kind sie auf dem Gerät erlaubt haben,
          Art. 6 Abs. 1 lit. a DSGVO.
        </li>
        <li>
          <strong>Kündigungen, Widerrufe, Rechnungen:</strong> Art. 6 Abs. 1 lit. c DSGVO (gesetzliche Pflichten,
          z. B. §§ 312k, 356a BGB, Aufbewahrung nach Handels- und Steuerrecht).
        </li>
        <li>
          <strong>Sicherheit, Fehlersuche und eigene Auswertung</strong> (Abschnitt 5): Art. 6 Abs. 1 lit. f DSGVO.
          Unser berechtigtes Interesse ist ein sicherer, funktionierender Dienst und zu verstehen, welche Teile von
          Website und App genutzt werden.
        </li>
      </ul>
    </section>

    <section>
      <h2>4. Besondere Bestimmungen für Kinder</h2>
      <p>LernZeit ist eine Lern-App für Kinder. Für ihre Daten gilt zusätzlich:</p>
      <ul>
        <li>Wir erheben nur die Daten, die für das Lernen und die Bildschirmzeit nötig sind.</li>
        <li>
          <strong>Keine Werbung:</strong> In LernZeit wird weder personalisierte noch kontextbezogene Werbung Dritter
          ausgespielt. Es sind keine Werbe-SDKs eingebunden.
        </li>
        <li>
          <strong>Kein Tracking, keine Profile für Dritte:</strong> keine geräte- oder app-übergreifende Verfolgung,
          keine Werbe-Kennungen (IDFA/AAID). Die App fragt unter iOS deshalb keine Tracking-Erlaubnis (ATT) ab. Die
          Werbemessung nach Abschnitt 5.4 gibt es nur auf der Website, nur für Erwachsene, nur mit Zustimmung – nie in
          den Apps und nie für Kinder.
        </li>
        <li>
          <strong>Keine Weitergabe von Kinderdaten an Werbenetzwerke oder Datenhändler.</strong> Nutzungsereignisse aus
          Kinderkonten bleiben in unserer eigenen Datenbank.
        </li>
        <li>
          <strong>Käufe nur durch Eltern:</strong> Premium ist nur im Elternkonto erhältlich.
        </li>
        <li>
          <strong>Einwilligung der Eltern:</strong> Sie wird beim Verbinden eines Kinderkontos eingeholt und
          protokolliert. Eltern können die Daten ihrer Kinder jederzeit einsehen und löschen lassen.
        </li>
        <li>
          Service-E-Mails gehen nur an Eltern. Kinder, die sich mit E-Mail-Adresse anmelden, erhalten nur die
          technisch nötigen Anmelde-E-Mails (z. B. Bestätigung der Adresse).
        </li>
      </ul>
    </section>

    <section>
      <h2>5. Website, App-Betrieb und eigene Auswertung</h2>
      <h3>5.1 Aufruf der Website</h3>
      <p>
        Beim Aufruf von lernzeit.app verarbeitet unser Hosting-Dienstleister technisch notwendige Verbindungsdaten
        (z. B. IP-Adresse, Zeitpunkt, aufgerufene Adresse, Browserkennung), um die Seiten auszuliefern und vor
        Missbrauch zu schützen.
      </p>
      <h3>5.2 Eigene Auswertung ohne Cookies</h3>
      <p>
        Wir zählen, wie Website und App genutzt werden, zum Beispiel aufgerufene Seiten, welche Abschnitte der
        Startseite gesehen wurden, Klicks auf die Store-Links, die Schritte der Registrierung (nie Ihre Eingaben) und
        einzelne Schritte in der App (z. B. erste Lerneinheit, Zeitanfrage). Dazu legt die Website im Speicher Ihres
        Browsers (localStorage) eine zufällige Kennung und gegebenenfalls die Kampagnen-Angaben aus dem Link ab, über
        den Sie gekommen sind (z. B. utm_source, verweisende Seite). Die Ereignisse speichern wir ausschließlich in
        unserer eigenen Datenbank in der EU; sie gehen an keinen Dritten. Wir setzen keine Cookies für diese
        Auswertung und kein Analysewerkzeug eines anderen Anbieters ein. Die Werbemessung, die es nur mit Ihrer
        Zustimmung gibt, steht in Abschnitt 5.4.
      </p>
      <p>
        Sie können die Speicherung verhindern, indem Sie die Website-Daten in Ihrem Browser löschen oder blockieren.
        Widerspruch ist außerdem jederzeit per E-Mail möglich (Abschnitt 9).
      </p>
      <h3>5.3 Lokale Speicherung für den Betrieb</h3>
      <p>
        Für die Anmeldung und Ihre Einstellungen (z. B. gewählte Ansicht, ob ein Hinweis schon gezeigt wurde) nutzen
        Website und App den lokalen Speicher des Geräts. Ohne diese Speicherung funktioniert die Anmeldung nicht.
      </p>
      <h3 id="werbung">5.4 Werbemessung (nur mit Ihrer Zustimmung)</h3>
      <p>
        Wir bewerben LernZeit bei Google und Meta. Damit wir erkennen, welche Anzeigen dazu führen, dass sich Eltern
        registrieren, und die Anzeigen darauf ausrichten können, melden wir die Registrierung eines Elternkontos an
        Google (Google Ads) und Meta (Facebook, Instagram), <strong>wenn Sie dem zustimmen</strong>. Ohne Ihre Zustimmung
        lädt die Website keine Skripte dieser Anbieter und übermittelt nichts an sie.
      </p>
      <ul>
        <li>
          <strong>Wo und für wen:</strong> nur auf unserer Website (lernzeit.app), nur auf Seiten für Erwachsene
          (Startseite, Zielseiten, Ratgeber, Preise, FAQ) und beim Anlegen eines Elternkontos. Nie in den Apps, nie
          für Kinder, nie auf Seiten mit Einladungscode, nie bei angemeldeten Konten.
        </li>
        <li>
          <strong>Was Sie gefragt werden:</strong> Beim ersten Besuch erscheint ein Hinweis. Sie wählen getrennt für
          Google und Meta; „Alle ablehnen“ und „Alle zulassen“ sind gleich leicht erreichbar. Ihre Entscheidung speichern
          wir im lokalen Speicher Ihres Browsers.
        </li>
        <li>
          <strong>Was geladen wird:</strong> bei Zustimmung für Google das Google-Tag (Google Ireland Limited), bei Zustimmung
          für Meta das Meta-Pixel (Meta Platforms Ireland Limited). Die Anbieter erhalten dabei technisch bedingt Ihre
          IP-Adresse, Browserangaben und die Adresse der aufgerufenen Seite und können Cookies bzw. Kennungen setzen
          (z. B. Google: _gcl_aw, Meta: _fbp, in der Regel bis zu 90 Tage). Bei Google ist die Personalisierung von
          Anzeigen ausgeschaltet.
        </li>
        <li>
          <strong>Was gemeldet wird:</strong> ausschließlich das Ereignis „Registrierung abgeschlossen“ eines Elternkontos.
          Keine E-Mail-Adresse, kein Name, keine Nutzerkennung, kein Betrag, keine Daten von Kindern. Kinder- und
          Testkonten werden nicht gemeldet.
        </li>
        <li>
          <strong>Zuordnung bei uns:</strong> Haben Sie zugestimmt und registrieren sich als Elternteil, speichern wir bei
          Ihrem Konto die Kampagnenangaben des Links (utm_source, utm_campaign u. a.) und, falls vorhanden, die Klick-Kennung
          der Anzeige (gclid, gbraid, wbraid). Sie dienen nur dazu, Konten Anzeigen zuzuordnen, und werden nach
          13 Monaten gelöscht.
        </li>
        <li>
          <strong>Rechtsgrundlage:</strong> Ihre Einwilligung, Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TDDDG.
          Für die Erhebung und Weitergabe durch das Meta-Pixel sind wir gemeinsam mit Meta Platforms Ireland Limited
          verantwortlich (Art. 26 DSGVO); die Vereinbarung dazu stellt Meta in seinen Bedingungen für Business-Tools bereit.
          Übermittlungen in die USA stützen die Anbieter auf Standardvertragsklauseln bzw. das EU-US Data Privacy Framework.
        </li>
        <li>
          <strong>Widerruf:</strong> jederzeit mit Wirkung für die Zukunft unter „Werbe-Einstellungen“ im Seitenfuß der
          Website. Wir löschen dann die Cookies der Anbieter in Ihrem Browser und, wenn Sie angemeldet sind, die
          Zuordnung Ihres Kontos zu einer Anzeige. Die Rechtmäßigkeit der bisherigen Verarbeitung bleibt unberührt.
        </li>
      </ul>
    </section>

    <section>
      <h2>6. Empfänger und Dienstleister</h2>
      <p>
        Wir setzen sorgfältig ausgewählte Dienstleister ein, die Daten nur in unserem Auftrag verarbeiten
        (Art. 28 DSGVO), soweit sie nicht selbst verantwortlich sind:
      </p>
      <ul>
        <li><strong>Supabase</strong> (Rechenzentrum in der EU): Datenbank, Anmeldung, Server-Funktionen</li>
        <li><strong>Lovable</strong>: Hosting und Auslieferung der Website lernzeit.app</li>
        <li><strong>Stripe Payments Europe, Ltd.</strong> (Irland): Bezahlung von Premium auf der Website</li>
        <li><strong>RevenueCat, Inc.</strong> (USA): Verwaltung der In-App-Abos aus App Store und Google Play</li>
        <li><strong>Apple</strong> und <strong>Google</strong>: Bereitstellung der Apps und Abrechnung von In-App-Käufen (eigene Verantwortung)</li>
        <li>
          <strong>Anmeldung mit Google oder Apple</strong> (nur, wenn Sie diese Möglichkeit wählen): Die Anmeldung findet
          bei Google bzw. Apple statt (eigene Verantwortung). Wir erhalten Ihren Namen, Ihre E-Mail-Adresse und eine
          Kennung des Kontos, um Ihr LernZeit-Konto anzulegen und Sie wiederzuerkennen. Auf unseren Seiten laden wir
          dafür keine Skripte von Google oder Apple.
        </li>
        <li>
          <strong>Google (Gemini)</strong> und <strong>OpenRouter</strong>: Erstellen von Aufgaben, Erklärungen,
          KI-Tutor und Lernplan, Auswertung von Lernplan-Fotos, Vorlesen von Aufgaben und Erklärungen (Google Gemini).
          Übermittelt werden die Aufgabe und die Eingabe bzw. die Fotos, ohne personenbezogene Kennungen wie Name oder
          E-Mail-Adresse. Vorgelesene Texte speichern wir als Tondatei bis zu zwei Monate, damit derselbe Text nicht
          erneut erzeugt werden muss.
        </li>
        <li><strong>OneSignal, Inc.</strong> (USA): Push-Benachrichtigungen und Service-E-Mails an Eltern</li>
        <li>
          <strong>Google Ireland Limited</strong> und <strong>Meta Platforms Ireland Limited</strong>: Messung unserer
          Werbung, nur mit Ihrer Einwilligung und nur auf der Website (Abschnitt 5.4)
        </li>
        <li><strong>IONOS SE</strong>: E-Mail-Postfach, Anmelde- und Bestätigungs-E-Mails, Eingangsbestätigungen</li>
      </ul>
      <p>
        Übermittlungen in Länder außerhalb der EU (z. B. USA) erfolgen nur auf Grundlage geeigneter Garantien
        (EU-Standardvertragsklauseln bzw. EU-US Data Privacy Framework).
      </p>
    </section>

    <section>
      <h2>7. Speicherdauer</h2>
      <ul>
        <li>Kontodaten und Lernstand speichern wir, bis das Konto gelöscht wird (<Link to="/konto-loeschen">Konto löschen</Link>).</li>
        <li>Rechnungs- und Zahlungsbelege bewahren wir bzw. unser Zahlungsdienstleister so lange auf, wie es das Handels- und Steuerrecht vorschreibt (bis zu zehn Jahre).</li>
        <li>Kündigungen und Widerrufe bewahren wir bis zum Ende der gesetzlichen Verjährungsfrist auf (regelmäßig drei Jahre ab Ende des Jahres des Eingangs).</li>
        <li>Support-Nachrichten löschen wir, wenn die Anfrage erledigt ist und keine Aufbewahrungspflicht besteht.</li>
      </ul>
    </section>

    <section>
      <h2>8. Datensicherheit</h2>
      <p>
        Alle Verbindungen sind verschlüsselt (HTTPS). Der Zugriff auf Daten ist durch Zugriffsregeln in der Datenbank
        auf die jeweiligen Konten beschränkt; Eltern sehen nur die Daten ihrer verbundenen Kinder.
      </p>
    </section>

    <section>
      <h2>9. Ihre Rechte</h2>
      <p>Sie haben das Recht auf</p>
      <ul>
        <li>Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO),</li>
        <li>Berichtigung (Art. 16), Löschung (Art. 17) und Einschränkung der Verarbeitung (Art. 18),</li>
        <li>Datenübertragbarkeit (Art. 20),</li>
        <li>Widerruf einer Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO).</li>
      </ul>
      <RechtsKasten>
        <p>
          <strong>Widerspruchsrecht (Art. 21 DSGVO):</strong> Soweit wir Daten auf Grundlage berechtigter Interessen
          verarbeiten (Art. 6 Abs. 1 lit. f DSGVO), können Sie aus Gründen, die sich aus Ihrer besonderen Situation
          ergeben, jederzeit widersprechen. Eine formlose E-Mail an{' '}
          <a href="mailto:info@lernzeit.app">info@lernzeit.app</a> genügt.
        </p>
      </RechtsKasten>
      <p>
        Ihre Daten können Sie angemeldet auf der <Link to="/support">Support-Seite</Link> selbst exportieren und Ihr
        Konto unter <Link to="/konto-loeschen">Konto löschen</Link> selbst löschen. Für alles andere schreiben Sie uns.
      </p>
    </section>

    <section>
      <h2>10. Beschwerderecht</h2>
      <p>
        Sie können sich bei einer Datenschutz-Aufsichtsbehörde beschweren. Für uns zuständig ist der Thüringer
        Landesbeauftragte für den Datenschutz und die Informationsfreiheit, Häßlerstraße 8, 99096 Erfurt,{' '}
        <a href="https://www.tlfdi.de" target="_blank" rel="noopener noreferrer">www.tlfdi.de</a>.
      </p>
    </section>

    <section>
      <h2>11. Änderungen</h2>
      <p>
        Wir passen diese Datenschutzerklärung an, wenn sich LernZeit oder die Rechtslage ändert. Es gilt die jeweils
        hier veröffentlichte Fassung; über wesentliche Änderungen informieren wir Eltern per E-Mail.
      </p>
    </section>
  </RechtsSeite>
);

export default Datenschutz;

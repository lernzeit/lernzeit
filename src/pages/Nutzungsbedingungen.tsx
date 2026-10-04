import { Link } from 'react-router-dom';
import Seo from '@/components/Seo';
import { RechtsSeite } from '@/components/landing/RechtsSeite';
import { STRIPE_MONTHLY_PRICE_LABEL, STRIPE_YEARLY_PRICE_LABEL } from '@/config/pricing';

/**
 * Nutzungsbedingungen (AGB), neu gefasst am 04.10.2026:
 * - Abo-Bedingungen ergaenzt (Preise, Testphase, Laufzeit, Verlaengerung,
 *   Kuendigung, Widerruf), Vertragsschluss nach Art. 246c EGBGB
 * - unwirksame Klauseln ersetzt: Haftung nur fuer Vorsatz/grobe
 *   Fahrlaessigkeit (§ 309 Nr. 7 BGB), Zustimmung durch Weiternutzen,
 *   Rechtswahl ohne Verbrauchervorbehalt
 * - fester Stand statt Tagesdatum
 * Zur Pruefung durch die Kanzlei vorgesehen (siehe docs/rechtstexte-pruefung.md).
 */
const Nutzungsbedingungen = () => (
  <RechtsSeite titel="Nutzungsbedingungen" stand="4. Oktober 2026">
    <Seo
      title="Nutzungsbedingungen – LernZeit"
      description="Nutzungsbedingungen (AGB) von LernZeit: Leistungen, Testphase, Premium-Abo, Preise, Laufzeit, Kündigung und Widerruf."
      path="/nutzungsbedingungen"
    />

    <section>
      <h2>1. Anbieter und Geltungsbereich</h2>
      <p>
        Anbieter von LernZeit ist die LernZeit UG (haftungsbeschränkt), Drachengasse 10, 99084 Erfurt, eingetragen im
        Handelsregister des Amtsgerichts Jena unter HRB 524759, E-Mail{' '}
        <a href="mailto:info@lernzeit.app">info@lernzeit.app</a> („wir“).
      </p>
      <p>
        Diese Nutzungsbedingungen gelten für die Nutzung von LernZeit über die Website lernzeit.app und die Apps für
        iOS und Android sowie für das kostenpflichtige Abo „LernZeit Premium“. Abweichende Bedingungen der Nutzerinnen
        und Nutzer gelten nicht.
      </p>
    </section>

    <section>
      <h2>2. Leistungen</h2>
      <h3>2.1 Kostenlose Nutzung</h3>
      <p>
        Kinder lösen in LernZeit Aufgaben in den Fächern ihrer Klassenstufe und verdienen damit Bildschirmzeit. Eltern
        verbinden sich mit den Konten ihrer Kinder, legen Regeln fest, sehen den Lernfortschritt und geben angefragte
        Bildschirmzeit frei. Diese Grundfunktionen sind kostenlos.
      </p>
      <h3>2.2 Testphase</h3>
      <p>
        Nach der Registrierung eines Elternkontos können alle Premium-Funktionen vier Wochen lang kostenlos genutzt
        werden. Für die Testphase sind keine Zahlungsdaten nötig. Sie endet automatisch; es entstehen keine Kosten und
        kein Abo.
      </p>
      <h3>2.3 LernZeit Premium</h3>
      <p>
        Mit Premium kommen unter anderem hinzu: der KI-Lernplan für eine anstehende Klassenarbeit, eine eigene
        Tagesobergrenze für Bildschirmzeit je Kind und die erweiterte Lernanalyse. Welche Funktionen Premium umfasst,
        steht vor dem Abschluss im Eltern-Bereich unter „Abo“.
      </p>
      <h3>2.4 Bildschirmzeit und Aufgaben</h3>
      <p>
        Die verdiente Bildschirmzeit ist eine Vereinbarung innerhalb der Familie. Ob und wann sie genutzt werden darf,
        entscheiden die Eltern; ein Anspruch gegenüber uns entsteht daraus nicht.
      </p>
      <p>
        Aufgaben, Erklärungen und Lernpläne werden teilweise mit Hilfe künstlicher Intelligenz erstellt und von uns
        geprüft. Trotzdem können Fehler vorkommen. Fehlerhafte Aufgaben lassen sich in der App melden. LernZeit ergänzt
        den Schulunterricht und ersetzt ihn nicht.
      </p>
    </section>

    <section>
      <h2>3. Konten</h2>
      <p>
        3.1 Ein Elternkonto setzt Volljährigkeit und eine gültige E-Mail-Adresse voraus. Kinder legen ein eigenes
        Konto mit E-Mail-Adresse oder nur mit Benutzernamen an; ein Elternteil verbindet es über eine Einladung mit
        seinem Konto.
      </p>
      <p>
        3.2 Für Kinder unter 16 Jahren ist die Einwilligung eines Erziehungsberechtigten erforderlich. Sie wird beim
        Verbinden des Kinderkontos eingeholt.
      </p>
      <p>3.3 Zugangsdaten sind geheim zu halten. Die Angaben bei der Registrierung müssen zutreffen.</p>
    </section>

    <section>
      <h2>4. Vertragsschluss</h2>
      <p>
        4.1 Der kostenlose Nutzungsvertrag kommt mit Abschluss der Registrierung zustande.
      </p>
      <p>
        4.2 <strong>Premium auf der Website:</strong> Im Eltern-Bereich wählen Sie unter „Abo“ den monatlichen oder
        jährlichen Tarif und werden zur Bezahlseite unseres Zahlungsdienstleisters Stripe weitergeleitet. Dort geben Sie
        Ihr Zahlungsmittel ein und können alle Angaben vor dem Absenden prüfen und korrigieren oder den Vorgang
        abbrechen. Mit dem Klick auf die Schaltfläche zum kostenpflichtigen Abschluss geben Sie ein verbindliches
        Angebot ab. Der Vertrag kommt zustande, sobald die Zahlung bestätigt und Premium für Ihr Konto freigeschaltet
        ist.
      </p>
      <p>
        4.3 <strong>Premium in den Apps:</strong> In den Apps wird Premium als In-App-Abo über den Apple App Store bzw.
        Google Play gekauft. Für Bezahlung, Verlängerung, Kündigung und Erstattung gelten dort zusätzlich die
        Bedingungen des jeweiligen Stores.
      </p>
      <p>
        4.4 Vertragssprache ist Deutsch. Diese Nutzungsbedingungen können Sie jederzeit auf dieser Seite abrufen,
        speichern und ausdrucken. Ihren Tarif und die Laufzeit Ihres Abos sehen Sie im Eltern-Bereich unter „Abo“.
      </p>
    </section>

    <section>
      <h2>5. Preise und Zahlung</h2>
      <p>
        5.1 Premium kostet auf der Website {STRIPE_MONTHLY_PRICE_LABEL} im Monat oder {STRIPE_YEARLY_PRICE_LABEL} im
        Jahr. Die Preise sind Endpreise. In den Apps gilt der im jeweiligen Store vor dem Kauf angezeigte Preis.
      </p>
      <p>
        5.2 Der Preis ist jeweils für den kommenden Abrechnungszeitraum (Monat bzw. Jahr) im Voraus fällig und wird über
        das gewählte Zahlungsmittel eingezogen, auf der Website über Stripe, in den Apps über den jeweiligen Store.
      </p>
    </section>

    <section>
      <h2>6. Laufzeit, Verlängerung und Kündigung des Abos</h2>
      <p>
        6.1 <strong>Monatsabo:</strong> Die Laufzeit beträgt einen Monat. Sie verlängert sich jeweils um einen weiteren
        Monat, wenn das Abo nicht bis zum Ende des laufenden Monats gekündigt wird.
      </p>
      <p>
        6.2 <strong>Jahresabo:</strong> Die erste Laufzeit beträgt ein Jahr. Wird das Abo nicht bis zu ihrem Ende
        gekündigt, läuft es danach auf unbestimmte Zeit weiter und kann jederzeit mit einer Frist von einem Monat
        gekündigt werden. Für bereits bezahlte Zeiträume nach dem Ende des Abos erstatten wir den anteiligen Betrag.
      </p>
      <p>
        6.3 Kündigen können Sie auf der Website jederzeit
      </p>
      <ul>
        <li>
          über die Seite <Link to="/kuendigen">„Verträge hier kündigen“</Link>, auch ohne Anmeldung,
        </li>
        <li>angemeldet im Eltern-Bereich unter „Abo“ → „Abo kündigen“ oder</li>
        <li>
          per E-Mail an <a href="mailto:info@lernzeit.app">info@lernzeit.app</a>.
        </li>
      </ul>
      <p>
        Ein über den App Store oder Google Play abgeschlossenes Abo wird von dem jeweiligen Store verlängert und kann
        deshalb nur dort beendet werden: in den Abo-Einstellungen Ihrer Apple-ID bzw. in Google Play unter „Zahlungen
        und Abos“.
      </p>
      <p>
        6.4 Das Recht beider Seiten zur Kündigung aus wichtigem Grund bleibt unberührt.
      </p>
      <p>
        6.5 Den kostenlosen Nutzungsvertrag können Sie jederzeit beenden, indem Sie Ihr Konto löschen (
        <Link to="/konto-loeschen">Konto löschen</Link>). Ein laufendes Abo ist vorher zu kündigen. Wir können den
        kostenlosen Nutzungsvertrag mit einer Frist von vier Wochen kündigen.
      </p>
    </section>

    <section>
      <h2>7. Widerrufsrecht</h2>
      <p>
        Verbraucherinnen und Verbraucher haben beim Abschluss von Premium auf der Website ein Widerrufsrecht von 14
        Tagen. Einzelheiten stehen in der <Link to="/widerruf">Widerrufsbelehrung</Link>; dort können Sie den Vertrag
        auch direkt widerrufen. Für In-App-Käufe gelten die Regeln des jeweiligen Stores.
      </p>
    </section>

    <section>
      <h2>8. Nutzungsregeln</h2>
      <p>Nicht erlaubt ist,</p>
      <ul>
        <li>LernZeit für rechtswidrige Zwecke zu nutzen,</li>
        <li>technische Schutzmaßnahmen zu umgehen oder LernZeit zu manipulieren,</li>
        <li>automatisierte Systeme zur Nutzung einzusetzen,</li>
        <li>Inhalte ohne unsere Zustimmung außerhalb von LernZeit zu vervielfältigen oder zu verbreiten.</li>
      </ul>
      <p>
        Bei schweren oder wiederholten Verstößen können wir ein Konto nach vorheriger Warnung sperren; bei schweren
        Verstößen auch ohne Warnung.
      </p>
    </section>

    <section>
      <h2>9. Verfügbarkeit und Mängel</h2>
      <p>
        9.1 Wir bemühen uns um einen störungsfreien Betrieb. Wartungen und technische Störungen können die Nutzung
        vorübergehend einschränken.
      </p>
      <p>
        9.2 Bei Mängeln gelten die gesetzlichen Rechte, für Premium insbesondere die Vorschriften über digitale Produkte
        (§§ 327 ff. BGB).
      </p>
    </section>

    <section>
      <h2>10. Haftung</h2>
      <p>
        10.1 Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei Verletzung von Leben, Körper oder
        Gesundheit, nach dem Produkthaftungsgesetz sowie im Umfang einer übernommenen Garantie.
      </p>
      <p>
        10.2 Bei leichter Fahrlässigkeit haften wir nur für die Verletzung wesentlicher Vertragspflichten, also von
        Pflichten, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags erst ermöglicht und auf deren Einhaltung
        Sie regelmäßig vertrauen dürfen. In diesem Fall ist die Haftung auf den vertragstypischen, vorhersehbaren
        Schaden begrenzt.
      </p>
      <p>10.3 Im Übrigen ist die Haftung ausgeschlossen. Die gesetzlichen Mängelrechte bleiben unberührt.</p>
    </section>

    <section>
      <h2>11. Rechte an Inhalten</h2>
      <p>
        Texte, Aufgaben, Grafiken und Gestaltung von LernZeit sind urheberrechtlich geschützt. Sie dürfen sie im Rahmen
        dieses Vertrags für den privaten Gebrauch in Ihrer Familie nutzen.
      </p>
    </section>

    <section>
      <h2>12. Änderungen dieser Bedingungen</h2>
      <p>
        Änderungen dieser Nutzungsbedingungen und der Preise gelten für bestehende Verträge nur, wenn Sie ihnen
        zustimmen. Wir informieren Sie rechtzeitig vorher per E-Mail. Stimmen Sie nicht zu, läuft Ihr Vertrag zu den
        bisherigen Bedingungen weiter; wir können ihn dann zum Ende der laufenden Abo-Laufzeit kündigen.
      </p>
    </section>

    <section>
      <h2>13. Schlussbestimmungen</h2>
      <p>
        13.1 Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Gegenüber
        Verbraucherinnen und Verbrauchern gilt diese Rechtswahl nur, soweit dadurch nicht der Schutz durch zwingende
        Vorschriften des Staates entzogen wird, in dem sie ihren gewöhnlichen Aufenthalt haben.
      </p>
      <p>
        13.2 Sind Sie Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches
        Sondervermögen, ist Gerichtsstand Erfurt.
      </p>
      <p>
        13.3 Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>
    </section>
  </RechtsSeite>
);

export default Nutzungsbedingungen;

import { Link } from 'react-router-dom';
import Seo from '@/components/Seo';
import { RechtsSeite } from '@/components/landing/RechtsSeite';

/**
 * Impressum (Stand 04.10.2026): § 5 DDG statt TMG, § 18 MStV statt RStV,
 * Hinweis auf die EU-Plattform zur Online-Streitbeilegung entfernt (Plattform
 * seit 20.07.2025 abgeschaltet, Verordnung (EU) 2024/3228).
 */
const Impressum = () => (
  <RechtsSeite titel="Impressum" stand="4. Oktober 2026">
    <Seo
      title="Impressum – LernZeit"
      description="Impressum und Anbieterkennzeichnung von LernZeit gemäß § 5 DDG."
      path="/impressum"
    />

    <section>
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        <strong>LernZeit UG (haftungsbeschränkt)</strong>
        <br />
        Drachengasse 10
        <br />
        99084 Erfurt
        <br />
        Deutschland
      </p>
      <p>Vertreten durch den Geschäftsführer Thomas Brösicke</p>
    </section>

    <section>
      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href="mailto:info@lernzeit.app">info@lernzeit.app</a>
        <br />
        Kontaktformular: <Link to="/support">lernzeit.app/support</Link>
      </p>
    </section>

    <section>
      <h2>Registereintrag</h2>
      <p>
        Registergericht: Amtsgericht Jena
        <br />
        Registernummer: HRB 524759
      </p>
    </section>

    <section>
      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        Thomas Brösicke
        <br />
        Drachengasse 10, 99084 Erfurt
      </p>
    </section>

    <section>
      <h2>Verbraucherstreitbeilegung</h2>
      <p>
        Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen. Bei Fragen oder Beschwerden schreib uns gern direkt an{' '}
        <a href="mailto:info@lernzeit.app">info@lernzeit.app</a>.
      </p>
    </section>

    <section>
      <h2>Verträge, Widerruf und Kündigung</h2>
      <p>
        Die Bedingungen für die Nutzung und das Premium-Abo stehen in den{' '}
        <Link to="/nutzungsbedingungen">Nutzungsbedingungen</Link>. Zum Widerruf eines Abos siehe die{' '}
        <Link to="/widerruf">Widerrufsbelehrung</Link>, zum Kündigen die Seite{' '}
        <Link to="/kuendigen">Verträge hier kündigen</Link>.
      </p>
    </section>

    <section>
      <h2>Urheberrecht</h2>
      <p>
        Texte, Aufgaben, Grafiken und Gestaltung von LernZeit sind urheberrechtlich geschützt. Eine Verwendung
        außerhalb der App und dieser Website bedarf unserer Zustimmung.
      </p>
    </section>
  </RechtsSeite>
);

export default Impressum;

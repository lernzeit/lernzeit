import { Link } from 'react-router-dom';
import Seo from '@/components/Seo';
import { RechtsSeite } from '@/components/landing/RechtsSeite';
import { VertragsErklaerung } from '@/components/recht/VertragsErklaerung';

/**
 * Kuendigungsschaltflaeche nach § 312k BGB (04.10.2026): ohne Anmeldung
 * erreichbar, im Seitenfuss jeder Seite verlinkt ("Verträge hier kündigen"),
 * Bestaetigungsknopf "Jetzt kündigen", Eingangsbestaetigung per E-Mail.
 */
const Kuendigen = () => (
  <RechtsSeite titel="Verträge hier kündigen">
    <Seo
      title="Verträge hier kündigen – LernZeit"
      description="LernZeit Premium kündigen: ohne Anmeldung, mit sofortiger Eingangsbestätigung per E-Mail."
      path="/kuendigen"
    />
    <div className="max-w-[44rem]">
      <p>
        Hier kündigst du dein LernZeit-Premium-Abo, auch ohne dich anzumelden. Nach dem Absenden bekommst du sofort
        eine Bestätigung per E-Mail mit Inhalt, Datum und Uhrzeit deiner Kündigung. Dein kostenloses Konto bleibt
        bestehen; wenn du es auch löschen möchtest, geht das unter <Link to="/konto-loeschen">Konto löschen</Link>.
      </p>
      <p>
        Bist du angemeldet, geht es auch direkt im Eltern-Bereich unter „Abo“ → „Abo verwalten“. Ein Abo aus dem App
        Store oder von Google Play beendest du in den Abo-Einstellungen des jeweiligen Stores.
      </p>
      <div className="mt-10">
        <VertragsErklaerung art="kuendigung" />
      </div>
    </div>
  </RechtsSeite>
);

export default Kuendigen;

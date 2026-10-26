import { Link } from 'react-router-dom';

/**
 * Interne Links zu den Zielseiten, Ratgebern und der Hilfe. Sie stehen im
 * vorgerenderten HTML der Startseite und geben Suchmaschinen den Weg zu
 * den Seiten, auf die die Anzeigen führen.
 */
const LINKS = [
  { zu: '/bildschirmzeit-kind', text: 'Bildschirmzeit fürs Kind: so läuft es ab' },
  { zu: '/kindersicherung-ergaenzen', text: 'Kindersicherung ergänzen' },
  { zu: '/lern-app-klasse-1-10', text: 'Lern-App für Klasse 1 bis 10' },
  { zu: '/vergleich', text: 'Vergleich: LernZeit, Bildschirmzeit, Family Link' },
  { zu: '/preise', text: 'Preise' },
  { zu: '/hilfe/einrichtung', text: 'Einrichtung Schritt für Schritt' },
  { zu: '/ratgeber/bildschirmzeit-iphone-kind', text: 'Ratgeber: Bildschirmzeit auf dem iPhone des Kindes' },
  { zu: '/ratgeber/family-link-oder-bildschirmzeit', text: 'Ratgeber: Family Link oder Bildschirmzeit?' },
];

const MehrErfahren = () => (
  <nav aria-label="Mehr zu LernZeit" className="px-3 pb-4 pt-16 sm:px-5">
    <div className="lp-container">
      <h2 className="text-[1.25rem] font-extrabold">Mehr zu LernZeit</h2>
      <ul className="mt-4 grid gap-x-8 gap-y-2.5 text-[0.9375rem] sm:grid-cols-2">
        {LINKS.map((l) => (
          <li key={l.zu}>
            <Link to={l.zu} className="text-[var(--lp-blau)] underline-offset-4 hover:underline">{l.text}</Link>
          </li>
        ))}
      </ul>
    </div>
  </nav>
);

export default MehrErfahren;

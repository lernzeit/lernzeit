import { Helmet } from 'react-helmet-async';

/**
 * Strukturierte Daten (schema.org) für Suchmaschinen und KI-Suchen. Landen beim
 * Vorrendern im statischen HTML. Kein Skript von Dritten: nur ein Datenblock.
 */
const JsonLd = ({ daten }: { daten: object | object[] }) => (
  <Helmet>
    {(Array.isArray(daten) ? daten : [daten]).map((d, i) => (
      <script key={i} type="application/ld+json">{JSON.stringify(d)}</script>
    ))}
  </Helmet>
);

export default JsonLd;

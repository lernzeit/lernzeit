/**
 * Randnotiz in Handschrift mit gezeichnetem Pfeil — wie eine Lehrerin am
 * Heftrand erklaert, was im Bild passiert. Nur Aussagen aus
 * src/content/faq.ts oder dem bisherigen Seitentext.
 *
 * Der Pfeil zeichnet sich einmal beim Laden (Klasse lp-strich), bei
 * "Bewegung reduzieren" steht er sofort da.
 */
type Pfeil = 'links-unten' | 'rechts-unten' | 'links-oben' | 'rechts-oben' | 'unten';

const PFADE: Record<Pfeil, { linie: string; spitze: string; platz: string }> = {
  'links-unten': { linie: 'M95 6 C 70 4, 40 14, 14 48', spitze: 'M16 34 L14 48 L27 44', platz: 'right-full top-1/2 mr-1' },
  'rechts-unten': { linie: 'M5 6 C 30 4, 60 14, 86 48', spitze: 'M84 34 L86 48 L73 44', platz: 'left-full top-1/2 ml-1' },
  'links-oben': { linie: 'M95 54 C 70 56, 38 44, 14 12', spitze: 'M15 26 L14 12 L27 17', platz: 'right-full bottom-1/2 mr-1' },
  'rechts-oben': { linie: 'M5 54 C 30 56, 62 44, 86 12', spitze: 'M85 26 L86 12 L73 17', platz: 'left-full bottom-1/2 ml-1' },
  unten: { linie: 'M30 4 C 40 22, 36 38, 26 56', spitze: 'M22 43 L26 56 L36 47', platz: 'left-6 top-full mt-1' },
};

const Randnotiz = ({
  children,
  pfeil,
  farbe = 'tinte',
  drehung = -3,
  verzug = 0,
  className = '',
  style,
}: {
  children: React.ReactNode;
  pfeil?: Pfeil;
  farbe?: 'tinte' | 'gruen';
  drehung?: number;
  verzug?: number;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const p = pfeil ? PFADE[pfeil] : null;
  return (
    <div
      className={`lp-notiz pointer-events-none select-none ${className}`}
      style={{ color: farbe === 'gruen' ? 'var(--lp-gruen)' : 'var(--lp-tinte)', ...style }}
    >
      <div className="relative" style={{ rotate: `${drehung}deg` }}>
        <p className="lp-auftritt m-0" style={{ '--lp-verzug': `${verzug}ms` } as React.CSSProperties}>
          {children}
        </p>
        {p && (
          <svg
            aria-hidden="true"
            viewBox="0 0 100 60"
            className={`absolute h-[46px] w-[78px] overflow-visible ${p.platz}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path className="lp-strich" pathLength={1} d={p.linie} style={{ '--lp-verzug': `${verzug + 250}ms` } as React.CSSProperties} />
            <path className="lp-strich" pathLength={1} d={p.spitze} style={{ '--lp-verzug': `${verzug + 850}ms` } as React.CSSProperties} />
          </svg>
        )}
      </div>
    </div>
  );
};

export default Randnotiz;

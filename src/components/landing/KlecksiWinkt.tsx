import { useEffect, useRef } from 'react';
import { Klecksi, type KlecksiHandle, type KlecksiStimmung } from '@/components/klecksi/Klecksi';

/**
 * Klecksi fuer die Startseite: winkt einmal, sobald er ins Bild kommt, und
 * huepft beim Antippen. Rein schmueckend (fuer Vorleseprogramme unsichtbar).
 */
const KlecksiWinkt = ({ groesse = 96, stimmung = 'froh', className = '', leuchten = false }: {
  groesse?: number;
  stimmung?: KlecksiStimmung;
  className?: string;
  /** Weisser Rand, damit er auf dunklem Grund zu sehen ist */
  leuchten?: boolean;
}) => {
  const huelle = useRef<HTMLSpanElement>(null);
  const klecksi = useRef<KlecksiHandle>(null);

  useEffect(() => {
    const el = huelle.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      window.setTimeout(() => klecksi.current?.gruessen(), 300);
      io.disconnect();
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span
      ref={huelle}
      aria-hidden="true"
      onClick={() => { klecksi.current?.huepfen(); klecksi.current?.gruessen(); }}
      className={`inline-block cursor-pointer select-none ${className}`}
      style={leuchten ? { filter: 'drop-shadow(0 0 1.5px #fff) drop-shadow(0 0 1.5px #fff) drop-shadow(0 0 6px rgba(255,255,255,0.35))' } : undefined}
    >
      <Klecksi ref={klecksi} groesse={groesse} stimmung={stimmung} />
    </span>
  );
};

export default KlecksiWinkt;

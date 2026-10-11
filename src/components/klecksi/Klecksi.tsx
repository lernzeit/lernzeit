/*
 * Klecksi, das Maskottchen (Version „Tropfen“, 11.10.2026).
 *
 * Ein runder Klecks in Koenigsblau, der atmet, blinzelt und sanft wackelt.
 * Arme wachsen nur fuer Gesten aus ihm heraus (Formwechsel per SVG
 * <animate d>): einmal gruessen, jubeln, Mut machen. Bei „Bewegung
 * reduzieren“ steht er still. Texte spricht er nie selbst, sie kommen aus
 * lib/klecksi.ts (feste Saetze, keine KI-Texte an Kinder).
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { GRUSS1, GRUSS2, JUBEL1, JUBEL2, RUHE, RUHE2 } from './formen';
import { cn } from '@/lib/utils';

export type KlecksiStimmung = 'froh' | 'jubel' | 'denkt' | 'mut';

export interface KlecksiProps {
  /** Breite in px (Hoehe ergibt sich); 'voll' fuellt den Rahmen */
  groesse?: number | 'voll';
  stimmung?: KlecksiStimmung;
  /** Einmal winken, kurz nachdem er erscheint */
  gruessen?: boolean;
  /** Vorlesbarer Name; ohne ist er nur Schmuck */
  label?: string;
  className?: string;
}

export interface KlecksiHandle {
  gruessen: () => void;
  huepfen: () => void;
}

const BLAU = '#2563eb';
const TINTE = '#1a2b6d';
const WANGE = '#ffb3c4';
const SPLINE = '0.45 0 0.55 1';

const bewegungAus = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Wangen({ y = 73 }: { y?: number }) {
  return (
    <>
      <circle cx="40" cy={y} r="4.6" fill={WANGE} opacity="0.75" />
      <circle cx="80" cy={y} r="4.6" fill={WANGE} opacity="0.75" />
    </>
  );
}

function Gesicht({ stimmung }: { stimmung: KlecksiStimmung }) {
  if (stimmung === 'jubel') {
    return (
      <>
        <path d="M44 62 Q50 55 56 62" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M64 62 Q70 55 76 62" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
        <Wangen y={72} />
        <path d="M51 70 Q60 70 69 70 Q68 84 60 84 Q52 84 51 70 Z" fill={TINTE} />
        <path d="M55 79.5 Q60 76.5 65 79.5 Q63 83.5 60 83.5 Q57 83.5 55 79.5 Z" fill="#ff8fa8" />
      </>
    );
  }
  if (stimmung === 'denkt') {
    return (
      <>
        <g className="klecksi-blinzeln">
          <circle cx="50" cy="61" r="7" fill="#fff" />
          <circle cx="70" cy="61" r="7" fill="#fff" />
        </g>
        <circle cx="48" cy="58" r="4" fill={TINTE} />
        <circle cx="68" cy="58" r="4" fill={TINTE} />
        <ellipse cx="63" cy="77" rx="3.4" ry="4" fill={TINTE} />
      </>
    );
  }
  if (stimmung === 'mut') {
    return (
      <>
        <circle cx="50" cy="61" r="7" fill="#fff" />
        <circle cx="51" cy="62.5" r="4" fill={TINTE} />
        <circle cx="52.4" cy="61" r="1.3" fill="#fff" />
        <path d="M64 62 Q70 66 76 62" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
        <Wangen />
        <path d="M53 73 Q60 81 67 73" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
      </>
    );
  }
  return (
    <>
      <g className="klecksi-blinzeln">
        <circle cx="50" cy="61" r="7" fill="#fff" />
        <circle cx="70" cy="61" r="7" fill="#fff" />
        <g className="klecksi-schauen">
          <circle cx="51" cy="62.5" r="4" fill={TINTE} />
          <circle cx="71" cy="62.5" r="4" fill={TINTE} />
          <circle cx="52.4" cy="61" r="1.3" fill="#fff" />
          <circle cx="72.4" cy="61" r="1.3" fill="#fff" />
        </g>
      </g>
      <Wangen />
      <path d="M53 72 Q60 72 67 72 Q66 82 60 82 Q54 82 53 72 Z" fill={TINTE} />
      <path d="M56 78.5 Q60 76 64 78.5 Q62 81.5 60 81.5 Q58 81.5 56 78.5 Z" fill="#ff8fa8" />
    </>
  );
}

export const Klecksi = forwardRef<KlecksiHandle, KlecksiProps>(function Klecksi(
  { groesse = 104, stimmung = 'froh', gruessen = false, label, className },
  ref,
) {
  const grussRef = useRef<SVGAnimateElement | null>(null);
  const [sprung, setSprung] = useState(0);
  const [ruhig] = useState(bewegungAus);

  const winken = () => {
    if (ruhig) return;
    try {
      grussRef.current?.beginElement();
    } catch {
      /* aeltere WebViews ohne SMIL-Steuerung: dann eben ohne Winken */
    }
  };

  useImperativeHandle(ref, () => ({
    gruessen: winken,
    huepfen: () => {
      if (!ruhig) setSprung((s) => s + 1);
    },
  }));

  useEffect(() => {
    if (!gruessen || ruhig) return;
    const t = window.setTimeout(winken, 800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruessen, ruhig]);

  // Dauernde Geste je Stimmung: Jubeln mit beiden Armen, Mut mit einem
  const dauer =
    stimmung === 'jubel' ? { a: JUBEL1, b: JUBEL2, dur: '1.1s' }
    : stimmung === 'mut' ? { a: GRUSS1, b: GRUSS2, dur: '1.4s' }
    : null;
  const grundform = dauer ? dauer.a : RUHE;
  const masse = groesse === 'voll'
    ? { width: '100%' }
    : { width: groesse, height: Math.round((groesse * 132) / 120) };

  return (
    <svg
      {...masse}
      viewBox="0 0 120 132"
      overflow="visible"
      className={cn('klecksi', stimmung === 'jubel' && 'klecksi-jubelt', stimmung === 'denkt' && 'klecksi-denkt', className)}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <ellipse cx="62" cy="127" rx="30" ry="4" fill={TINTE} opacity="0.1" />
      <g className={cn('klecksi-atmen', sprung > 0 && (sprung % 2 ? 'klecksi-huepft-a' : 'klecksi-huepft-b'))}>
        <ellipse className="klecksi-schweben" cx="114" cy="12" rx="2.6" ry="3.8" transform="rotate(30 114 12)" fill={BLAU} />
        <ellipse className="klecksi-schweben klecksi-s2" cx="7" cy="18" rx="2.6" ry="3.8" transform="rotate(-25 7 18)" fill={BLAU} />
        <ellipse className="klecksi-schweben klecksi-s3" cx="106" cy="102" rx="4.6" ry="3.2" transform="rotate(25 106 102)" fill={BLAU} />
        <circle className="klecksi-schweben klecksi-s2" cx="84" cy="120" r="2.4" fill={BLAU} />
        <circle className="klecksi-schweben" cx="28" cy="10" r="2.2" fill={BLAU} />
        <path d={grundform} fill={BLAU}>
          {!ruhig && dauer && (
            <animate attributeName="d" dur={dauer.dur} repeatCount="indefinite"
              values={`${dauer.a};${dauer.b};${dauer.a}`} keyTimes="0;0.5;1" calcMode="spline" keySplines={`${SPLINE};${SPLINE}`} />
          )}
          {!ruhig && !dauer && (
            <animate attributeName="d" dur="3.4s" repeatCount="indefinite"
              values={`${RUHE};${RUHE2};${RUHE}`} keyTimes="0;0.5;1" calcMode="spline" keySplines={`${SPLINE};${SPLINE}`} />
          )}
          {!ruhig && !dauer && (
            <animate ref={grussRef} attributeName="d" begin="indefinite" dur="2.6s" fill="remove"
              values={[RUHE, GRUSS1, GRUSS2, GRUSS1, GRUSS2, GRUSS1, RUHE].join(';')}
              keyTimes="0;0.2;0.36;0.52;0.68;0.84;1" calcMode="spline" keySplines={Array(6).fill(SPLINE).join(';')} />
          )}
        </path>
        <ellipse cx="44" cy="44" rx="6" ry="3.4" transform="rotate(-30 44 44)" fill="#fff" opacity="0.4" />
        <circle cx="37" cy="52" r="1.8" fill="#fff" opacity="0.4" />
        <Gesicht stimmung={stimmung} />
      </g>
      {stimmung === 'denkt' && (
        <g className="klecksi-frage">
          <path d="M98 4 C98 -3 110 -3 110 4 C110 9 104 9 104 14" fill="none" stroke={TINTE} strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="104" cy="20" r="2.2" fill={TINTE} />
        </g>
      )}
    </svg>
  );
});

/*
 * Klecksi, das Maskottchen (Version „Tropfen“, 11.10.2026).
 *
 * Ein runder Klecks in Koenigsblau, der atmet, blinzelt und sanft wackelt.
 * Arme wachsen nur fuer Gesten aus ihm heraus (Formwechsel per SVG
 * <animate d>): einmal gruessen, jubeln, Mut machen. Bei „Bewegung
 * reduzieren“ steht er still. Texte spricht er nie selbst, sie kommen aus
 * lib/klecksi.ts (feste Saetze). Als Erklaerer und KI-Tutor bringt er
 * KI-Texte; dort steht immer „KI“ dabei (LearningGame, KITutorDialog).
 *
 * Mit `stand` (lib/klecksiLernstand.ts) zeigt er die Lerntage in Folge: Mit
 * jedem Lerntag waechst er und glaenzt mehr (3, 7, 14, 30 Tage). Ohne neue
 * Tinte wird er kleiner und blasser, dann trocknet er aus: matt, mit feinen
 * Rissen, die Augen zu. Er leidet nicht, er ruht. Dann steht er still.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { GRUSS1, GRUSS2, JUBEL1, JUBEL2, RUHE, RUHE2 } from './formen';
import { cn } from '@/lib/utils';
import { istWeihnachtszeit } from '@/lib/weihnachten';
import { istPassiv, massstab, type Frische, type LernStand } from '@/lib/klecksiLernstand';

export type KlecksiStimmung = 'froh' | 'jubel' | 'denkt' | 'mut';

export interface KlecksiProps {
  /** Breite in px (Hoehe ergibt sich); 'voll' fuellt den Rahmen */
  groesse?: number | 'voll';
  stimmung?: KlecksiStimmung;
  /** Einmal winken, kurz nachdem er erscheint */
  gruessen?: boolean;
  /** Vorlesbarer Name; ohne ist er nur Schmuck */
  label?: string;
  /** Weihnachtsmuetze; ohne Angabe vom 1. bis 26. Dezember */
  muetze?: boolean;
  /** Lernstand: Groesse, Glanz und Frische. Ohne Angabe sieht er aus wie immer. */
  stand?: LernStand;
  /** Mit `stand` die Groesse der Stufe nicht anwenden (z. B. auf der Reise) */
  festeGroesse?: boolean;
  /** Haelt einen Pinsel in der Fachfarbe und malt (Arm zur Seite des Feldes, Reise am Rundenende) */
  pinsel?: { farbe: string; seite: 'links' | 'rechts' };
  className?: string;
}

export interface KlecksiHandle {
  gruessen: () => void;
  huepfen: () => void;
}

const BLAU = '#2563eb';
const TINTE = '#1a2b6d';
const WANGE = '#ffb3c4';
/** Koerperfarbe und Zuege je Frische: kraeftig, blass, blasser, ausgetrocknet */
const FARBE: Record<Frische, string> = { frisch: BLAU, blass: '#7b9bea', trocknet: '#9bb0e2', trocken: '#b3c1de' };
const ZUG = '#4a5f9e';
const RISS = '#6d80b2';
const SPLINE = '0.45 0 0.55 1';

const bewegungAus = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Wangen({ y = 73, deckkraft = 0.75 }: { y?: number; deckkraft?: number }) {
  return (
    <>
      <circle cx="40" cy={y} r="4.6" fill={WANGE} opacity={deckkraft} />
      <circle cx="80" cy={y} r="4.6" fill={WANGE} opacity={deckkraft} />
    </>
  );
}

/** Funkeln (vierzackiger Stern) auf dem Klecks, ab 14 Tagen */
function Funkeln({ x, y, r = 5, farbe = '#fff', klasse }: { x: number; y: number; r?: number; farbe?: string; klasse?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        className={cn('klecksi-funkeln', klasse)}
        d={`M0 ${-r} Q0 0 ${r} 0 Q0 0 0 ${r} Q0 0 ${-r} 0 Q0 0 0 ${-r} Z`}
        fill={farbe}
      />
    </g>
  );
}

/** Blasser oder ausgetrockneter Klecksi: muede Augen, kleines ruhiges Laecheln, nie ein trauriges Gesicht */
function GesichtMuede({ frische, farbe }: { frische: Exclude<Frische, 'frisch'>; farbe: string }) {
  if (frische === 'blass') {
    return (
      <>
        <circle cx="50" cy="61" r="7" fill="#fff" />
        <circle cx="70" cy="61" r="7" fill="#fff" />
        <circle cx="51" cy="63" r="4" fill={TINTE} />
        <circle cx="71" cy="63" r="4" fill={TINTE} />
        {/* Lider: halb zu */}
        <path d="M42.5 61.5 A7.5 7.5 0 0 1 57.5 61.5 Z" fill={farbe} />
        <path d="M62.5 61.5 A7.5 7.5 0 0 1 77.5 61.5 Z" fill={farbe} />
        <Wangen deckkraft={0.5} />
        <path d="M54 74 Q60 78 66 74" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </>
    );
  }
  return (
    <>
      <path d="M44 62 Q50 67 56 62" fill="none" stroke={ZUG} strokeWidth="3" strokeLinecap="round" />
      <path d="M64 62 Q70 67 76 62" fill="none" stroke={ZUG} strokeWidth="3" strokeLinecap="round" />
      <Wangen deckkraft={frische === 'trocknet' ? 0.4 : 0.3} />
      <path d="M54.5 74 Q60 77.5 65.5 74" fill="none" stroke={ZUG} strokeWidth="2.8" strokeLinecap="round" />
      {frische === 'trocken' && (
        <path d="M90 36 h9 l-9 10 h9" fill="none" stroke={ZUG} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      )}
    </>
  );
}

/** Feine Risse im eingetrockneten Klecks */
function Risse({ anzahl }: { anzahl: 2 | 4 }) {
  return (
    <g fill="none" stroke={RISS} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M36 86 L44 80 L42 73" />
      <path d="M84 90 L77 83 L81 77" />
      {anzahl === 4 && (
        <>
          <path d="M60 106 L55 98 L61 93" />
          <path d="M86 48 L79 55" />
        </>
      )}
    </g>
  );
}

/**
 * Arm mit Pinsel (21.10.2026). Der Arm hat die Koerperfarbe und keinen Rand,
 * so waechst er nahtlos aus dem Klecks. Gezeichnet fuer links; rechts wird
 * gespiegelt. Der Arm schwingt um die Schulter (CSS klecksi-malen).
 */
function PinselArm({ farbe, pinselFarbe, seite, ruhig }: { farbe: string; pinselFarbe: string; seite: 'links' | 'rechts'; ruhig: boolean }) {
  return (
    <g transform={seite === 'rechts' ? 'translate(120 0) scale(-1 1)' : undefined}>
      <g className={ruhig ? undefined : 'klecksi-malen'}>
        <path d="M30 80 Q16 86 8 100" fill="none" stroke={farbe} strokeWidth="12" strokeLinecap="round" />
        {/* Pinsel: Stiel hinter der Hand, Zwinge, Spitze in der Fachfarbe */}
        <path d="M14 88 L-2 116" stroke="#b7793a" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M2 109 L-6 116 L-2 120 L6 113 Z" fill="#c9cfe0" stroke={TINTE} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M-6 116 C-12 120 -13 126 -11 129 C-6 127 -3 124 -2 120 Z" fill={pinselFarbe} stroke={TINTE} strokeWidth="1.4" strokeLinejoin="round" />
        <circle cx="8" cy="100" r="7.5" fill={farbe} />
      </g>
    </g>
  );
}

/** Weihnachtsmuetze, sitzt auf dem Kopf und atmet mit */
function Muetze() {
  return (
    <g>
      <path d="M41 31 C45 17 57 8 71 8.5 C82 9 90 15 95 24 C89 20.5 83 20.5 80 23.5 C81 26 81.5 28.5 81.5 31 Z" fill="#d4483b" />
      <path d="M71 8.5 C82 9 90 15 95 24 C91 21.8 87.5 21 84.5 21.4 C82 15 77 10.5 71 8.5 Z" fill="#b83a2f" />
      <rect x="37" y="26.5" width="48" height="10" rx="5" fill="#fff" transform="rotate(-5 61 31.5)" />
      <circle cx="96" cy="25" r="5.6" fill="#fff" />
    </g>
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
  { groesse = 104, stimmung = 'froh', gruessen = false, label, muetze, stand, festeGroesse = false, pinsel, className },
  ref,
) {
  const grussRef = useRef<SVGAnimateElement | null>(null);
  const [sprung, setSprung] = useState(0);
  const [ruhig] = useState(bewegungAus);
  const mitMuetze = muetze ?? istWeihnachtszeit();
  const frische: Frische = stand?.frische ?? 'frisch';
  // Ausgetrocknet: er steht still (keine Atmung, kein Blinzeln, keine Gesten)
  const passiv = !!stand && istPassiv(stand);
  const farbe = FARBE[frische];
  const skala = stand && !festeGroesse ? massstab(stand) : 1;
  // Glanz 0–4: matt, ein Lichtfleck, beide (wie bisher), staerker mit Funkeln, strahlend
  const glanz = !stand ? 2 : frische === 'frisch' ? stand.stufe : frische === 'blass' ? Math.min(stand.stufe, 2) : 0;
  const lichtDeckkraft = frische === 'blass' ? 0.25 : glanz >= 3 ? 0.55 : 0.4;

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
      className={cn(
        'klecksi',
        stimmung === 'jubel' && !passiv && 'klecksi-jubelt',
        stimmung === 'denkt' && !passiv && 'klecksi-denkt',
        glanz >= 4 && 'klecksi-schein',
        className,
      )}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <g transform={skala === 1 ? undefined : `translate(60 124) scale(${skala}) translate(-60 -124)`}>
        <ellipse cx="62" cy="127" rx="30" ry="4" fill={TINTE} opacity={passiv ? 0.06 : 0.1} />
        <g className={cn(!passiv && 'klecksi-atmen', !passiv && sprung > 0 && (sprung % 2 ? 'klecksi-huepft-a' : 'klecksi-huepft-b'))}>
          {!passiv && (
            <>
              <ellipse className="klecksi-schweben" cx="114" cy="12" rx="2.6" ry="3.8" transform="rotate(30 114 12)" fill={farbe} />
              <ellipse className="klecksi-schweben klecksi-s2" cx="7" cy="18" rx="2.6" ry="3.8" transform="rotate(-25 7 18)" fill={farbe} />
              <ellipse className="klecksi-schweben klecksi-s3" cx="106" cy="102" rx="4.6" ry="3.2" transform="rotate(25 106 102)" fill={farbe} />
              <circle className="klecksi-schweben klecksi-s2" cx="84" cy="120" r="2.4" fill={farbe} />
              <circle className="klecksi-schweben" cx="28" cy="10" r="2.2" fill={farbe} />
            </>
          )}
          <path d={grundform} fill={farbe}>
            {!ruhig && !passiv && dauer && (
              <animate attributeName="d" dur={dauer.dur} repeatCount="indefinite"
                values={`${dauer.a};${dauer.b};${dauer.a}`} keyTimes="0;0.5;1" calcMode="spline" keySplines={`${SPLINE};${SPLINE}`} />
            )}
            {!ruhig && !passiv && !dauer && (
              <animate attributeName="d" dur="3.4s" repeatCount="indefinite"
                values={`${RUHE};${RUHE2};${RUHE}`} keyTimes="0;0.5;1" calcMode="spline" keySplines={`${SPLINE};${SPLINE}`} />
            )}
            {!ruhig && !passiv && !dauer && (
              <animate ref={grussRef} attributeName="d" begin="indefinite" dur="2.6s" fill="remove"
                values={[RUHE, GRUSS1, GRUSS2, GRUSS1, GRUSS2, GRUSS1, RUHE].join(';')}
                keyTimes="0;0.2;0.36;0.52;0.68;0.84;1" calcMode="spline" keySplines={Array(6).fill(SPLINE).join(';')} />
            )}
          </path>
          {pinsel && <PinselArm farbe={farbe} pinselFarbe={pinsel.farbe} seite={pinsel.seite} ruhig={ruhig} />}
          {frische === 'trocknet' && <Risse anzahl={2} />}
          {frische === 'trocken' && <Risse anzahl={4} />}
          {glanz >= 2 && <ellipse cx="44" cy="44" rx={glanz >= 3 ? 7 : 6} ry={glanz >= 3 ? 4 : 3.4} transform="rotate(-30 44 44)" fill="#fff" opacity={lichtDeckkraft} />}
          {glanz >= 1 && <circle cx="37" cy="52" r={glanz === 1 ? 2.4 : 1.8} fill="#fff" opacity={lichtDeckkraft} />}
          {glanz >= 3 && <Funkeln x={80} y={44} r={5.5} />}
          {glanz >= 4 && <Funkeln x={34} y={86} r={4} klasse="klecksi-s2" />}
          {glanz >= 4 && <Funkeln x={101} y={64} r={3.6} farbe="#93c5fd" klasse="klecksi-s3" />}
          {frische === 'frisch' ? <Gesicht stimmung={stimmung} /> : <GesichtMuede frische={frische} farbe={farbe} />}
          {mitMuetze && <Muetze />}
        </g>
      </g>
      {stimmung === 'denkt' && !passiv && (
        <g className="klecksi-frage">
          <path d="M98 4 C98 -3 110 -3 110 4 C110 9 104 9 104 14" fill="none" stroke={TINTE} strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="104" cy="20" r="2.2" fill={TINTE} />
        </g>
      )}
    </svg>
  );
});

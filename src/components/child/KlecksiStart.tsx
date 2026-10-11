/*
 * Kind-Start (11.10.2026): Klecksi begruesst, die Tinte steht oben, und
 * „Heute fuer deine Reise“ zeigt, was doppelt zaehlt (Schwerpunkt) und was in
 * der Berichtigung wartet. Lernplaene stehen in LernplanListe (auch doppelt).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Klecksi, type KlecksiHandle } from '@/components/klecksi/Klecksi';
import { startSaetze, type KlecksiLage } from '@/lib/klecksi';
import { FAECHER, farbeVon, type FachId } from '@/lib/hefte';
import type { Heft } from '@/hooks/useHefte';

export function TintenTropfen({ groesse = 18 }: { groesse?: number }) {
  return (
    <svg width={groesse * (18 / 22)} height={groesse} viewBox="0 0 18 22" aria-hidden="true">
      <path d="M9 1.5C9 1.5 2 9.6 2 14.2A7 7 0 0 0 16 14.2C16 9.6 9 1.5 9 1.5Z" fill="#2563eb" stroke="#1a2b6d" strokeWidth="1.6" strokeLinejoin="round" />
      <ellipse cx="6.6" cy="13.6" rx="1.6" ry="2.4" fill="#fff" opacity="0.7" />
    </svg>
  );
}

/** Tintenkiller fuer die Berichtigung: wischt eine Tintenlinie weg */
export function Tintenkiller({ blass = false, groesse = 34 }: { blass?: boolean; groesse?: number }) {
  const rand = blass ? '#8a96b8' : '#1a2b6d';
  const blau = blass ? '#c9d6f7' : '#2563eb';
  return (
    <svg width={groesse} height={(groesse * 26) / 34} viewBox="0 0 34 26" aria-hidden="true">
      {!blass && <path d="M1 22.5 C3 20.8 5 24 7.5 22.3" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" />}
      <path d="M8.5 22.2 C11 20.6 13 23.8 15.5 22.2" fill="none" stroke="#c9d6f7" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="1.2 2.6" />
      <g transform="translate(8 21) rotate(-38)" strokeDasharray={blass ? '2.5 2' : undefined}>
        <path d="M5 -3 C2 -3 0 -1.4 0 0 C0 1.4 2 3 5 3 Z" fill="#fff" stroke={rand} strokeWidth="1.7" strokeLinejoin="round" />
        <rect x="5" y="-3.6" width="15" height="7.2" rx="1.4" fill="#fff" stroke={rand} strokeWidth="1.7" />
        <path d="M9 -3.6 V3.6 M11 -3.6 V3.6" stroke={rand} strokeWidth="1" opacity="0.5" />
        <rect x="19" y="-3.9" width="7" height="7.8" rx="2" fill={blau} stroke={rand} strokeWidth="1.7" />
        <path d="M26 -1.6 L29.5 0 L26 1.6 Z" fill={rand} />
      </g>
    </svg>
  );
}

/** Tinte oben auf dem Start, fuehrt ins Federmaeppchen */
export function TintenPille({ stand, onClick }: { stand: number | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${stand ?? 0} Tintentropfen, zum Federmäppchen`}
      className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-card px-3.5 text-base font-extrabold text-tinte ring-2 ring-inset ring-tinte transition-transform active:scale-95"
    >
      <TintenTropfen />
      <span className="tabular">{stand ?? '–'}</span>
    </button>
  );
}

const GRUSS_SCHLUESSEL = 'lernzeit_klecksi_gruss';

/** Einmal am Tag gruessen (erstes Oeffnen), danach nur beim Antippen */
function heuteSchonGegruesst(kindId: string): boolean {
  try {
    const heute = new Date().toLocaleDateString('sv-SE');
    const key = `${GRUSS_SCHLUESSEL}_${kindId}`;
    if (localStorage.getItem(key) === heute) return true;
    localStorage.setItem(key, heute);
    return false;
  } catch {
    return true;
  }
}

/** Ein paar Flocken, die hinter Klecksi fallen (nur Weihnachtszeit, ruhig bei reduzierter Bewegung) */
const FLOCKEN = [
  { x: 6, g: 4, d: 7.5, v: 0 }, { x: 18, g: 3, d: 9, v: -3 }, { x: 31, g: 5, d: 8, v: -6 },
  { x: 47, g: 3, d: 10, v: -1.5 }, { x: 62, g: 4, d: 8.5, v: -5 }, { x: 76, g: 3, d: 9.5, v: -7.5 },
  { x: 88, g: 5, d: 7, v: -2.5 }, { x: 95, g: 3, d: 11, v: -8 },
];

function Schnee() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {FLOCKEN.map((f, i) => (
        <span key={i} className="schnee-flocke"
          style={{ left: `${f.x}%`, width: f.g, height: f.g, animationDuration: `${f.d}s`, animationDelay: `${f.v}s` }} />
      ))}
    </div>
  );
}

export function KlecksiGruss({ kindId, lage }: { kindId: string; lage: KlecksiLage }) {
  const saetze = useMemo(() => startSaetze(lage), [lage]);
  const [i, setI] = useState(0);
  const klecksi = useRef<KlecksiHandle>(null);
  const [gruessen] = useState(() => !heuteSchonGegruesst(kindId));

  useEffect(() => {
    setI(0);
  }, [saetze.length]);

  return (
    <div className="relative flex items-center gap-2 overflow-hidden rounded-[28px] bg-card py-3 pl-3 pr-4 ring-1 ring-inset ring-karo">
      {lage.weihnachten && <Schnee />}
      <button
        type="button"
        aria-label="Klecksi antippen"
        className="relative shrink-0 rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={() => {
          klecksi.current?.huepfen();
          klecksi.current?.gruessen();
          setI((n) => n + 1);
        }}
      >
        <Klecksi ref={klecksi} groesse={88} gruessen={gruessen} />
      </button>
      <div className="relative min-w-0 flex-1">
        <p aria-live="polite" className="font-hand rounded-[18px] rounded-bl-[4px] border-2 border-tinte bg-background px-3 py-2.5 text-[15px] leading-snug text-tinte">
          {saetze[i % saetze.length]}
        </p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">Tipp Klecksi an</p>
      </div>
    </div>
  );
}

function Zeile({ onClick, icon, titel, text, abzeichen, doppelt }: {
  onClick?: () => void;
  icon: React.ReactNode;
  titel: string;
  text: string;
  abzeichen?: string;
  doppelt?: boolean;
}) {
  const inhalt = (
    <>
      <span className="grid h-9 w-9 shrink-0 place-items-center">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-extrabold leading-tight text-tinte">{titel}</span>
        <span className="block text-[13px] font-medium text-muted-foreground">{text}</span>
      </span>
      {abzeichen && (
        <span className={`grid h-7 min-w-10 shrink-0 place-items-center rounded-full px-2 text-sm font-extrabold ${doppelt ? 'bg-[#fff4c9] text-tinte ring-2 ring-inset ring-tinte' : 'bg-card text-muted-foreground ring-2 ring-inset ring-karo'}`}>
          {abzeichen}
        </span>
      )}
      {onClick && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </>
  );
  const klasse = 'flex w-full items-center gap-3 rounded-2xl bg-card px-3 py-2.5 text-left ring-2 ring-inset ring-karo';
  return onClick ? (
    <button type="button" onClick={onClick} className={`${klasse} transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-primary`}>{inhalt}</button>
  ) : (
    <div className={klasse}>{inhalt}</div>
  );
}

export function HeuteFuerDieReise({ hefte, berichtigung, spaeter, onBerichtigung, onFach }: {
  hefte: Heft[];
  berichtigung: number;
  spaeter: number;
  onBerichtigung: () => void;
  onFach: (fach: FachId) => void;
}) {
  const schwerpunkte = hefte.filter((h) => h.wichtig);
  if (schwerpunkte.length === 0 && berichtigung === 0 && spaeter === 0) return null;
  return (
    <section aria-labelledby="heute-reise-titel" className="space-y-2.5">
      <h2 id="heute-reise-titel" className="text-lg font-extrabold leading-tight">Heute für deine Reise</h2>
      {schwerpunkte.map((h) => (
        <Zeile
          key={h.fach}
          onClick={() => onFach(h.fach)}
          icon={
            <svg width="26" height="30" viewBox="0 0 26 30" aria-hidden="true">
              <rect x="3" y="2" width="20" height="26" rx="3" fill={farbeVon(h.farbe, h.fach)} stroke="#1a2b6d" strokeWidth="2" />
              <path d="M14.5 9 L16.2 13 L20.5 13.3 L17.2 16 L18.3 20.2 L14.5 17.8 L10.7 20.2 L11.8 16 L8.5 13.3 L12.8 13 Z" fill="#fff" />
            </svg>
          }
          titel={`Schwerpunkt: ${FAECHER.find((f) => f.id === h.fach)?.kurz ?? h.fach}`}
          text="Jede geschaffte Runde zählt doppelt"
          abzeichen="×2"
          doppelt
        />
      ))}
      {berichtigung > 0 ? (
        <Zeile
          onClick={onBerichtigung}
          icon={<Tintenkiller />}
          titel="Berichtigung"
          text={berichtigung === 1 ? '1 Klecks wegwischen' : `${berichtigung} Kleckse wegwischen`}
          abzeichen="+1"
        />
      ) : spaeter > 0 ? (
        <Zeile
          icon={<Tintenkiller blass />}
          titel="Berichtigung"
          text={spaeter === 1 ? 'Bald wartet 1 Klecks auf dich' : `Bald warten ${spaeter} Kleckse auf dich`}
        />
      ) : null}
    </section>
  );
}

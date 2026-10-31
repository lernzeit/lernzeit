/*
 * Ende einer Adventskalender-Runde (lib/weihnachten.ts): ab 4 von 5 richtig
 * geht das Tuerchen auf (AdventGeschenk: Sticker, Figur, Tinte oder Frei-Minuten,
 * mit Animation), sonst gleich nochmal mit neuen Aufgaben.
 */
import { Klecksi } from '@/components/klecksi/Klecksi';
import { useKlecksiAn } from '@/hooks/useKlecksi';
import { AdventGeschenk, adventText, type AdventInhalt } from '@/components/child/AdventGeschenk';
import { Button } from '@/components/ui/button';
import { ADVENT_RICHTIG, type AdventErgebnis } from '@/lib/weihnachten';

export function AdventAbschluss({ tag, richtig, gesamt, ergebnis, fehler, onErneutSenden, onNochmal, onFertig }: {
  tag: number;
  richtig: number;
  gesamt: number;
  ergebnis: AdventErgebnis | null;
  fehler: boolean;
  onErneutSenden: () => void;
  onNochmal?: () => void;
  onFertig: () => void;
}) {
  const mitKlecksi = useKlecksiAn();

  let inhalt: React.ReactNode;
  if (fehler || (ergebnis && !ergebnis.ok)) {
    inhalt = (
      <>
        {mitKlecksi && <Klecksi groesse={120} stimmung="denkt" />}
        <h1 className="text-2xl font-extrabold text-tinte">
          {ergebnis?.grund === 'noch_zu' ? `Türchen ${tag} ist noch zu.` : 'Das hat gerade nicht geklappt.'}
        </h1>
        {ergebnis?.grund !== 'noch_zu' && (
          <Button size="lg" className="w-full" onClick={onErneutSenden}>Nochmal senden</Button>
        )}
        <Button size="lg" variant="outline" className="w-full" onClick={onFertig}>Zum Start</Button>
      </>
    );
  } else if (!ergebnis) {
    inhalt = (
      <>
        {mitKlecksi && <Klecksi groesse={120} stimmung="denkt" />}
        <p className="font-hand text-xl text-tinte">{mitKlecksi ? 'Klecksi schaut nach …' : 'Einen Moment …'}</p>
      </>
    );
  } else if (ergebnis.offen) {
    // Ältere Zeilen (vor 01.11.2026) haben nur einen Sticker
    const geschenk: AdventInhalt | null = ergebnis.art
      ? { art: ergebnis.art, sticker: ergebnis.sticker, avatar: ergebnis.avatar, menge: ergebnis.menge }
      : ergebnis.sticker ? { art: 'sticker', sticker: ergebnis.sticker } : null;
    inhalt = (
      <>
        <h1 className="text-2xl font-extrabold text-tinte">
          {ergebnis.schon ? `Türchen ${tag} war schon offen.` : `Türchen ${tag} ist offen!`}
        </h1>
        {!ergebnis.schon && (
          <p className="text-sm text-muted-foreground">{richtig} von {gesamt} richtig</p>
        )}
        {geschenk && <AdventGeschenk tag={tag} inhalt={geschenk} oeffnen={!ergebnis.schon} />}
        {geschenk && !ergebnis.schon && (
          <p className="font-hand text-lg leading-snug text-tinte">{adventText(geschenk, ergebnis.ersatz)}</p>
        )}
        {mitKlecksi && !ergebnis.schon && <Klecksi groesse={90} stimmung="jubel" label="Klecksi jubelt" />}
        <Button size="lg" className="w-full" onClick={onFertig}>Zum Start</Button>
      </>
    );
  } else {
    inhalt = (
      <>
        {mitKlecksi && <Klecksi groesse={120} stimmung="mut" />}
        <h1 className="text-2xl font-extrabold text-tinte">{richtig} von {gesamt} richtig</h1>
        <p className="font-hand text-lg leading-snug text-tinte">
          Fast! Ab {ADVENT_RICHTIG} richtigen geht Türchen {tag} auf. Probier es gleich nochmal.
        </p>
        {onNochmal && <Button size="lg" className="w-full" onClick={onNochmal}>Nochmal versuchen</Button>}
        <Button size="lg" variant="outline" className="w-full" onClick={onFertig}>Später</Button>
      </>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-background px-6 pt-safe-top pb-safe-bottom">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center" aria-live="polite">
        <p className="mb-6 text-sm font-bold text-muted-foreground">Adventskalender</p>
        {inhalt}
      </div>
    </div>
  );
}

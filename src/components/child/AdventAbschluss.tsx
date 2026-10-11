/*
 * Ende einer Adventskalender-Runde (lib/weihnachten.ts): ab 4 von 5 richtig
 * geht das Tuerchen auf (Sticker, Tuerchen 6 und 24 auch eine Figur), sonst
 * gleich nochmal mit neuen Aufgaben. Keine Zeit, keine Tinte, keine Reise.
 */
import { Klecksi } from '@/components/klecksi/Klecksi';
import { Sticker } from '@/components/child/Hefte';
import { Button } from '@/components/ui/button';
import { getAvatarById } from '@/data/avatars';
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
  const figur = ergebnis?.avatar ? getAvatarById(ergebnis.avatar) : undefined;

  let inhalt: React.ReactNode;
  if (fehler || (ergebnis && !ergebnis.ok)) {
    inhalt = (
      <>
        <Klecksi groesse={120} stimmung="denkt" />
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
        <Klecksi groesse={120} stimmung="denkt" />
        <p className="font-hand text-xl text-tinte">Klecksi schaut nach …</p>
      </>
    );
  } else if (ergebnis.offen) {
    inhalt = (
      <>
        <Klecksi groesse={120} stimmung="jubel" label="Klecksi jubelt" />
        <h1 className="text-2xl font-extrabold text-tinte">
          {ergebnis.schon ? `Türchen ${tag} war schon offen.` : `Türchen ${tag} ist offen!`}
        </h1>
        {!ergebnis.schon && (
          <p className="text-sm text-muted-foreground">{richtig} von {gesamt} richtig</p>
        )}
        {ergebnis.sticker && (
          <div className="grid h-28 w-28 place-items-center rounded-[28px] bg-[#fff4c9] ring-1 ring-inset ring-karo">
            <Sticker id={ergebnis.sticker} className="text-[3.5rem]" />
          </div>
        )}
        {!ergebnis.schon && (
          <p className="font-hand text-lg leading-snug text-tinte">
            Den Sticker kannst du auf deine Hefte kleben.
            {figur && <> Neue Figur im Federmäppchen: {figur.name} {figur.emoji}</>}
          </p>
        )}
        <Button size="lg" className="w-full" onClick={onFertig}>Zum Start</Button>
      </>
    );
  } else {
    inhalt = (
      <>
        <Klecksi groesse={120} stimmung="mut" />
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

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Smartphone, X } from 'lucide-react';
import { Klecksi } from '@/components/klecksi/Klecksi';
import { useKlecksiAn } from '@/hooks/useKlecksi';
import { HINWEIS_ZU, erkenneGeraet, merkeHinweisGezeigt, storeLinksFuer, type Geraet } from '@/lib/appEmpfehlung';
import { cn } from '@/lib/utils';

/*
 * „LernZeit ist fuer die App optimiert“ (13.10.2026). Nur im Browser, nie in
 * den Apps und nicht im installierten PWA. Bei der Anmeldung als Karte mit
 * Klecksi (Klick zaehlt der AnalyticsTracker wie auf der Startseite, `stelle`),
 * beim Spielen als schmale Leiste unter dem Kopf (schliessbar, bis der Tab zu
 * ist) und am Rundenende als Karte. Im Spiel zaehlt kein Klick: Kinder werden
 * nicht neu gemessen, deshalb dort Knoepfe statt Links.
 */

function useImBrowser(): Geraet | null {
  const [geraet, setGeraet] = useState<Geraet | null>(null);
  useEffect(() => {
    try {
      if (Capacitor.isNativePlatform()) return;
      if (window.matchMedia?.('(display-mode: standalone)').matches) return;
      if ((window.navigator as Navigator & { standalone?: boolean }).standalone) return;
      setGeraet(erkenneGeraet(navigator.userAgent || '', navigator.maxTouchPoints || 0));
      merkeHinweisGezeigt();
    } catch {
      /* ohne Browser-Angaben: kein Hinweis */
    }
  }, []);
  return geraet;
}

function Knoepfe({ geraet, stelle, klein }: { geraet: Geraet; stelle?: string; klein?: boolean }) {
  const klasse = cn(
    'inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    klein ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
  );
  return (
    <>
      {storeLinksFuer(geraet, stelle ? 'web_anmeldung' : 'web_spiel').map((l) =>
        stelle ? (
          <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" data-stelle={stelle} className={klasse}>
            <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
            {l.text}
          </a>
        ) : (
          <button key={l.id} type="button" onClick={() => window.open(l.url, '_blank', 'noopener,noreferrer')} className={klasse}>
            <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
            {l.text}
          </button>
        ),
      )}
    </>
  );
}

export function AppEmpfehlung({ variante, stelle, nachSchliessenAus = false, className }: {
  variante: 'karte' | 'leiste';
  /** Mit `stelle` sind die Knoepfe Links, die der AnalyticsTracker zaehlt (nur Anmeldung) */
  stelle?: string;
  /** Karte bleibt weg, wenn das Kind die Leiste in diesem Tab schon geschlossen hat (Rundenende) */
  nachSchliessenAus?: boolean;
  className?: string;
}) {
  const geraet = useImBrowser();
  const mitKlecksi = useKlecksiAn();
  const [zu, setZu] = useState(() => {
    try { return sessionStorage.getItem(HINWEIS_ZU) === '1'; } catch { return false; }
  });
  if (!geraet || ((variante === 'leiste' || nachSchliessenAus) && zu)) return null;

  if (variante === 'leiste') {
    return (
      <div role="note" className={cn('mx-4 mb-2 flex items-center gap-2 rounded-2xl bg-card py-1.5 pl-2.5 pr-1.5 ring-1 ring-inset ring-karo', className)}>
        {mitKlecksi ? (
          <span aria-hidden="true" className="-mb-0.5 shrink-0"><Klecksi groesse={26} /></span>
        ) : (
          <Smartphone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        )}
        <p className="min-w-0 flex-1 text-xs font-medium leading-tight text-tinte">
          LernZeit ist für die App optimiert.
        </p>
        <Knoepfe geraet={geraet} klein />
        <button
          type="button"
          onClick={() => {
            try { sessionStorage.setItem(HINWEIS_ZU, '1'); } catch { /* ohne Speicher */ }
            setZu(true);
          }}
          aria-label="Hinweis schließen"
          className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <aside role="note" className={cn('flex items-start gap-3 rounded-[20px] bg-card p-4 ring-1 ring-inset ring-karo', className)}>
      {mitKlecksi ? (
        <span aria-hidden="true" className="shrink-0"><Klecksi groesse={52} /></span>
      ) : (
        <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Smartphone className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-extrabold leading-tight text-tinte">Besser mit der App</p>
        <p className="mt-1 text-sm leading-snug text-muted-foreground">
          LernZeit ist für die App optimiert. Mitteilungen kommen auch bei geschlossener App an,
          zum Beispiel wenn Eltern Zeit freigeben.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Knoepfe geraet={geraet} stelle={stelle} />
        </div>
      </div>
    </aside>
  );
}

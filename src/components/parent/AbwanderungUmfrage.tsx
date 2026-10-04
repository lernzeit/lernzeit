import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MessageCircleQuestion, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

/**
 * Warum Familien LernZeit nicht (mehr) nutzen oder kein Abo abschliessen
 * (Wunsch des Betreibers, 03.10.2026). Nur Eltern, freiwillig, ein Tipp
 * genuegt. Antworten landen in `abwanderung_umfrage` und im Produkt-Cockpit.
 *
 * Gruende hier und in der CHECK-Bedingung der Tabelle muessen gleich sein
 * (Migration 20261003190000_produkt_cockpit.sql).
 */

export type Anlass = 'inaktiv' | 'testphase_ende' | 'konto_loeschen';

const GRUENDE: Record<string, string> = {
  kind_will_nicht: 'Mein Kind hat keine Lust darauf',
  aufgaben_passen_nicht: 'Aufgaben passen nicht (zu leicht, zu schwer, falsches Fach)',
  fehler_in_aufgaben: 'Zu viele Fehler in den Aufgaben',
  sperre_technik: 'Handysperre oder Bildschirmzeit klappt nicht',
  einrichtung_aufwendig: 'Einrichtung ist zu kompliziert',
  weiss_nicht_weiter: 'Ich weiß nicht, wie es weitergeht',
  zu_teuer: 'Zu teuer',
  keine_zeit: 'Gerade keine Zeit (Ferien, Stress)',
  andere_loesung: 'Wir nutzen etwas anderes',
  datenschutz: 'Bedenken beim Datenschutz',
  brauchen_nicht: 'Brauchen wir nicht',
  anderes: 'Etwas anderes',
};

/** Reihenfolge je Anlass: das Naheliegende zuerst. */
const REIHENFOLGE: Record<Anlass, string[]> = {
  inaktiv: ['weiss_nicht_weiter', 'einrichtung_aufwendig', 'kind_will_nicht', 'aufgaben_passen_nicht', 'sperre_technik', 'fehler_in_aufgaben', 'keine_zeit', 'andere_loesung', 'datenschutz', 'brauchen_nicht', 'anderes'],
  testphase_ende: ['zu_teuer', 'kind_will_nicht', 'aufgaben_passen_nicht', 'sperre_technik', 'fehler_in_aufgaben', 'einrichtung_aufwendig', 'keine_zeit', 'andere_loesung', 'brauchen_nicht', 'anderes'],
  konto_loeschen: ['brauchen_nicht', 'kind_will_nicht', 'zu_teuer', 'aufgaben_passen_nicht', 'fehler_in_aufgaben', 'sperre_technik', 'einrichtung_aufwendig', 'datenschutz', 'andere_loesung', 'anderes'],
};

function plattform(): 'web' | 'ios' | 'android' {
  const p = Capacitor.getPlatform();
  return p === 'ios' || p === 'android' ? p : 'web';
}

/** Speichert eine Antwort. Wirft bei Fehlern. */
export async function umfrageSpeichern(userId: string, anlass: Anlass, gruende: string[], freitext: string) {
  const text = freitext.trim().slice(0, 1000);
  if (gruende.length === 0 && !text) return;
  const { error } = await supabase.from('abwanderung_umfrage').insert({
    user_id: userId,
    anlass,
    gruende,
    freitext: text || null,
    plattform: plattform(),
  });
  if (error) throw error;
}

/** Die Auswahl selbst — fuer die Karte und den Loeschen-Dialog. */
export function GruendeAuswahl({ anlass, gewaehlt, onChange }: {
  anlass: Anlass;
  gewaehlt: string[];
  onChange: (neu: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Gründe">
      {REIHENFOLGE[anlass].map((g) => {
        const an = gewaehlt.includes(g);
        return (
          <button
            key={g}
            type="button"
            aria-pressed={an}
            onClick={() => onChange(an ? gewaehlt.filter((x) => x !== g) : [...gewaehlt, g])}
            className={cn(
              'rounded-full border px-3 py-1.5 text-left text-sm transition-colors',
              an ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted',
            )}
          >
            {an && <Check className="mr-1 inline h-3.5 w-3.5" />}
            {GRUENDE[g]}
          </button>
        );
      })}
    </div>
  );
}

const WEGGEKLICKT_KEY = 'lernzeit.nachfrage.weggeklicktAm';
const TAG = 86_400_000;

/**
 * Karte im Eltern-Dashboard. Erscheint nur, wenn etwas stockt:
 *  - Testphase vorbei, kein Abo                      -> anlass testphase_ende
 *  - Konto 2+ Tage alt und noch kein Kind angelegt   -> anlass inaktiv
 *  - Konto 5+ Tage alt, Kinder lernten 7 Tage nicht  -> anlass inaktiv
 * Nicht oefter als alle 45 Tage nach einer Antwort, 14 Tage nach "Nicht jetzt".
 */
export function AbwanderungNachfrage({ parentId, kindIds, testphaseVorbei, bereit }: {
  parentId: string;
  kindIds: string[];
  testphaseVorbei: boolean;
  /** Abo-Stand und Kinder geladen? Vorher nichts entscheiden. */
  bereit: boolean;
}) {
  const [anlass, setAnlass] = useState<Anlass | null>(null);
  const [keinKind, setKeinKind] = useState(false);
  const [gewaehlt, setGewaehlt] = useState<string[]>([]);
  const [freitext, setFreitext] = useState('');
  const [sendet, setSendet] = useState(false);
  const [fertig, setFertig] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const kinderSchluessel = kindIds.join(',');

  useEffect(() => {
    if (!bereit) return;
    let abbruch = false;
    setAnlass(null);
    setKeinKind(false);
    (async () => {
      try {
        const weg = Number(localStorage.getItem(WEGGEKLICKT_KEY) || 0);
        if (weg && Date.now() - weg < 14 * TAG) return;
      } catch { /* ohne Speicher einfach fragen */ }

      const [{ data: letzte }, { data: profil }] = await Promise.all([
        supabase.from('abwanderung_umfrage').select('created_at').eq('user_id', parentId)
          .order('created_at', { ascending: false }).limit(1),
        supabase.from('profiles').select('created_at').eq('id', parentId).maybeSingle(),
      ]);
      if (abbruch) return;
      if (letzte?.[0] && Date.now() - new Date(letzte[0].created_at).getTime() < 45 * TAG) return;
      const alterTage = profil?.created_at ? (Date.now() - new Date(profil.created_at).getTime()) / TAG : 0;

      if (testphaseVorbei) { setAnlass('testphase_ende'); return; }
      const ids = kinderSchluessel ? kinderSchluessel.split(',') : [];
      if (ids.length === 0) {
        if (alterTage >= 2) { setKeinKind(true); setAnlass('inaktiv'); }
        return;
      }
      if (alterTage < 5) return;
      const { data: runden } = await supabase.from('game_sessions').select('id').in('user_id', ids)
        .gte('created_at', new Date(Date.now() - 7 * TAG).toISOString()).limit(1);
      if (!abbruch && runden && runden.length === 0) setAnlass('inaktiv');
    })().catch(() => { /* Nachfrage ist optional */ });
    return () => { abbruch = true; };
  }, [parentId, kinderSchluessel, testphaseVorbei, bereit]);

  if (!anlass) return null;

  const spaeter = () => {
    try { localStorage.setItem(WEGGEKLICKT_KEY, String(Date.now())); } catch { /* egal */ }
    setAnlass(null);
  };

  const senden = async () => {
    setSendet(true);
    setFehler(null);
    try {
      await umfrageSpeichern(parentId, anlass, gewaehlt, freitext);
      setFertig(true);
    } catch {
      setFehler('Das hat nicht geklappt. Bitte versuch es später noch einmal.');
    } finally {
      setSendet(false);
    }
  };

  const titel = anlass === 'testphase_ende'
    ? 'Was fehlt dir, damit sich Premium lohnt?'
    : keinKind
      ? 'Noch kein Kind angelegt – woran hakt es?'
      : 'In letzter Zeit wurde kaum gelernt – was hält euch ab?';

  return (
    <Card className="border-primary/30">
      <CardContent className="space-y-3 p-4">
        {fertig ? (
          <p className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>Danke! Wir lesen jede Antwort und bauen LernZeit danach um. Mehr erzählen kannst du jederzeit an info@lernzeit.app.</span>
          </p>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <MessageCircleQuestion className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">{titel}</p>
                <p className="text-sm text-muted-foreground">Ein Tipp genügt, mehrere gehen auch. Das hilft uns mehr als jede Statistik.</p>
              </div>
            </div>
            <GruendeAuswahl anlass={anlass} gewaehlt={gewaehlt} onChange={setGewaehlt} />
            <Textarea
              id="nachfrage-freitext"
              value={freitext}
              onChange={(e) => setFreitext(e.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="Magst du mehr erzählen? (freiwillig)"
            />
            {fehler && <p className="text-sm text-destructive">{fehler}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => void senden()} disabled={sendet || (gewaehlt.length === 0 && !freitext.trim())}>
                {sendet && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Absenden
              </Button>
              <Button variant="ghost" onClick={spaeter}>Nicht jetzt</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

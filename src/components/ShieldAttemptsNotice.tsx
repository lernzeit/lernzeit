import { Lock } from 'lucide-react';
import { useShieldAttempts } from '@/hooks/useShieldAttempts';

interface ShieldAttemptsNoticeProps {
  parentId: string;
}

/**
 * Zeigt Eltern, wann ihr Kind auf dem Sperrbildschirm „Eltern fragen“
 * gedrückt hat.
 *
 * Das ist die Information, die sonst niemand hat: Apples
 * Sperrbildschirm-Erweiterung darf keine App öffnen, das Kind kann von dort
 * also nicht zu LernZeit springen und einen Antrag stellen. Viele Versuche
 * enden deshalb im Nichts — das Kind wollte an die App, hat es aufgegeben,
 * und die Eltern erfahren nie davon.
 *
 * Bewusst keine Antragsliste: Ein Druck auf den Sperrbildschirm nennt keine
 * Minuten und lässt sich nicht genehmigen. Er gehört zur Lage, nicht zur
 * Entscheidung — deshalb steht er hier als Hinweis über den Anträgen und
 * nicht zwischen ihnen.
 */
export function ShieldAttemptsNotice({ parentId }: ShieldAttemptsNoticeProps) {
  const { summaries } = useShieldAttempts(parentId, Boolean(parentId));

  if (summaries.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Lock className="h-4 w-4 text-amber-600" />
        Gesperrte Apps wurden angetippt
      </div>

      <ul className="space-y-1">
        {summaries.map((eintrag) => (
          <li key={eintrag.childId} className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{eintrag.childName}</span>
            {' hat '}
            {eintrag.count === 1 ? 'einmal' : `${eintrag.count}-mal`}
            {' um Zeit gebeten — zuletzt '}
            {formatiereZeitpunkt(eintrag.lastAttemptAt)}.
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Gezählt wird der Knopf „Eltern fragen“ auf dem Sperrbildschirm. Welche App
        es war, sehen wir nicht — das gibt Apple nicht heraus. Angezeigt werden die
        letzten sieben Tage.
      </p>
    </div>
  );
}

/**
 * „heute um 16:42“ statt eines Datums, solange es heute war. Ein Elternteil
 * rechnet sonst selbst nach, ob der Versuch von eben oder von vorgestern ist.
 */
function formatiereZeitpunkt(iso: string): string {
  const zeitpunkt = new Date(iso);
  if (Number.isNaN(zeitpunkt.getTime())) return 'unbekannt';

  const uhrzeit = zeitpunkt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const heute = new Date();
  const gestern = new Date(heute);
  gestern.setDate(heute.getDate() - 1);

  const gleicherTag = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (gleicherTag(zeitpunkt, heute)) return `heute um ${uhrzeit} Uhr`;
  if (gleicherTag(zeitpunkt, gestern)) return `gestern um ${uhrzeit} Uhr`;

  return `am ${zeitpunkt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} um ${uhrzeit} Uhr`;
}

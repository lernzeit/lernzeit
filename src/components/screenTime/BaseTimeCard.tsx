import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Smartphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ScreenTime, screenTimeSupportedPlatform } from '@/services/screenTime/plugin';
import { starteGrundzeit } from '@/services/screenTime/release';

interface BaseTimeCardProps {
  childId: string;
}

/**
 * Die tägliche Grundzeit — Handyzeit, die dem Kind ohne Lernen zusteht.
 *
 * ── Warum es sie gibt ────────────────────────────────────────────────────
 *
 * Apples Bildschirmzeit geht von einem Tagesbudget aus: Das Handy
 * funktioniert erst einmal, und die Sperre greift, wenn das Budget
 * aufgebraucht ist. Bei LernZeit war das Budget null — ohne verdiente und
 * genehmigte Zeit war das Telefon rund um die Uhr zu. Strenger als alles,
 * was Apple anbietet, und der Punkt, an dem Eltern zu Recht zögern: Ein Kind
 * ohne Karten-App auf dem Heimweg ist kein Erziehungserfolg.
 *
 * ── Warum ein Knopf und kein Automatismus ────────────────────────────────
 *
 * Die Minuten laufen ab dem Start, nicht nur während der Nutzung. Apples
 * eigener Mechanismus (Nutzungsschwelle über DeviceActivityEvent) ließe sich
 * nicht nachbauen — er verlangt ApplicationTokens, und die gibt es nur aus
 * dem Auswahldialog, den wir dem Kind gerade erspart haben.
 *
 * Deshalb entscheidet das Kind, WANN die Uhr läuft. Ein automatischer Start
 * beim Öffnen hätte an einem Tag, an dem das Telefon nur kurz in der Hand
 * liegt, das ganze Kontingent verbrannt.
 */
export function BaseTimeCard({ childId }: BaseTimeCardProps) {
  const [minuten, setMinuten] = useState<number | null>(null);
  const [heuteBenutzt, setHeuteBenutzt] = useState(false);
  const [offenBis, setOffenBis] = useState<string | null>(null);
  const [sperreLaeuft, setSperreLaeuft] = useState(false);
  const [busy, setBusy] = useState(false);

  const laden = useCallback(async () => {
    if (!childId || !screenTimeSupportedPlatform()) return;

    try {
      const status = await ScreenTime.getStatus();
      setSperreLaeuft(status.managing);
      setOffenBis(status.releasedUntil);
      // Wird gar nicht gesperrt, hat ein Freikontingent keinen Sinn — das
      // Telefon ist ohnehin offen.
      if (!status.managing) return;
    } catch {
      return;
    }

    const { data: einstellungen } = await supabase
      .from('child_settings')
      .select('screen_time_base_minutes')
      .eq('child_id', childId)
      .maybeSingle();
    setMinuten(einstellungen?.screen_time_base_minutes ?? null);

    // Der Tag beginnt um Mitternacht UTC — dieselbe Grenze wie in
    // claim_base_time(). Eine andere Rechnung hier würde dem Kind einen
    // Knopf zeigen, den die Datenbank ablehnt.
    const tagesbeginn = new Date();
    tagesbeginn.setUTCHours(0, 0, 0, 0);
    const { data: freigaben } = await supabase
      .from('screen_time_unlocks')
      .select('id')
      .eq('child_id', childId)
      .eq('source', 'auto')
      .gte('starts_at', tagesbeginn.toISOString())
      .limit(1);
    setHeuteBenutzt((freigaben ?? []).length > 0);
  }, [childId]);

  useEffect(() => { void laden(); }, [laden]);

  const starten = async () => {
    setBusy(true);
    try {
      await starteGrundzeit();
    } finally {
      setBusy(false);
      await laden();
    }
  };

  if (!sperreLaeuft || minuten === null || minuten < 1) return null;

  const laeuftGerade = Boolean(offenBis && new Date(offenBis) > new Date());
  const bis = offenBis
    ? new Date(offenBis).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <Card className="shadow-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <Smartphone className="h-4 w-4 text-primary" />
          Deine Freiminuten
        </div>

        {laeuftGerade ? (
          <p className="text-sm text-muted-foreground">
            Dein Handy ist offen bis <strong>{bis} Uhr</strong>.
          </p>
        ) : heuteBenutzt ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Deine {minuten} Freiminuten hast du heute schon genutzt. Mehr Zeit
            gibt es fürs Lernen — deine Eltern geben sie dann frei.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Du hast heute <strong>{minuten} Minuten</strong>, für die du nichts
              tun musst. Du entscheidest, wann sie laufen — sobald du startest,
              tickt die Uhr.
            </p>
            <Button className="w-full" disabled={busy} onClick={() => void starten()}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {minuten} Freiminuten starten
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

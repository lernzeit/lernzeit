import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Gift, Copy, Share2, MessageCircle, Loader2 } from 'lucide-react';

const ACCENT = '#22d3ee';

interface ReferralCardProps {
  userId: string;
}

interface ReferralRow {
  id: string;
  referee_id: string;
  status: 'invited' | 'active' | 'paying' | 'blocked';
  created_at: string;
}

export function ReferralCard({ userId }: ReferralCardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<string>('');
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [bonusMonths, setBonusMonths] = useState(0);

  const shareUrl = code ? `https://lernzeit.app/?ref=${code}` : '';
  const shareText = `Hey! Lernen mit echter Bildschirmzeit-Belohnung. Mit meinem Code bekommst du 2 Monate LernZeit Premium gratis: ${shareUrl}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Get or generate code
        const { data: existing } = await supabase
          .from('referral_codes')
          .select('code')
          .eq('user_id', userId)
          .maybeSingle();

        let resolved = existing?.code as string | undefined;
        if (!resolved) {
          const { data: gen, error } = await supabase.rpc('generate_referral_code', { p_user_id: userId });
          if (error) throw error;
          resolved = gen as string;
        }
        if (cancelled) return;
        setCode(resolved || '');

        const { data: refs } = await supabase
          .from('referrals')
          .select('id, referee_id, status, created_at')
          .eq('referrer_id', userId)
          .order('created_at', { ascending: false });
        if (!cancelled) setReferrals((refs ?? []) as ReferralRow[]);

        const { data: grants } = await supabase
          .from('premium_grants')
          .select('months, reason')
          .eq('user_id', userId);
        const total = (grants ?? [])
          .filter((g: any) => /^referral_|^milestone_/.test(g.reason))
          .reduce((s: number, g: any) => s + (g.months || 0), 0);
        if (!cancelled) setBonusMonths(total);
      } catch (e: any) {
        toast({ title: 'Fehler', description: e.message ?? 'Konnte Empfehlungen nicht laden.', variant: 'destructive' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, toast]);

  const copy = async (text: string, label = 'Kopiert!') => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: label });
    } catch {
      toast({ title: 'Kopieren fehlgeschlagen', variant: 'destructive' });
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'LernZeit', text: shareText, url: shareUrl }); } catch { /* user cancel */ }
    } else {
      copy(shareText, 'Link kopiert!');
    }
  };

  const activeOrPaying = referrals.filter(r => r.status === 'active' || r.status === 'paying').length;
  const nextMilestone = activeOrPaying < 3 ? 3 : activeOrPaying < 5 ? 5 : null;
  const progressTo = nextMilestone ? (activeOrPaying / nextMilestone) * 100 : 100;

  if (loading) {
    return (
      <Card><CardContent className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-2" style={{ borderColor: `${ACCENT}40` }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" style={{ color: ACCENT }} />
            Premium verschenken
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Schenke Freunden <strong>2 Monate Premium</strong> — und sichere dir bis zu <strong>6 Monate gratis</strong> für dich.
          </p>

          <div className="rounded-lg bg-muted/50 p-4 flex flex-col items-center gap-3">
            <span className="text-xs text-muted-foreground">Dein Code</span>
            <div className="text-3xl font-mono font-bold tracking-widest" style={{ color: ACCENT }}>{code}</div>
            <div className="flex flex-wrap gap-2 justify-center w-full">
              <Button variant="outline" size="sm" onClick={() => copy(code, 'Code kopiert!')}>
                <Copy className="h-4 w-4 mr-1" /> Code
              </Button>
              <Button variant="outline" size="sm" onClick={() => copy(shareUrl, 'Link kopiert!')}>
                <Copy className="h-4 w-4 mr-1" /> Link
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                </a>
              </Button>
              <Button size="sm" style={{ background: ACCENT, color: '#0a0a0a' }} onClick={nativeShare}>
                <Share2 className="h-4 w-4 mr-1" /> Teilen
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Bonus-Monate freigeschaltet</span>
              <span className="font-semibold">{bonusMonths} / 6</span>
            </div>
            <Progress value={(bonusMonths / 6) * 100} />
            {nextMilestone && (
              <p className="text-xs text-muted-foreground">
                {activeOrPaying} von {nextMilestone} aktiven Familien bis zum nächsten Bonus
              </p>
            )}
            {!nextMilestone && bonusMonths >= 6 && (
              <p className="text-xs" style={{ color: ACCENT }}>
                🎉 Du hast das Maximum von 6 Bonus-Monaten erreicht!
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deine Empfehlungen</CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Noch keine Einladungen. Teile deinen Code, um loszulegen.
            </p>
          ) : (
            <ul className="space-y-2">
              {referrals.map(r => (
                <li key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="text-sm">
                    <div className="font-medium">Familie #{r.referee_id.slice(0, 4).toUpperCase()}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                  {r.status === 'invited' && <Badge variant="secondary">Eingeladen</Badge>}
                  {r.status === 'active' && (
                    <Badge style={{ background: ACCENT, color: '#0a0a0a' }}>Aktiv 🎉</Badge>
                  )}
                  {r.status === 'paying' && (
                    <Badge style={{ background: '#fbbf24', color: '#0a0a0a' }}>Premium ⭐</Badge>
                  )}
                  {r.status === 'blocked' && <Badge variant="destructive">Blockiert</Badge>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
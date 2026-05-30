import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, CheckCircle2, CreditCard, Gift } from 'lucide-react';

interface Stats {
  totalReferrals: number;
  invited: number;
  active: number;
  paying: number;
  totalMonthsGranted: number;
  totalGrants: number;
}

interface TopReferrer {
  referrer_id: string;
  name: string | null;
  invited: number;
  active: number;
  paying: number;
  months_granted: number;
}

export function ReferralsPanel() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalReferrals: 0,
    invited: 0,
    active: 0,
    paying: 0,
    totalMonthsGranted: 0,
    totalGrants: 0,
  });
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data: refs } = await supabase
        .from('referrals')
        .select('referrer_id, referee_id, status');
      const { data: grants } = await supabase
        .from('premium_grants')
        .select('user_id, months, reason');

      const referralGrants = (grants ?? []).filter(
        (g) => g.reason?.startsWith('referral_') || g.reason?.startsWith('milestone_'),
      );
      const totalMonths = referralGrants.reduce((sum, g) => sum + (g.months ?? 0), 0);

      const invited = (refs ?? []).filter((r) => r.status === 'invited').length;
      const active = (refs ?? []).filter((r) => r.status === 'active').length;
      const paying = (refs ?? []).filter((r) => r.status === 'paying').length;

      setStats({
        totalReferrals: refs?.length ?? 0,
        invited,
        active,
        paying,
        totalMonthsGranted: totalMonths,
        totalGrants: referralGrants.length,
      });

      // Aggregate per referrer
      const byReferrer = new Map<string, TopReferrer>();
      for (const r of refs ?? []) {
        const entry =
          byReferrer.get(r.referrer_id) ?? {
            referrer_id: r.referrer_id,
            name: null,
            invited: 0,
            active: 0,
            paying: 0,
            months_granted: 0,
          };
        if (r.status === 'invited') entry.invited++;
        if (r.status === 'active') entry.active++;
        if (r.status === 'paying') entry.paying++;
        byReferrer.set(r.referrer_id, entry);
      }
      for (const g of referralGrants) {
        const entry = byReferrer.get(g.user_id);
        if (entry) entry.months_granted += g.months ?? 0;
      }

      const ids = Array.from(byReferrer.keys());
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', ids);
        for (const p of profiles ?? []) {
          const entry = byReferrer.get(p.id);
          if (entry) entry.name = p.name;
        }
      }

      const sorted = Array.from(byReferrer.values())
        .sort((a, b) => b.active + b.paying - (a.active + a.paying) || b.invited - a.invited)
        .slice(0, 20);
      setTopReferrers(sorted);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<Users className="h-4 w-4" />} label="Empfehlungen" value={stats.totalReferrals} />
        <StatCard label="Eingeladen" value={stats.invited} />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Aktiv" value={stats.active} />
        <StatCard icon={<CreditCard className="h-4 w-4" />} label="Zahlend" value={stats.paying} />
        <StatCard
          icon={<Gift className="h-4 w-4" />}
          label="Monate verschenkt"
          value={stats.totalMonthsGranted}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top-Werber</CardTitle>
        </CardHeader>
        <CardContent>
          {topReferrers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Empfehlungen.</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 text-xs text-muted-foreground px-2 pb-1 border-b">
                <div className="col-span-5">Name</div>
                <div className="col-span-2 text-right">Eingeladen</div>
                <div className="col-span-2 text-right">Aktiv</div>
                <div className="col-span-1 text-right">Zahlt</div>
                <div className="col-span-2 text-right">Monate</div>
              </div>
              {topReferrers.map((r) => (
                <div
                  key={r.referrer_id}
                  className="grid grid-cols-12 items-center px-2 py-2 text-sm rounded hover:bg-muted/50"
                >
                  <div className="col-span-5 truncate font-medium">
                    {r.name ?? r.referrer_id.slice(0, 8)}
                  </div>
                  <div className="col-span-2 text-right">{r.invited}</div>
                  <div className="col-span-2 text-right">
                    <Badge variant="secondary">{r.active}</Badge>
                  </div>
                  <div className="col-span-1 text-right">{r.paying}</div>
                  <div className="col-span-2 text-right font-medium" style={{ color: '#22d3ee' }}>
                    {r.months_granted}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
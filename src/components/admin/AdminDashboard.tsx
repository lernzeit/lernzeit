import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  Database, 
  Zap,
  TrendingUp,
  LogOut
} from 'lucide-react';
import { ApiStatusPanel } from './ApiStatusPanel';
import { CacheGroupItem } from './CacheGroupItem';

interface CacheStats {
  totalCached: number;
  uniqueCombinations: number;
  avgTimesServed: number;
  addedThisWeek: number;
}

interface CombinationStat {
  grade: number;
  subject: string;
  count: number;
  avg_served: number;
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    totalCached: 0,
    uniqueCombinations: 0,
    avgTimesServed: 0,
    addedThisWeek: 0
  });
  const [combinationStats, setCombinationStats] = useState<CombinationStat[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [{ data: allCache }, { data: recentCache }] = await Promise.all([
        supabase.from('ai_question_cache').select('grade, subject, times_served'),
        supabase.from('ai_question_cache').select('id').gte('created_at', weekAgo)
      ]);

      if (allCache) {
        const totalCached = allCache.length;
        const avgTimesServed = totalCached > 0
          ? allCache.reduce((sum, q) => sum + (q.times_served || 0), 0) / totalCached
          : 0;

        // Count unique grade+subject combinations
        const combos = new Map<string, { count: number; served: number }>();
        allCache.forEach(q => {
          const key = `${q.grade}-${q.subject}`;
          const existing = combos.get(key) || { count: 0, served: 0 };
          combos.set(key, { count: existing.count + 1, served: existing.served + (q.times_served || 0) });
        });

        const combinationList: CombinationStat[] = Array.from(combos.entries())
          .map(([key, val]) => {
            const [grade, ...subjectParts] = key.split('-');
            return {
              grade: parseInt(grade),
              subject: subjectParts.join('-'),
              count: val.count,
              avg_served: val.count > 0 ? Math.round(val.served / val.count * 10) / 10 : 0
            };
          })
          .sort((a, b) => b.count - a.count);

        setCacheStats({
          totalCached,
          uniqueCombinations: combos.size,
          avgTimesServed: Math.round(avgTimesServed * 10) / 10,
          addedThisWeek: recentCache?.length || 0
        });
        setCombinationStats(combinationList);
      }
    } catch (error) {
      console.error('Error loading cache stats:', error);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: 'Abmeldung fehlgeschlagen', description: error.message });
    } else {
      toast({ title: 'Abgemeldet' });
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              KI-System & Cache-Übersicht
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2 w-full sm:w-auto">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Main Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2 text-xs sm:text-sm py-2">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
              Übersicht
            </TabsTrigger>
            <TabsTrigger value="cache" className="flex items-center gap-2 text-xs sm:text-sm py-2">
              <Database className="w-3 h-3 sm:w-4 sm:h-4" />
              Fragen-Cache
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                    <Database className="w-3 h-3 sm:w-4 sm:h-4" />
                    Fragen im Cache
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{cacheStats.totalCached.toLocaleString('de-DE')}</div>
                  <p className="text-xs text-muted-foreground">+{cacheStats.addedThisWeek} diese Woche</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                    Kombinationen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{cacheStats.uniqueCombinations}</div>
                  <p className="text-xs text-muted-foreground">Klasse × Fach</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                    Ø Nutzungen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{cacheStats.avgTimesServed}×</div>
                  <p className="text-xs text-muted-foreground">pro gecachter Frage</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                    <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                    KI-System
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">Aktiv</div>
                  <p className="text-xs text-muted-foreground">Gemini 3 Flash</p>
                </CardContent>
              </Card>
            </div>

            <ApiStatusPanel />
          </TabsContent>

          {/* Cache Tab */}
          <TabsContent value="cache" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Cache-Verteilung nach Klasse & Fach
                </CardTitle>
              </CardHeader>
              <CardContent>
                {combinationStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Noch keine Fragen im Cache. Der Cache füllt sich automatisch wenn Nutzer spielen.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {combinationStats.map((stat, i) => (
                      <CacheGroupItem
                        key={i}
                        grade={stat.grade}
                        subject={stat.subject}
                        count={stat.count}
                        avgServed={stat.avg_served}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
